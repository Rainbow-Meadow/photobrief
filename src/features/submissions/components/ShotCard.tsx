import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, ImageOff, Check, X, Pencil, HelpCircle, Lightbulb, Briefcase, Loader2, Plus, Camera, StickyNote, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatRelativeTime } from "@/utils/format";
import type { ShotFeedbackSeverity, ShotReviewStatus, SubmissionShot } from "@/types/photobrief";
import { classifyAction, type QuickActionKind } from "@/features/submissions/lib/quickAction";

const severityMeta: Record<
  ShotFeedbackSeverity,
  { label: string; tone: "success" | "warning" | "destructive" | "muted"; Icon: typeof CheckCircle2 }
> = {
  pass: { label: "Looks good", tone: "success", Icon: CheckCircle2 },
  warn: { label: "Needs attention", tone: "warning", Icon: AlertTriangle },
  fail: { label: "Reject / missing", tone: "destructive", Icon: XCircle },
  unavailable: { label: "AI review unavailable", tone: "muted", Icon: HelpCircle },
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
  /**
   * Called when the reviewer edits the AI-generated business summary or
   * suggested next action. Empty string clears the field. Should persist
   * the change and refresh the parent's view of `shot.feedback`.
   */
  onEditFeedback?: (
    patch: { businessSummary?: string; suggestedNextAction?: string },
  ) => Promise<void> | void;
  /**
   * Add an internal note about this shot. Used by the "Note required"
   * quick action so reviewers can capture the AI's suggestion as a
   * teammate-visible note without rejecting the photo.
   */
  onAddNote?: (body: string) => Promise<void> | void;
}

export function ShotCard({
  shot,
  pendingDecision,
  onApprove,
  onReject,
  onClearDecision,
  onEditFeedback,
  onAddNote,
}: Props) {
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
        "group overflow-hidden surface-card lift-on-hover transition-colors",
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
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            loading="lazy"
          />
        )}
        {/* Glass gradient veil — improves chip contrast and adds depth on hover */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-foreground/30 via-foreground/5 to-transparent opacity-70 transition-opacity group-hover:opacity-90"
          aria-hidden
        />
        <div className="absolute left-2 top-2">
          <span className="glass rounded-full px-2 py-0.5 text-[11px] font-semibold text-foreground">
            #{shot.orderIndex + 1}
          </span>
        </div>
        <div className="absolute right-2 top-2 [&>*]:glass [&>*]:!bg-[hsl(var(--glass-bg-strong))]">
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

        {/* Business-facing context: helps the reviewer decide what to do
            next. Rendered outside the severity-tinted block so it always
            reads as neutral guidance regardless of pass/warn/fail tone.
            Inline-editable when an `onEditFeedback` handler is provided so
            reviewers can correct AI wording before acting on the submission. */}
        <EditableFeedbackField
          label="Business summary"
          tone="neutral"
          Icon={Briefcase}
          value={shot.feedback?.businessSummary ?? ""}
          editable={!!onEditFeedback}
          onSave={onEditFeedback ? (next) => onEditFeedback({ businessSummary: next }) : undefined}
        />
        <EditableFeedbackField
          label="Suggested next action"
          tone="accent"
          Icon={Lightbulb}
          value={shot.feedback?.suggestedNextAction ?? ""}
          editable={!!onEditFeedback}
          onSave={
            onEditFeedback ? (next) => onEditFeedback({ suggestedNextAction: next }) : undefined
          }
        />

        {/* Quick actions — one-tap shortcuts that apply the AI's suggested
            next action. Only visible when no decision has been made yet,
            actions are wired up, and there's something to act on. */}
        <QuickActions
          shot={shot}
          decisionMade={isApproved || isRejected}
          onApprove={onApprove}
          onReject={onReject}
          onAddNote={onAddNote}
        />

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

// ---------------------------------------------------------------------------
// EditableFeedbackField
// ---------------------------------------------------------------------------
// Inline-editable text row for AI envelope fields (business summary &
// suggested next action). When `editable` is false it falls back to a
// read-only display (and renders nothing if value is empty). When editable
// and empty, shows an "Add" affordance so the reviewer can write their own.

interface EditableFieldProps {
  label: string;
  /** Visual tone — `accent` for next-action, `neutral` for summary. */
  tone: "neutral" | "accent";
  Icon: typeof Briefcase;
  value: string;
  editable: boolean;
  /** Returns a promise so we can show a saving spinner. */
  onSave?: (next: string) => Promise<void> | void;
}

function EditableFeedbackField({
  label,
  tone,
  Icon,
  value,
  editable,
  onSave,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  // Reset draft if the underlying value changes from outside (e.g. refetch
  // after a parent invalidation) and we aren't actively editing.
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const empty = value.trim().length === 0;

  // Read-only: hide entirely when empty and not editable.
  if (!editable && empty) return null;

  const containerTone =
    tone === "accent"
      ? "border-accent/40 bg-accent/30 text-foreground"
      : "bg-muted/30 text-foreground/90";
  const iconTone =
    tone === "accent" ? "text-accent-foreground" : "text-muted-foreground";

  // Empty + editable: "Add" affordance.
  if (empty && !editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft("");
          setEditing(true);
        }}
        className="flex w-full items-center gap-1.5 rounded-md border border-dashed bg-muted/10 px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
      >
        <Plus className="h-3 w-3" /> Add {label.toLowerCase()}
      </button>
    );
  }

  if (editing) {
    return (
      <div className={cn("rounded-md border px-3 py-2 text-xs", containerTone)}>
        <div className="flex items-center gap-1.5">
          <Icon className={cn("h-3.5 w-3.5 shrink-0", iconTone)} />
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
        </div>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          autoFocus
          className="mt-1.5 min-h-0 text-xs"
          placeholder={`Edit the ${label.toLowerCase()}…`}
        />
        <div className="mt-2 flex items-center justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={saving}
            onClick={() => {
              setEditing(false);
              setDraft(value);
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={saving || draft.trim() === value.trim()}
            onClick={async () => {
              if (!onSave) {
                setEditing(false);
                return;
              }
              try {
                setSaving(true);
                await onSave(draft.trim());
                setEditing(false);
              } finally {
                setSaving(false);
              }
            }}
            className="gap-1"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Save
          </Button>
        </div>
      </div>
    );
  }

  // Read-only / display mode (with edit affordance when editable).
  return (
    <div
      className={cn(
        "group/field flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
        containerTone,
      )}
    >
      <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", iconTone)} />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 leading-snug">{value}</p>
      </div>
      {editable ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={`Edit ${label.toLowerCase()}`}
          className="-mr-1 h-6 w-6 opacity-0 transition-opacity group-hover/field:opacity-100 focus-visible:opacity-100"
          onClick={() => {
            setDraft(value);
            setEditing(true);
          }}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// QuickActions
// ---------------------------------------------------------------------------
// Three one-tap shortcuts mapped from the AI's suggested next action:
//   • Reshoot       → reject with the suggestion as the comment
//   • Note required → add an internal note (does not block; auto-approves)
//   • Mark ready    → approve as-is
// We classify the suggestion text to highlight the most likely action,
// but always render all three so the reviewer can pick a different one.


interface QuickActionsProps {
  shot: SubmissionShot;
  decisionMade: boolean;
  onApprove?: () => void;
  onReject?: (comment: string) => void;
  onAddNote?: (body: string) => Promise<void> | void;
}

function QuickActions({
  shot,
  decisionMade,
  onApprove,
  onReject,
  onAddNote,
}: QuickActionsProps) {
  const [busy, setBusy] = useState<QuickActionKind | null>(null);

  // Hide entirely once a decision has already been made — the reviewer
  // can clear it via the existing controls below if they change their
  // mind. Also hide when the shot is missing (no photo to act on).
  if (decisionMade || shot.missing) return null;
  // Need at least one action wired up to be useful.
  if (!onApprove && !onReject && !onAddNote) return null;

  const suggestion = shot.feedback?.suggestedNextAction?.trim();
  const primary = classifyAction(suggestion);

  // Default copy when the AI didn't supply a suggestion.
  const fallbackComment =
    suggestion || `Please retake "${shot.title}" — current photo isn't usable.`;
  const fallbackNote =
    suggestion || `Follow up on "${shot.title}" before acting on this submission.`;

  async function handleReshoot() {
    if (!onReject) return;
    setBusy("reshoot");
    try {
      onReject(fallbackComment);
    } finally {
      setBusy(null);
    }
  }
  async function handleNote() {
    if (!onAddNote) return;
    setBusy("note");
    try {
      await onAddNote(`[${shot.title}] ${fallbackNote}`);
      // Auto-approve so the note doesn't block the submission — the
      // reviewer captured the follow-up, the photo itself is fine.
      onApprove?.();
    } finally {
      setBusy(null);
    }
  }
  function handleReady() {
    if (!onApprove) return;
    setBusy("ready");
    try {
      onApprove();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-1">
      <span className="mr-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Quick action
      </span>
      <QuickActionButton
        kind="reshoot"
        primary={primary}
        disabled={!onReject || busy !== null}
        loading={busy === "reshoot"}
        onClick={handleReshoot}
        Icon={Camera}
        label="Reshoot"
      />
      <QuickActionButton
        kind="note"
        primary={primary}
        disabled={!onAddNote || busy !== null}
        loading={busy === "note"}
        onClick={handleNote}
        Icon={StickyNote}
        label="Note required"
      />
      <QuickActionButton
        kind="ready"
        primary={primary}
        disabled={!onApprove || busy !== null}
        loading={busy === "ready"}
        onClick={handleReady}
        Icon={Sparkles}
        label="Mark ready"
      />
    </div>
  );
}

function QuickActionButton({
  kind,
  primary,
  disabled,
  loading,
  onClick,
  Icon,
  label,
}: {
  kind: QuickActionKind;
  primary: QuickActionKind;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
  Icon: typeof Camera;
  label: string;
}) {
  const isPrimary = kind === primary;
  return (
    <Button
      type="button"
      size="sm"
      variant={isPrimary ? "default" : "outline"}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-7 gap-1 px-2 text-[11px]",
        !isPrimary && "text-foreground/80",
      )}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Icon className="h-3 w-3" />
      )}
      {label}
    </Button>
  );
}
