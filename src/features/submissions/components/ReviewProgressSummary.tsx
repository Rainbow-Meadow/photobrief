import { useMemo } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ImageOff,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ShotReviewStatus, SubmissionShot } from "@/types/photobrief";

type Counts = {
  pass: number;
  warn: number;
  fail: number;
  unavailable: number;
  missing: number;
  total: number;
  captured: number;
  pendingReview: number;
  rejected: number;
  approved: number;
};

function computeCounts(
  shots: SubmissionShot[],
  pending: Record<string, { status: ShotReviewStatus; comment?: string }>,
): Counts {
  const c: Counts = {
    pass: 0,
    warn: 0,
    fail: 0,
    unavailable: 0,
    missing: 0,
    total: shots.length,
    captured: 0,
    pendingReview: 0,
    rejected: 0,
    approved: 0,
  };

  for (const s of shots) {
    if (s.missing || !s.imageUrl) {
      c.missing += 1;
      continue;
    }
    c.captured += 1;

    const sev = s.feedback?.severity;
    if (sev === "pass") c.pass += 1;
    else if (sev === "warn") c.warn += 1;
    else if (sev === "fail") c.fail += 1;
    else if (sev === "unavailable") c.unavailable += 1;

    const decision = pending[s.id]?.status ?? s.reviewStatus ?? "pending";
    if (decision === "approved") c.approved += 1;
    else if (decision === "rejected") c.rejected += 1;
    else c.pendingReview += 1;
  }
  return c;
}

interface MetricChipProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "success" | "warning" | "danger" | "muted" | "info";
  onClick?: () => void;
  active?: boolean;
}

const toneStyles: Record<MetricChipProps["tone"], string> = {
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
  muted: "border-border bg-muted/40 text-muted-foreground",
  info: "border-primary/30 bg-primary/10 text-primary",
};

function MetricChip({ icon: Icon, label, value, tone, onClick, active }: MetricChipProps) {
  const Cmp: any = onClick ? "button" : "div";
  return (
    <Cmp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-2 text-left transition",
        toneStyles[tone],
        onClick && "hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-ring",
        active && "ring-2 ring-ring",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <div className="flex flex-col leading-tight">
        <span className="text-base font-semibold tabular-nums">{value}</span>
        <span className="text-[11px] uppercase tracking-wide opacity-80">{label}</span>
      </div>
    </Cmp>
  );
}

export interface ReviewProgressSummaryProps {
  shots: SubmissionShot[];
  pending: Record<string, { status: ShotReviewStatus; comment?: string }>;
  missingItemsCount?: number;
  /** Optional jump-to-shot handler. */
  onFocusShot?: (shotId: string) => void;
}

export function ReviewProgressSummary({
  shots,
  pending,
  missingItemsCount = 0,
  onFocusShot,
}: ReviewProgressSummaryProps) {
  const counts = useMemo(() => computeCounts(shots, pending), [shots, pending]);

  // Actionable items: failing shots, missing shots, plus AI-flagged missing items
  // from the brief sidebar — these are what the reviewer should triage first.
  const actionable = useMemo(() => {
    const items: { id: string; label: string; reason: string; tone: "danger" | "warning" }[] = [];
    for (const s of shots) {
      if (s.missing || !s.imageUrl) {
        items.push({
          id: s.id,
          label: s.title,
          reason: "Photo missing",
          tone: "warning",
        });
        continue;
      }
      if (s.feedback?.severity === "fail") {
        items.push({
          id: s.id,
          label: s.title,
          reason: s.feedback?.headline ?? "Needs reshoot",
          tone: "danger",
        });
      } else if ((pending[s.id]?.status ?? s.reviewStatus) === "rejected") {
        items.push({
          id: s.id,
          label: s.title,
          reason: pending[s.id]?.comment ?? s.reviewComment ?? "Marked for reshoot",
          tone: "danger",
        });
      }
    }
    return items;
  }, [shots, pending]);

  const reviewedPct =
    counts.captured === 0
      ? 0
      : Math.round(((counts.approved + counts.rejected) / counts.captured) * 100);

  return (
    <section
      className="surface-card p-5"
      aria-label="Review progress summary"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Review progress</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {counts.captured} of {counts.total} shots captured
            {counts.captured > 0 ? ` · ${reviewedPct}% decided` : ""}
          </p>
        </div>
        {actionable.length > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-[11px] font-medium text-destructive">
            <AlertTriangle className="h-3 w-3" />
            {actionable.length} to triage
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
            <CheckCircle2 className="h-3 w-3" /> All clear
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <MetricChip icon={CheckCircle2} label="Pass" value={counts.pass} tone="success" />
        <MetricChip icon={AlertTriangle} label="Warn" value={counts.warn} tone="warning" />
        <MetricChip icon={XCircle} label="Fail" value={counts.fail} tone="danger" />
        <MetricChip icon={ImageOff} label="Missing" value={counts.missing} tone="muted" />
        <MetricChip
          icon={HelpCircle}
          label="AI N/A"
          value={counts.unavailable}
          tone="muted"
        />
      </div>

      {(actionable.length > 0 || missingItemsCount > 0) && (
        <div className="mt-4 rounded-md border bg-muted/20 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <ListChecks className="h-3.5 w-3.5" />
            Action items
          </div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {actionable.slice(0, 5).map((item) => (
              <li key={item.id} className="flex items-start gap-2">
                <span
                  className={cn(
                    "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                    item.tone === "danger" ? "bg-destructive" : "bg-warning",
                  )}
                />
                {onFocusShot ? (
                  <button
                    type="button"
                    onClick={() => onFocusShot(item.id)}
                    className="text-left text-foreground hover:underline"
                  >
                    <span className="font-medium">{item.label}</span>
                    <span className="text-muted-foreground"> — {item.reason}</span>
                  </button>
                ) : (
                  <span>
                    <span className="font-medium text-foreground">{item.label}</span>
                    <span className="text-muted-foreground"> — {item.reason}</span>
                  </span>
                )}
              </li>
            ))}
            {actionable.length > 5 ? (
              <li className="text-xs text-muted-foreground">
                +{actionable.length - 5} more
              </li>
            ) : null}
            {missingItemsCount > 0 ? (
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                <span>
                  <span className="font-medium text-foreground">
                    {missingItemsCount} missing detail{missingItemsCount === 1 ? "" : "s"}
                  </span>
                  <span className="text-muted-foreground"> — see “Missing items” panel</span>
                </span>
              </li>
            ) : null}
          </ul>
        </div>
      )}
    </section>
  );
}
