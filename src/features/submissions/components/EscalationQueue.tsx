import { useMemo } from "react";
import {
  ShieldAlert,
  ChevronRight,
  Sparkles,
  Gauge,
  AlertTriangle,
  Eye,
  ImageOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import type { ShotAIFeedback, SubmissionShot } from "@/types/photobrief";

/**
 * Confidence below this is treated as "router would escalate" — mirrors the
 * threshold used in `ai-summarize-submission` for the auto-retry.
 */
const LOW_CONFIDENCE = 0.55;

/** Flags that the model emits when something is genuinely ambiguous. */
const ESCALATION_FLAGS = new Set([
  "low_confidence",
  "ambiguous_label",
  "unreadable",
  "needs_admin",
  "needs_admin_review",
  "conflicting_evidence",
  "low_light",
]);

type EscalationReason = {
  code:
    | "low_confidence"
    | "model_flag"
    | "fail_severity"
    | "ai_unavailable";
  label: string;
  detail?: string;
};

type QueueItem = {
  shot: SubmissionShot;
  reasons: EscalationReason[];
  recommendedAction: string;
  /** Stable group key used to bucket the queue. */
  group: "low_confidence" | "model_flag" | "fail_severity" | "ai_unavailable";
};

/** Derive a sensible admin action from the available envelope signals. */
function deriveRecommendedAction(
  feedback: ShotAIFeedback | undefined,
  primary: QueueItem["group"],
): string {
  // Prefer the model's own recommendation when present.
  const modelSuggestion = feedback?.suggestedNextAction?.trim();
  if (modelSuggestion) return modelSuggestion;

  switch (primary) {
    case "ai_unavailable":
      return "Re-run analysis at the escalation tier";
    case "low_confidence":
      return "Re-run with escalation tier and verify extracted details";
    case "model_flag":
      return "Manually inspect and confirm/override the AI verdict";
    case "fail_severity":
      return "Confirm reshoot is required, then send back to recipient";
  }
}

function classifyShot(shot: SubmissionShot): QueueItem | null {
  const fb = shot.feedback;
  const reasons: EscalationReason[] = [];

  // Treat "missing photo" as outside the AI escalation queue — that's a
  // recipient action, not an admin one.
  if (shot.missing || !shot.imageUrl) return null;

  if (fb?.severity === "unavailable") {
    reasons.push({
      code: "ai_unavailable",
      label: "AI analysis unavailable",
      detail: fb.headline,
    });
  }

  if (typeof fb?.confidence === "number" && fb.confidence < LOW_CONFIDENCE) {
    reasons.push({
      code: "low_confidence",
      label: `Low confidence (${Math.round(fb.confidence * 100)}%)`,
      detail: `Model self-reported below ${Math.round(LOW_CONFIDENCE * 100)}%`,
    });
  }

  const flaggedFlags = (fb?.flags ?? []).filter((f) => ESCALATION_FLAGS.has(f));
  if (flaggedFlags.length > 0) {
    reasons.push({
      code: "model_flag",
      label: `Flagged: ${flaggedFlags.join(", ")}`,
      detail: fb?.headline,
    });
  }

  if (fb?.severity === "fail") {
    reasons.push({
      code: "fail_severity",
      label: "Marked fail",
      detail: fb?.headline,
    });
  }

  if (reasons.length === 0) return null;

  // Pick the highest-priority reason as the bucket.
  const order: QueueItem["group"][] = [
    "ai_unavailable",
    "low_confidence",
    "model_flag",
    "fail_severity",
  ];
  const group = order.find((g) => reasons.some((r) => r.code === g)) ?? "model_flag";

  return {
    shot,
    reasons,
    recommendedAction: deriveRecommendedAction(fb, group),
    group,
  };
}

const GROUP_META: Record<
  QueueItem["group"],
  { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  ai_unavailable: {
    label: "AI unavailable",
    icon: ImageOff,
    tone: "text-muted-foreground",
  },
  low_confidence: {
    label: "Low confidence",
    icon: Gauge,
    tone: "text-warning",
  },
  model_flag: {
    label: "Model flagged",
    icon: AlertTriangle,
    tone: "text-warning",
  },
  fail_severity: {
    label: "Marked fail",
    icon: AlertTriangle,
    tone: "text-destructive",
  },
};

export interface EscalationQueueProps {
  shots: SubmissionShot[];
  onFocusShot?: (shotId: string) => void;
  /** Opens the admin AI rerun page seeded with this shot's media id. */
  onRerunShot?: (shot: SubmissionShot) => void;
}

export function EscalationQueue({
  shots,
  onFocusShot,
  onRerunShot,
}: EscalationQueueProps) {
  const { isAdmin } = usePlatformAdmin();

  const items = useMemo(() => {
    return shots
      .map(classifyShot)
      .filter((x): x is QueueItem => x !== null);
  }, [shots]);

  const grouped = useMemo(() => {
    const map = new Map<QueueItem["group"], QueueItem[]>();
    for (const item of items) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return map;
  }, [items]);

  // Hide entirely for non-admins or when there's nothing to triage.
  if (!isAdmin || items.length === 0) return null;

  const order: QueueItem["group"][] = [
    "ai_unavailable",
    "low_confidence",
    "model_flag",
    "fail_severity",
  ];

  return (
    <section
      className="surface-card border-l-4 border-l-primary/60 p-5"
      aria-label="Admin escalation queue"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 text-primary" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Escalation queue
              <span className="ml-2 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                Admin
              </span>
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {items.length} shot{items.length === 1 ? "" : "s"} the router would route to
              admin review — grouped by reason.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {order
          .filter((g) => grouped.has(g))
          .map((g) => {
            const list = grouped.get(g)!;
            const meta = GROUP_META[g];
            const Icon = meta.icon;
            return (
              <div key={g}>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Icon className={cn("h-3.5 w-3.5", meta.tone)} />
                  {meta.label}
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-foreground">
                    {list.length}
                  </span>
                </div>
                <ul className="mt-2 space-y-2">
                  {list.map((item) => (
                    <li
                      key={item.shot.id}
                      className="rounded-md border bg-muted/20 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {item.shot.title}
                          </p>
                          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                            {item.reasons.map((r, i) => (
                              <li key={`${r.code}-${i}`}>
                                <span className="font-medium text-foreground/80">
                                  {r.label}
                                </span>
                                {r.detail ? (
                                  <span> — {r.detail}</span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                          <p className="mt-2 rounded border border-accent/40 bg-accent/30 px-2 py-1.5 text-xs text-foreground">
                            <span className="font-semibold uppercase tracking-wide text-[10px] text-muted-foreground">
                              Recommended:
                            </span>{" "}
                            {item.recommendedAction}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {onFocusShot ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={() => onFocusShot(item.shot.id)}
                          >
                            <Eye className="h-3.5 w-3.5" /> Open shot
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        ) : null}
                        {onRerunShot ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={() => onRerunShot(item.shot)}
                          >
                            <Sparkles className="h-3.5 w-3.5" /> Rerun escalated
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
      </div>
    </section>
  );
}
