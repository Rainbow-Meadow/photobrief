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
        "surface-card lift-on-hover p-3 sm:p-4 lg:p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-eyebrow text-[10px] sm:text-[11px]">{label}</p>
        {Icon ? (
          <span className="rounded-lg bg-accent/80 p-1.5 text-accent-foreground ring-1 ring-inset ring-accent-foreground/10">
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground tabular-nums sm:mt-3 sm:text-[2rem] sm:leading-[1.1]">
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">{hint}</p> : null}
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
