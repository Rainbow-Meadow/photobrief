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
        "rounded-lg border bg-card p-3 shadow-elev-sm transition-shadow hover:shadow-elev-md sm:p-4 lg:p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
        {Icon ? (
          <span className="rounded-md bg-accent p-1 text-accent-foreground sm:p-1.5">
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </span>
        ) : null}
      </div>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground sm:mt-2 sm:text-3xl">
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
