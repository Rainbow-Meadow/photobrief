import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Copy,
  HelpCircle,
  Bell,
  FileDown,
  UserPlus2,
  CheckCircle2,
  Archive,
  Mail,
  Phone,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";

import { notificationService } from "@/services/notificationService";

import { PageHeader } from "@/components/layout/PageHeader";
import { ReadinessProgress } from "@/components/shared/ReadinessProgress";
import { ReadinessScoreBadge } from "@/components/shared/ReadinessScoreBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useSubmission, useSubmissions } from "@/hooks/useSubmissions";
import { submissionStatusOptions } from "@/config/statusOptions";
import { mockTeamMembers } from "@/config/mockData";
import { formatRelativeTime } from "@/utils/format";
import { usePlan } from "@/hooks/usePlan";
import { getPlanLimit, minPlanFor } from "@/config/planLimits";
import type {
  ActivityEvent,
  InternalNote,
  Submission,
  SubmissionStatus,
} from "@/types/photobrief";

import { ShotCard } from "@/features/submissions/components/ShotCard";
import { ActivityTimeline } from "@/features/submissions/components/ActivityTimeline";
import { AskForMorePhotosDialog } from "@/features/submissions/components/AskForMorePhotosDialog";
import { InternalNotesPanel } from "@/features/submissions/components/InternalNotesPanel";

function buildSummaryText(s: Submission): string {
  const lines: string[] = [];
  lines.push(`${s.requestType ?? s.guideName} — ${s.recipientName}`);
  lines.push(`Readiness: ${s.readinessScore}/100`);
  lines.push("");
  lines.push("Summary:");
  lines.push(s.aiSummary);
  if (s.extractedDetails && s.extractedDetails.length > 0) {
    lines.push("");
    lines.push("Details:");
    for (const d of s.extractedDetails) lines.push(`• ${d.label}: ${d.value}`);
  }
  if (s.missingItems && s.missingItems.length > 0) {
    lines.push("");
    lines.push("Missing:");
    for (const m of s.missingItems) lines.push(`• ${m}`);
  }
  lines.push("");
  lines.push(`Suggested next action: ${s.suggestedNextAction}`);
  return lines.join("\n");
}

export default function SubmissionReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fallback = useSubmissions()[0];
  const initial = useSubmission(id) ?? fallback;
  const { can } = usePlan();
  const canPdf = can("pdf_export");
  const canReminders = can("reminders");
  const canAssign = can("team_members");

  // Phase 5 keeps mock data but lets the user mutate it locally so the screen
  // feels alive (notes, status, assignee). A future phase swaps this for queries.
  const [submission, setSubmission] = useState<Submission>(initial);
  const [askOpen, setAskOpen] = useState(false);

  const status = submissionStatusOptions[submission.status];

  const orderedShots = useMemo(
    () => [...(submission.shots ?? [])].sort((a, b) => a.orderIndex - b.orderIndex),
    [submission.shots],
  );

  function pushActivity(event: Omit<ActivityEvent, "id" | "at"> & { at?: string }) {
    setSubmission((prev) => ({
      ...prev,
      activity: [
        ...(prev.activity ?? []),
        {
          id: `ev_${Date.now()}`,
          at: event.at ?? new Date().toISOString(),
          type: event.type,
          label: event.label,
          detail: event.detail,
          actor: event.actor,
        },
      ],
    }));
  }

  function handleCopySummary() {
    const text = buildSummaryText(submission);
    navigator.clipboard?.writeText(text).then(
      () => toast.success("Summary copied to clipboard"),
      () => toast.error("Couldn't copy — clipboard blocked"),
    );
  }

  function handleSendReminder() {
    if (!canReminders) {
      const plan = minPlanFor("reminders");
      toast.error(`Reminders are on ${plan ? getPlanLimit(plan).name : "a higher plan"}`);
      return;
    }
    notificationService.notify({
      event: "reminder_sent",
      audience: "recipient",
      title: `Reminder sent to ${submission.recipientName}`,
      body: `Nudge for ${submission.guideName}.`,
      submissionId: submission.id,
      recipientEmail: submission.recipientContact,
      href: `/submissions/${submission.id}`,
    });
    pushActivity({
      type: "reminder_sent",
      label: `Reminder sent to ${submission.recipientName}`,
      actor: "You",
    });
  }

  function handleAskForMore({
    shotIds,
    missingItems,
    message,
  }: {
    shotIds: string[];
    missingItems: string[];
    message: string;
  }) {
    const count = shotIds.length + missingItems.length;
    notificationService.notify({
      event: "needs_customer_action",
      audience: "recipient",
      title: `Asked ${submission.recipientName.split(" ")[0]} for ${count} more item${count === 1 ? "" : "s"}`,
      body: message.slice(0, 140),
      submissionId: submission.id,
      recipientEmail: submission.recipientContact,
      href: `/submissions/${submission.id}`,
    });
    pushActivity({
      type: "more_photos_requested",
      label: `Requested ${count} more item${count === 1 ? "" : "s"}`,
      detail: message.slice(0, 140),
      actor: "You",
    });
    setSubmission((prev) => ({ ...prev, status: "needs_more" }));
  }

  async function handleExportPdf() {
    if (!canPdf) {
      const plan = minPlanFor("pdf_export");
      toast.error(`PDF export is on ${plan ? getPlanLimit(plan).name : "a higher plan"}`);
      return;
    }
    const t = toast.loading("Generating PDF…");
    try {
      const { pdfService } = await import("@/services/pdfService");
      const result = await pdfService.exportSubmission(submission.id);
      toast.dismiss(t);
      toast.success("PDF ready", {
        action: { label: "Open", onClick: () => window.open(result.url, "_blank") },
      });
      window.open(result.url, "_blank");
    } catch (e) {
      toast.dismiss(t);
      const err = e as Error & { requiredPlan?: string };
      if (err.requiredPlan) {
        toast.error(`PDF export requires the ${err.requiredPlan} plan`);
      } else {
        toast.error(err.message ?? "Could not generate PDF");
      }
    }
  }

  function handleAssign(memberId: string) {
    const member = mockTeamMembers.find((m) => m.id === memberId);
    if (!member) return;
    setSubmission((prev) => ({ ...prev, assigneeId: member.id, assigneeName: member.name }));
    toast.success(`Assigned to ${member.name}`);
    pushActivity({
      type: "reviewer_note",
      label: `Assigned to ${member.name}`,
      actor: "You",
    });
  }

  function handleMarkReviewed() {
    setSubmission((prev) => ({ ...prev, status: "reviewed" }));
    notificationService.notify({
      event: "reviewed",
      audience: "business",
      title: `Marked "${submission.guideName}" reviewed`,
      body: `${submission.recipientName}'s submission is closed out.`,
      submissionId: submission.id,
      href: `/submissions/${submission.id}`,
    });
    pushActivity({
      type: "marked_reviewed",
      label: "Marked reviewed",
      actor: "You",
    });
  }

  function handleArchive() {
    setSubmission((prev) => ({ ...prev, status: "archived" }));
    toast.success("Submission archived");
    pushActivity({
      type: "archived",
      label: "Submission archived",
      actor: "You",
    });
  }

  function handleAddNote(body: string) {
    const note: InternalNote = {
      id: `note_${Date.now()}`,
      authorName: "You",
      authorInitials: "YO",
      body,
      createdAt: new Date().toISOString(),
    };
    setSubmission((prev) => ({
      ...prev,
      internalNotes: [...(prev.internalNotes ?? []), note],
    }));
    pushActivity({
      type: "reviewer_note",
      label: "You added an internal note",
      actor: "You",
    });
  }

  function handleStatusChange(next: SubmissionStatus) {
    setSubmission((prev) => ({ ...prev, status: next }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Button variant="ghost" size="sm" className="gap-1 px-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
      </div>

      <PageHeader
        title={`Brief from ${submission.recipientName}`}
        description={submission.requestType ?? submission.guideName}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopySummary}>
              <Copy className="h-3.5 w-3.5" /> Copy summary
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAskOpen(true)}>
              <HelpCircle className="h-3.5 w-3.5" /> Ask for more photos
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleSendReminder}
              title={canReminders ? undefined : "Available on a higher plan"}
            >
              <Bell className="h-3.5 w-3.5" /> Send reminder
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleExportPdf}
              title={canPdf ? undefined : "Available on Pro"}
            >
              <FileDown className="h-3.5 w-3.5" /> Export PDF
              {!canPdf ? <span className="ml-1 text-[10px] uppercase tracking-wide text-primary">Pro</span> : null}
            </Button>
            {canAssign ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <UserPlus2 className="h-3.5 w-3.5" /> Assign
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {mockTeamMembers.map((m) => (
                    <DropdownMenuItem key={m.id} onClick={() => handleAssign(m.id)}>
                      {m.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => toast.error("Assigning teammates requires the Business plan")}
                title="Available on Business"
              >
                <UserPlus2 className="h-3.5 w-3.5" /> Assign
                <span className="ml-1 text-[10px] uppercase tracking-wide text-primary">Business</span>
              </Button>
            )}
            <Button size="sm" className="gap-1.5" onClick={handleMarkReviewed}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Mark reviewed
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={handleArchive}>
              <Archive className="h-3.5 w-3.5" /> Archive
            </Button>
          </div>
        }
      />

      {/* Customer + status banner */}
      <section className="grid gap-4 rounded-lg border bg-card p-5 shadow-elev-sm md:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-base font-semibold text-foreground">{submission.recipientName}</p>
            {submission.recipientContact ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                {submission.recipientContact.includes("@") ? (
                  <Mail className="h-3 w-3" />
                ) : (
                  <Phone className="h-3 w-3" />
                )}
                {submission.recipientContact}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarClock className="h-3 w-3" /> Submitted {formatRelativeTime(submission.submittedAt)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {submission.requestType ?? submission.guideName}
            {submission.assigneeName ? ` · Assigned to ${submission.assigneeName}` : " · Unassigned"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ReadinessScoreBadge score={submission.readinessScore} />
          <Select value={submission.status} onValueChange={(v) => handleStatusChange(v as SubmissionStatus)}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue>
                <StatusBadge label={status.label} tone={status.tone} />
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(submissionStatusOptions).map(([key, opt]) => (
                <SelectItem key={key} value={key}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* AI summary + readiness */}
          <section className="rounded-lg border bg-card p-5 shadow-elev-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">AI summary</h2>
              <span className="text-xs text-muted-foreground">Auto-generated</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">{submission.aiSummary}</p>
            <div className="mt-4">
              <ReadinessProgress value={submission.readinessScore} />
              <div className="mt-3 rounded-md border border-accent/40 bg-accent/30 p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Suggested next action
                </p>
                <p className="mt-1 text-foreground">{submission.suggestedNextAction}</p>
              </div>
            </div>
          </section>

          {/* Shots */}
          <section className="rounded-lg border bg-card p-5 shadow-elev-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Shots ({orderedShots.filter((s) => !s.missing).length}/{orderedShots.length})
              </h2>
              <p className="text-xs text-muted-foreground">In requested order</p>
            </div>
            {orderedShots.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No shots captured yet.</p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {orderedShots.map((shot) => (
                  <ShotCard key={shot.id} shot={shot} />
                ))}
              </div>
            )}
          </section>

          {/* Customer answers + notes (tabbed) */}
          <section className="rounded-lg border bg-card p-5 shadow-elev-sm">
            <Tabs defaultValue="answers">
              <TabsList>
                <TabsTrigger value="answers">
                  Customer answers ({submission.customerAnswers?.length ?? 0})
                </TabsTrigger>
                <TabsTrigger value="notes">
                  Internal notes ({submission.internalNotes?.length ?? 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="answers" className="mt-4">
                {submission.customerAnswers && submission.customerAnswers.length > 0 ? (
                  <ul className="divide-y rounded-md border">
                    {submission.customerAnswers.map((a, idx) => (
                      <li key={a.questionId ?? idx} className="px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {a.prompt}
                        </p>
                        <p className="mt-1 text-sm text-foreground">{a.answer}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No questions answered.</p>
                )}
              </TabsContent>

              <TabsContent value="notes" className="mt-4">
                <InternalNotesPanel
                  notes={submission.internalNotes ?? []}
                  onAdd={handleAddNote}
                />
              </TabsContent>
            </Tabs>
          </section>
        </div>

        {/* Right rail */}
        <aside className="space-y-6">
          <section className="rounded-lg border bg-card p-5 shadow-elev-sm">
            <h2 className="text-sm font-semibold text-foreground">Extracted details</h2>
            {submission.extractedDetails && submission.extractedDetails.length > 0 ? (
              <dl className="mt-3 divide-y text-sm">
                {submission.extractedDetails.map((d) => (
                  <div key={d.label} className="flex items-start justify-between gap-3 py-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {d.label}
                    </dt>
                    <dd className="text-right text-sm text-foreground">
                      {d.value}
                      {typeof d.confidence === "number" ? (
                        <span className="ml-1.5 text-[11px] text-muted-foreground">
                          {Math.round(d.confidence * 100)}%
                        </span>
                      ) : null}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Nothing extracted yet — labels, serials, and receipts will appear here.
              </p>
            )}
          </section>

          <section className="rounded-lg border bg-card p-5 shadow-elev-sm">
            <h2 className="text-sm font-semibold text-foreground">Missing items</h2>
            {submission.missingItems && submission.missingItems.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {submission.missingItems.map((m) => (
                  <li
                    key={m}
                    className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-foreground"
                  >
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                    <span>{m}</span>
                  </li>
                ))}
                <li>
                  <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => setAskOpen(true)}>
                    Ask for these
                  </Button>
                </li>
              </ul>
            ) : (
              <p className="mt-2 text-xs text-success">Nothing missing — brief is complete.</p>
            )}
          </section>

          <section className="rounded-lg border bg-card p-5 shadow-elev-sm">
            <h2 className="text-sm font-semibold text-foreground">Activity</h2>
            <div className="mt-4">
              <ActivityTimeline events={submission.activity ?? []} />
            </div>
          </section>
        </aside>
      </div>

      <AskForMorePhotosDialog
        open={askOpen}
        onOpenChange={setAskOpen}
        shots={submission.shots ?? []}
        missingItems={submission.missingItems ?? []}
        recipientName={submission.recipientName}
        onSend={handleAskForMore}
      />
    </div>
  );
}
