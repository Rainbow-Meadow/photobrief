import { cn } from "@/lib/utils";

interface ReadinessScoreBadgeProps {
  score: number; // 0-100
  className?: string;
}

function toneFor(score: number) {
  if (score >= 85) return "bg-success/15 text-success border-success/30";
  if (score >= 60) return "bg-warning/15 text-warning-foreground border-warning/30";
  return "bg-destructive/15 text-destructive border-destructive/30";
}

export function ReadinessScoreBadge({ score, className }: ReadinessScoreBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        toneFor(score),
        className,
      )}
    >
      <span className="opacity-70">Readiness</span>
      <span>{score}</span>
    </span>
  );
}
