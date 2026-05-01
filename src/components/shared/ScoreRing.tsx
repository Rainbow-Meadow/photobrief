import { cn } from "@/lib/utils";

interface Props {
  score: number; // 0-100
  size?: number;
  className?: string;
  /** Optional small label below the number. */
  suffix?: string;
}

function tone(score: number) {
  if (score >= 85) return "score-ring-good";
  if (score >= 60) return "score-ring-warn";
  return "score-ring-bad";
}

/**
 * Circular readiness score ring shown in the submission review header.
 * Uses the `.score-ring` utility so the stroke color follows the
 * in-app teal palette inside `.app-shell`.
 */
export function ScoreRing({ score, size = 72, className, suffix = "/ 100" }: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <div
      className={cn("score-ring", tone(clamped), className)}
      style={
        {
          "--size": `${size}px`,
          "--score": clamped,
        } as React.CSSProperties
      }
      role="img"
      aria-label={`Readiness score ${clamped} out of 100`}
    >
      <div className="flex flex-col items-center leading-none">
        <span className="text-base font-semibold tabular-nums text-foreground">{clamped}</span>
        <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
          {suffix}
        </span>
      </div>
    </div>
  );
}
