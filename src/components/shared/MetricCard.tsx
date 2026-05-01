import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface MetricSubStat {
  label: string;
  tone?: "default" | "success" | "muted";
}

interface MetricFootnote {
  label: string;
  /** Native tooltip shown on hover — keep it short. */
  tooltip?: string;
  tone?: "default" | "success" | "muted" | "primary";
}

interface MetricCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  className?: string;
  /**
   * Optional secondary stat rendered under the hint, separated by a thin
   * border. Used e.g. for showing second-pass acceptance under first-pass.
   */
  subStat?: MetricSubStat;
  /**
   * Optional tertiary line rendered below the sub-stat. Used to surface a
   * supporting business signal (e.g. "X requests refunded this period").
   */
  footnote?: MetricFootnote;
}

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  className,
  subStat,
  footnote,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        {Icon ? (
          <span className="rounded-lg bg-accent p-1.5 text-accent-foreground">
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground tabular-nums sm:text-[2rem] sm:leading-[1.1]">
        {value}
      </p>
      <p className="mt-1 text-xs font-medium text-muted-foreground">{label}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground/80">{hint}</p> : null}
      {subStat ? (
        <p
          className={cn(
            "mt-3 border-t pt-2 text-xs",
            subStat.tone === "success" && "text-success",
            subStat.tone === "muted" && "text-muted-foreground",
            (!subStat.tone || subStat.tone === "default") && "text-foreground",
          )}
        >
          {subStat.label}
        </p>
      ) : null}
      {footnote ? (
        <p
          title={footnote.tooltip}
          className={cn(
            "mt-1.5 text-xs font-medium",
            footnote.tone === "success" && "text-success",
            footnote.tone === "primary" && "text-primary",
            footnote.tone === "muted" && "text-muted-foreground",
            (!footnote.tone || footnote.tone === "default") && "text-foreground",
          )}
        >
          {footnote.label}
        </p>
      ) : null}
    </div>
  );
}
