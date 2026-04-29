import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, ImageOff, Check, X, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatRelativeTime } from "@/utils/format";
import type { ShotFeedbackSeverity, ShotReviewStatus, SubmissionShot } from "@/types/photobrief";

const severityMeta: Record<
  ShotFeedbackSeverity,
  { label: string; tone: "success" | "warning" | "destructive"; Icon: typeof CheckCircle2 }
> = {
  pass: { label: "Looks good", tone: "success", Icon: CheckCircle2 },
  warn: { label: "Needs attention", tone: "warning", Icon: AlertTriangle },
  fail: { label: "Reject / missing", tone: "destructive", Icon: XCircle },
};

interface Props {
  shot: SubmissionShot;
  /**
   * Pending reviewer decision (held by parent) — overrides `shot.reviewStatus`
   * for visual state until the parent persists the rejection batch.
   */
  pendingDecision?: { status: ShotReviewStatus; comment?: string };
  /** Called when the user approves this shot in the pending batch. */
  onApprove?: () => void;
  /** Called when the user saves a rejection (with a required comment). */
  onReject?: (comment: string) => void;
  /** Called when the user clears their pending decision on this shot. */
  onClearDecision?: () => void;
}

export function ShotCard({ shot, pendingDecision, onApprove, onReject, onClearDecision }: Props) {
  const sev = shot.feedback?.severity ?? (shot.missing ? "fail" : "pass");
  const meta = severityMeta[sev];
  const reviewActionsAvailable = !!(onApprove || onReject);

  // The effective decision shown on the card. Parent's pending state wins,
  // otherwise we fall back to whatever's already persisted on the shot.
  const persistedDecision: ShotReviewStatus | undefined =
    shot.reviewStatus && shot.reviewStatus !== "pending" ? shot.reviewStatus : undefined;
  const decision = pendingDecision?.status ?? persistedDecision;
  const decisionComment = pendingDecision?.comment ?? shot.reviewComment ?? "";

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(decisionComment);

  useEffect(() => {
    setDraft(decisionComment);
  }, [decisionComment]);

  const isRejected = decision === "rejected";
  const isApproved = decision === "approved";

  return (
    <article
      className={cn(
        "overflow-hidden rounded-lg border bg-card shadow-elev-sm transition-colors",
        isRejected && "border-destructive/50",
        isApproved && "border-success/40",
      )}
    >
      <div className="relative aspect-video w-full bg-muted">
        {shot.missing || !shot.imageUrl ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted-foreground">
            <ImageOff className="h-6 w-6" />
            <p className="text-xs">Not captured</p>
          </div>
        ) : (
          <img
            src={shot.imageUrl}
            alt={shot.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        )}
        <div className="absolute left-2 top-2">
          <span className="rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-medium text-foreground shadow-sm">
            #{shot.orderIndex + 1}
          </span>
        </div>
        <div className="absolute right-2 top-2">
          <StatusBadge label={meta.label} tone={meta.tone} />
        </div>
      </div>

      <div className="space-y-2 p-4">
        <header className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">{shot.title}</h3>
            {shot.capturedAt ? (
              <p className="text-xs text-muted-foreground">
                Captured {formatRelativeTime(shot.capturedAt)}
              </p>
            ) : null}
          </div>
        </header>

        {shot.feedback ? (
          <div
            className={cn(
              "rounded-md border px-3 py-2 text-xs",
              sev === "pass" && "border-success/30 bg-success/5 text-foreground",
              sev === "warn" && "border-warning/30 bg-warning/10 text-foreground",
              sev === "fail" && "border-destructive/30 bg-destructive/5 text-foreground",
            )}
          >
            <div className="flex items-center gap-1.5 font-medium">
              <meta.Icon
                className={cn(
                  "h-3.5 w-3.5",
                  sev === "pass" && "text-success",
                  sev === "warn" && "text-warning-foreground",
                  sev === "fail" && "text-destructive",
                )}
              />
              <span>{shot.feedback.headline}</span>
            </div>
            {shot.feedback.detail ? (
              <p className="mt-1 leading-snug text-muted-foreground">{shot.feedback.detail}</p>
            ) : null}
            {shot.feedback.checks && shot.feedback.checks.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-1">
                {shot.feedback.checks.map((c) => (
                  <li
                    key={c.type}
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px]",
                      c.severity === "pass" && "border-success/30 text-success",
                      c.severity === "warn" && "border-warning/40 text-warning-foreground",
                      c.severity === "fail" && "border-destructive/40 text-destructive",
                    )}
                  >
                    {c.label}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {/* Reviewer actions */}
        {reviewActionsAvailable ? (
          <div className="space-y-2 pt-1">
            {isRejected && !editing ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-destructive">Will be returned for retake</p>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      aria-label="Edit comment"
                      onClick={() => setEditing(true)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    {onClearDecision ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        aria-label="Clear rejection"
                        onClick={onClearDecision}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    ) : null}
                  </div>
                </div>
                {decisionComment ? (
                  <p className="mt-1 leading-snug text-muted-foreground">{decisionComment}</p>
                ) : (
                  <p className="mt-1 italic text-muted-foreground">No comment.</p>
                )}
              </div>
            ) : null}

            {editing || (isRejected === false && isApproved === false) || (isRejected && editing) ? (
              editing ? (
                <div className="space-y-2 rounded-md border bg-background p-2">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="What should the recipient retake or fix?"
                    rows={2}
                    className="text-xs"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(false);
                        setDraft(decisionComment);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={draft.trim().length === 0}
                      onClick={() => {
                        onReject?.(draft.trim());
                        setEditing(false);
                      }}
                    >
                      Save rejection
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {onApprove ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={onApprove}
                    >
                      <Check className="h-3.5 w-3.5" /> Approve
                    </Button>
                  ) : null}
                  {onReject ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        setDraft(decisionComment);
                        setEditing(true);
                      }}
                    >
                      <X className="h-3.5 w-3.5" /> Reject…
                    </Button>
                  ) : null}
                </div>
              )
            ) : null}

            {isApproved && !editing ? (
              <div className="flex items-center justify-between rounded-md border border-success/40 bg-success/5 px-3 py-2 text-xs">
                <p className="font-medium text-success inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approved for this round
                </p>
                {onClearDecision ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    aria-label="Clear approval"
                    onClick={onClearDecision}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
