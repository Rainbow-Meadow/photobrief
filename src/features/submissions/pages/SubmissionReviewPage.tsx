import { useEffect, useMemo, useState } from "react";
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
import { useQueryClient } from "@tanstack/react-query";

import { notificationService } from "@/services/notificationService";
import { submissionsService } from "@/services/submissionsService";
import { messagingService } from "@/services/messagingService";
import { trackEvent } from "@/lib/analytics";

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

import { useSubmission } from "@/hooks/useSubmissions";
import { submissionStatusOptions } from "@/config/statusOptions";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useCurrentWorkspace } from "@/hooks/useCurrentWorkspace";
import { formatRelativeTime } from "@/utils/format";
import { usePlan } from "@/hooks/usePlan";
import { getPlanLimit, minPlanFor } from "@/config/planLimits";
import type {
  ActivityEvent,
  InternalNote,
  ShotReviewStatus,
  Submission,
  SubmissionShot,
  SubmissionStatus,
} from "@/types/photobrief";

import { ShotCard } from "@/features/submissions/components/ShotCard";
import { ReviewProgressSummary } from "@/features/submissions/components/ReviewProgressSummary";
import { EscalationQueue } from "@/features/submissions/components/EscalationQueue";
import { ActivityTimeline } from "@/features/submissions/components/ActivityTimeline";
import { AskForMorePhotosDialog } from "@/features/submissions/components/AskForMorePhotosDialog";
import { InternalNotesPanel } from "@/features/submissions/components/InternalNotesPanel";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const queryClient = useQueryClient();
  const live = useSubmission(id);
  const { workspace } = useCurrentWorkspace();
  const { can } = usePlan();
  const teamMembers = useTeamMembers();
  const canPdf = can("pdf_export");
  const canReminders = can("reminders");
  const canAssign = can("assignments");
  const canAskForMore = can("missing_shot_followup");

  // Local optimistic overlay so the UI reacts immediately while writes
  // round-trip. We invalidate the live query after each mutation.
  const [overlay, setOverlay] = useState<Partial<Submission>>({});
  const [extraActivity, setExtraActivity] = useState<ActivityEvent[]>([]);
  const [extraNotes, setExtraNotes] = useState<InternalNote[]>([]);
  const [askOpen, setAskOpen] = useState(false);

  // Pending per-shot decisions (mediaId -> approve/reject + comment).
  // Only persisted when the reviewer hits "Send back for resubmission".
  const [pending, setPending] = useState<
    Record<string, { status: ShotReviewStatus; comment?: string }>
  >({});
  const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);
  const [rejectMessage, setRejectMessage] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Reset overlays when the submission id changes.
  useEffect(() => {
    setOverlay({});
    setExtraActivity([]);
    setExtraNotes([]);
    setPending({});
  }, [id]);

  if (!id) {
    return (
      <div className="surface-card p-8 text-center text-sm text-muted-foreground">
        No submission selected.
      </div>
    );
  }

  if (!live) {
    return (
      <div className="surface-card p-8 text-center text-sm text-muted-foreground">
        Loading submission…
      </div>
    );
  }

  const submission: Submission = {
    ...live,
    ...overlay,
    internalNotes: [...(live.internalNotes ?? []), ...extraNotes],
    activity: [...(live.activity ?? []), ...extraActivity],
  };

  const status = submissionStatusOptions[submission.status];

  const orderedShots = [...(submission.shots ?? [])].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );

  const rejectedEntries = Object.entries(pending).filter(([, d]) => d.status === "rejected");
  const rejectedCount = rejectedEntries.length;

  function setShotDecision(mediaId: string, decision: { status: ShotReviewStatus; comment?: string } | null) {
    setPending((prev) => {
      const next = { ...prev };
      if (decision === null) delete next[mediaId];
      else next[mediaId] = decision;
      return next;
    });
  }

  function buildRejectMessage(shots: SubmissionShot[]): string {
    const firstName = submission.recipientName.split(" ")[0] || "there";
    const lines = [
      `Hi ${firstName}, thanks for sending these in! We need a few photos retaken before we can move forward:`,
      "",
    ];
    for (const [mediaId, d] of rejectedEntries) {
      const shot = shots.find((s) => s.id === mediaId);
      lines.push(`• ${shot?.title ?? "Photo"}${d.comment ? ` — ${d.comment}` : ""}`);
    }
    lines.push("", "Tap your original link to retake just these.");
    return lines.join("\n");
  }

  async function handleSendRejections() {
    if (!workspace?.id || rejectedCount === 0) return;
    setRejecting(true);
    try {
      await submissionsService.rejectShots({
        submissionId: submission.id,
        workspaceId: workspace.id,
        items: rejectedEntries.map(([mediaId, d]) => ({ mediaId, comment: d.comment ?? "" })),
        summaryMessage: rejectMessage,
      });
      try {
        await messagingService.send({
          requestId: submission.requestId,
          kind: "followup",
          body: rejectMessage,
        });
      } catch (e) {
        console.warn("followup send failed", e);
      }
      pushActivity({
        type: "more_photos_requested",
        label: `Sent ${rejectedCount} photo${rejectedCount === 1 ? "" : "s"} back for retake`,
        detail: rejectMessage.slice(0, 140),
        actor: "You",
      });
      setOverlay((prev) => ({ ...prev, status: "needs_more" }));
      setPending({});
      setConfirmRejectOpen(false);
      toast.success("Sent back for resubmission");
      invalidate();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not send rejections");
    } finally {
      setRejecting(false);
    }
  }

  function pushActivity(event: Omit<ActivityEvent, "id" | "at"> & { at?: string }) {
    setExtraActivity((prev) => [
      ...prev,
      {
        id: `ev_${Date.now()}`,
        at: event.at ?? new Date().toISOString(),
        type: event.type,
        label: event.label,
        detail: event.detail,
        actor: event.actor,
      },
    ]);
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["submission", id] });
    if (workspace?.id) {
      queryClient.invalidateQueries({ queryKey: ["submissions", workspace.id] });
    }
  }

  function handleCopySummary() {
    const text = buildSummaryText(submission);
    navigator.clipboard?.writeText(text).then(
      () => toast.success("Summary copied to clipboard"),
      () => toast.error("Couldn't copy — clipboard blocked"),
    );
  }

  async function handleSendReminder() {
    if (!canReminders) {
      const plan = minPlanFor("reminders");
      toast.error(`Reminders are on ${plan ? getPlanLimit(plan).name : "a higher plan"}`);
      return;
    }
    const t = toast.loading(`Sending reminder to ${submission.recipientName}…`);
    try {
      await messagingService.send({
        requestId: submission.requestId,
        kind: "reminder",
      });
      toast.dismiss(t);
      toast.success(`Reminder sent to ${submission.recipientName}`);
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
    } catch (err: any) {
      toast.dismiss(t);
      toast.error(err?.message ?? "Could not send reminder");
    }
  }

  async function handleAskForMore({
    shotIds,
    missingItems,
    message,
  }: {
    shotIds: string[];
    missingItems: string[];
    message: string;
  }) {
    const count = shotIds.length + missingItems.length;
    try {
      await messagingService.send({
        requestId: submission.requestId,
        kind: "followup",
        body: message,
        missingItems,
      });
    } catch (err) {
      console.warn("followup send failed", err);
    }
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
    try {
      await submissionsService.updateStatus(submission.id, "needs_more");
      setOverlay((prev) => ({ ...prev, status: "needs_more" }));
      invalidate();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not update status");
    }
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

  async function handleAssign(memberId: string) {
    const member = teamMembers.find((m) => m.id === memberId);
    if (!member) return;
    setOverlay((prev) => ({ ...prev, assigneeId: member.id, assigneeName: member.name }));
    try {
      await submissionsService.assignViaRequest(submission.requestId, member.id);
      toast.success(`Assigned to ${member.name}`);
      pushActivity({
        type: "reviewer_note",
        label: `Assigned to ${member.name}`,
        actor: "You",
      });
      invalidate();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not assign");
      setOverlay((prev) => ({ ...prev, assigneeId: undefined, assigneeName: undefined }));
    }
  }

  async function handleMarkReviewed() {
    setOverlay((prev) => ({ ...prev, status: "reviewed" }));
    try {
      await submissionsService.updateStatus(submission.id, "reviewed");
      trackEvent("submission_reviewed", { submission_id: submission.id });
      notificationService.notify({
        event: "reviewed",
        audience: "business",
        title: `Marked "${submission.guideName}" reviewed`,
        body: `${submission.recipientName}'s submission is closed out.`,
        submissionId: submission.id,
        href: `/submissions/${submission.id}`,
      });
      pushActivity({ type: "marked_reviewed", label: "Marked reviewed", actor: "You" });
      invalidate();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not update status");
    }
  }

  async function handleArchive() {
    setOverlay((prev) => ({ ...prev, status: "archived" }));
    try {
      await submissionsService.updateStatus(submission.id, "archived");
      toast.success("Submission archived");
      pushActivity({ type: "archived", label: "Submission archived", actor: "You" });
      invalidate();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not archive");
    }
  }

  async function handleAddNote(body: string) {
    if (!workspace?.id) {
      toast.error("Workspace not loaded yet");
      return;
    }
    try {
      const note = await submissionsService.addInternalNote({
        submissionId: submission.id,
        workspaceId: workspace.id,
        body,
      });
      setExtraNotes((prev) => [...prev, note]);
      pushActivity({
        type: "reviewer_note",
        label: "You added an internal note",
        actor: "You",
      });
      invalidate();
    } catch (err: any) {
      const message = err?.message?.includes("PLAN_FEATURE_LOCKED")
        ? "Internal notes are on the Pro plan."
        : err?.message ?? "Could not add note";
      toast.error(message);
    }
  }

  async function handleStatusChange(next: SubmissionStatus) {
    const prev = submission.status;
    setOverlay((p) => ({ ...p, status: next }));
    try {
      await submissionsService.updateStatus(submission.id, next);
      invalidate();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not update status");
      setOverlay((p) => ({ ...p, status: prev }));
    }
  }

  return (
    <div className="space-y-6 pb-16 lg:pb-0">
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
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                if (!canAskForMore) {
                  const plan = minPlanFor("missing_shot_followup");
                  toast.error(
                    `Missing-shot follow-up is on ${plan ? getPlanLimit(plan).name : "a higher plan"}`,
                  );
                  return;
                }
                setAskOpen(true);
              }}
              title={canAskForMore ? undefined : "Available on Pro and above"}
            >
              <HelpCircle className="h-3.5 w-3.5" /> Ask for more photos
              {!canAskForMore ? (
                <span className="ml-1 text-[10px] uppercase tracking-wide text-primary">Pro</span>
              ) : null}
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
                  {teamMembers.map((m) => (
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
                onClick={() => {
                  const plan = minPlanFor("assignments");
                  toast.error(
                    `Assignments are on ${plan ? getPlanLimit(plan).name : "a higher plan"}`,
                  );
                }}
                title="Available on Pro and above"
              >
                <UserPlus2 className="h-3.5 w-3.5" /> Assign
                <span className="ml-1 text-[10px] uppercase tracking-wide text-primary">Pro</span>
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
      <section className="surface-card-elevated grid gap-4 p-5 md:grid-cols-[1fr_auto]">
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

      <ReviewProgressSummary
        shots={orderedShots}
        pending={pending}
        missingItemsCount={submission.missingItems?.length ?? 0}
        onFocusShot={(shotId) => {
          const el = document.querySelector<HTMLElement>(`[data-shot-id="${shotId}"]`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("ring-2", "ring-primary");
            window.setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 1600);
          }
        }}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* AI summary + readiness */}
          <section className="surface-card p-5">
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
          <section className="surface-card p-5">
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
                  <div key={shot.id} data-shot-id={shot.id} className="rounded-md transition">
                    <ShotCard
                      shot={shot}
                      pendingDecision={pending[shot.id]}
                      onApprove={() => setShotDecision(shot.id, { status: "approved" })}
                      onReject={(comment) => setShotDecision(shot.id, { status: "rejected", comment })}
                      onClearDecision={() => setShotDecision(shot.id, null)}
                      onEditFeedback={async (patch) => {
                        try {
                          await submissionsService.updateShotFeedbackText({
                            mediaId: shot.id,
                            ...patch,
                          });
                          invalidate();
                          toast.success("AI wording updated");
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Couldn't save edit");
                          throw e;
                        }
                      }}
                      onAddNote={(body) => handleAddNote(body)}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Customer answers + notes (tabbed) */}
          <section className="surface-card p-5">
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
        <aside className="order-last space-y-6 lg:order-none">
          <section className="surface-card p-5">
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

          <section className="surface-card p-5">
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

          <section className="surface-card p-5">
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

      {/* Mobile sticky review bar — sits above the bottom tab bar (which is 4rem tall + safe area). */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t bg-background/95 backdrop-blur pb-safe lg:hidden">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-2">
          <Button
            variant="outline"
            className="flex-1 gap-1.5"
            onClick={() => setAskOpen(true)}
          >
            <HelpCircle className="h-4 w-4" /> Ask for more
          </Button>
          <Button className="flex-1 gap-1.5" onClick={handleMarkReviewed}>
            <CheckCircle2 className="h-4 w-4" /> Mark reviewed
          </Button>
        </div>
      </div>
    </div>
  );
}
