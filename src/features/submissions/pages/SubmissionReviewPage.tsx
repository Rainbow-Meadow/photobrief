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
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { notificationService } from "@/services/notificationService";
import { submissionsService } from "@/services/submissionsService";
import { messagingService } from "@/services/messagingService";
import { trackEvent } from "@/lib/analytics";
import { classifyAction } from "@/features/submissions/lib/quickAction";

import { PageHeader } from "@/components/layout/PageHeader";
import { ReadinessProgress } from "@/components/shared/ReadinessProgress";
import { BriefHeader } from "@/features/submissions/components/BriefHeader";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useSubmission } from "@/hooks/useSubmissions";

import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useCurrentWorkspace } from "@/hooks/useCurrentWorkspace";
import { formatRelativeTime } from "@/utils/format";
import { usePlan } from "@/hooks/usePlan";
import { lockedFeatureCopy } from "@/config/planLimits";
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
  const [focusedShotId, setFocusedShotId] = useState<string | null>(null);

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

  function focusShot(shotId: string) {
    setFocusedShotId(shotId);
    const el = document.querySelector<HTMLElement>(`[data-shot-id="${shotId}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-primary");
    window.setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 1600);
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
      toast.error(lockedFeatureCopy("reminders").toast);
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
      toast.error(lockedFeatureCopy("pdf_export").toast);
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

  // ────────────────────────────────────────────────────────────────────────
  // Keyboard shortcuts
  //
  //   j / ↓ → focus next shot         k / ↑ → focus previous shot
  //   Enter → apply suggested action  r → reshoot   n → note required   a → mark ready
  //   x → clear pending decision      ? → show shortcut help
  //
  // We attach to window so the bindings work even when nothing inside the
  // card has focus. Skips when the user is typing in an input/textarea or
  // when a modifier key is held.
  // ────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const shotIds = orderedShots.map((s) => s.id);
    if (shotIds.length === 0) return;

    function isTypingTarget(t: EventTarget | null): boolean {
      if (!(t instanceof HTMLElement)) return false;
      if (t.isContentEditable) return true;
      const tag = t.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    }

    function applyAction(shotId: string, kind: "reshoot" | "note" | "ready") {
      const shot = orderedShots.find((s) => s.id === shotId);
      if (!shot || shot.missing) return;
      const suggestion = shot.feedback?.suggestedNextAction?.trim();

      if (kind === "ready") {
        setShotDecision(shotId, { status: "approved" });
        toast.success(`Marked “${shot.title}” ready`);
      } else if (kind === "reshoot") {
        const comment =
          suggestion || `Please retake "${shot.title}" — current photo isn't usable.`;
        setShotDecision(shotId, { status: "rejected", comment });
        toast(`Queued “${shot.title}” for reshoot`);
      } else if (kind === "note") {
        const noteBody =
          suggestion || `Follow up on "${shot.title}" before acting on this submission.`;
        void handleAddNote(`[${shot.title}] ${noteBody}`);
        setShotDecision(shotId, { status: "approved" });
        toast.success(`Noted on “${shot.title}”`);
      }
    }

    function handler(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      const currentIdx = focusedShotId
        ? Math.max(0, shotIds.indexOf(focusedShotId))
        : -1;

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = currentIdx < 0 ? 0 : Math.min(shotIds.length - 1, currentIdx + 1);
        focusShot(shotIds[next]);
        return;
      }
      if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        const next = currentIdx < 0 ? 0 : Math.max(0, currentIdx - 1);
        focusShot(shotIds[next]);
        return;
      }
      if (e.key === "?") {
        e.preventDefault();
        toast("Keyboard shortcuts", {
          description:
            "j/k or ↓/↑ move between shots · Enter applies suggested action · r reshoot · n note · a mark ready · x clear",
          duration: 6000,
        });
        return;
      }

      if (currentIdx < 0) {
        if (["Enter", "r", "n", "a", "x"].includes(e.key)) {
          toast("Press j or ↓ to focus a shot first", { duration: 2000 });
        }
        return;
      }
      const shotId = shotIds[currentIdx];

      if (e.key === "Enter") {
        e.preventDefault();
        const shot = orderedShots[currentIdx];
        const primary = classifyAction(shot.feedback?.suggestedNextAction);
        applyAction(shotId, primary);
        return;
      }
      if (e.key === "r") {
        e.preventDefault();
        applyAction(shotId, "reshoot");
        return;
      }
      if (e.key === "n") {
        e.preventDefault();
        applyAction(shotId, "note");
        return;
      }
      if (e.key === "a") {
        e.preventDefault();
        applyAction(shotId, "ready");
        return;
      }
      if (e.key === "x") {
        e.preventDefault();
        setShotDecision(shotId, null);
        toast(`Cleared decision on “${orderedShots[currentIdx].title}”`);
        return;
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedShots, focusedShotId]);

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
                  toast.error(lockedFeatureCopy("missing_shot_followup").toast);
                  return;
                }
                setAskOpen(true);
              }}
              title={canAskForMore ? undefined : lockedFeatureCopy("missing_shot_followup").tooltip}
            >
              <HelpCircle className="h-3.5 w-3.5" /> Ask for more photos
              {!canAskForMore ? (
                <span className="ml-1 text-[10px] uppercase tracking-wide text-primary">
                  {lockedFeatureCopy("missing_shot_followup").badge}
                </span>
              ) : null}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleSendReminder}
              title={canReminders ? undefined : lockedFeatureCopy("reminders").tooltip}
            >
              <Bell className="h-3.5 w-3.5" /> Send reminder
              {!canReminders ? (
                <span className="ml-1 text-[10px] uppercase tracking-wide text-primary">
                  {lockedFeatureCopy("reminders").badge}
                </span>
              ) : null}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleExportPdf}
              title={canPdf ? undefined : lockedFeatureCopy("pdf_export").tooltip}
            >
              <FileDown className="h-3.5 w-3.5" /> Export PDF
              {!canPdf ? (
                <span className="ml-1 text-[10px] uppercase tracking-wide text-primary">
                  {lockedFeatureCopy("pdf_export").badge}
                </span>
              ) : null}
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
                onClick={() => toast.error(lockedFeatureCopy("assignments").toast)}
                title={lockedFeatureCopy("assignments").tooltip}
              >
                <UserPlus2 className="h-3.5 w-3.5" /> Assign
                <span className="ml-1 text-[10px] uppercase tracking-wide text-primary">
                  {lockedFeatureCopy("assignments").badge}
                </span>
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

      {/* Money screen — readiness, AI summary, suggested next action */}
      <BriefHeader
        submission={submission}
        onStatusChange={handleStatusChange}
        onCopySummary={handleCopySummary}
        onExportPdf={handleExportPdf}
        canPdf={canPdf}
        onPrimaryAction={handleMarkReviewed}
        primaryActionLabel="Mark reviewed"
      />

      <ReviewProgressSummary
        shots={orderedShots}
        pending={pending}
        missingItemsCount={submission.missingItems?.length ?? 0}
        onFocusShot={focusShot}
      />

      <EscalationQueue
        shots={orderedShots}
        onFocusShot={focusShot}
        onRerunShot={() => navigate("/admin/ai-rerun")}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Readiness progress bar (summary, score, and next action live in BriefHeader above) */}
          <section className="surface-card p-5">
            <ReadinessProgress value={submission.readinessScore} />
          </section>

          {/* Shots */}
          <section className="surface-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Shots ({orderedShots.filter((s) => !s.missing).length}/{orderedShots.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                In requested order ·{" "}
                <button
                  type="button"
                  onClick={() =>
                    toast("Keyboard shortcuts", {
                      description:
                        "j/k or ↓/↑ move between shots · Enter applies suggested action · r reshoot · n note · a mark ready · x clear",
                      duration: 6000,
                    })
                  }
                  className="underline-offset-2 hover:underline"
                  title="Show keyboard shortcuts"
                >
                  <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px] font-mono text-foreground">?</kbd>{" "}
                  shortcuts
                </button>
              </p>
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
