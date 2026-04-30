import { cn } from "@/lib/utils";
import type { BillingInterval } from "@/types/photobrief";

interface Props {
  value: BillingInterval;
  onChange: (v: BillingInterval) => void;
  /** Render on dark/brand backgrounds (e.g. landing hero band). */
  variant?: "default" | "onDark";
  className?: string;
}

export function BillingIntervalToggle({ value, onChange, variant = "default", className }: Props) {
  const onDark = variant === "onDark";
  return (
    <div
      role="tablist"
      aria-label="Billing interval"
      className={cn(
        "inline-flex items-center rounded-full p-1 text-sm",
        onDark
          ? "border border-white/15 bg-white/10 backdrop-blur"
          : "border bg-card shadow-elev-sm",
        className,
      )}
    >
      {(["monthly", "annual"] as const).map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              "relative inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-medium transition",
              active
                ? onDark
                  ? "bg-white text-brand-navy"
                  : "bg-primary text-primary-foreground shadow-sm"
                : onDark
                  ? "text-white/75 hover:text-white"
                  : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt === "monthly" ? "Monthly" : "Annual"}
            {opt === "annual" ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  active
                    ? "bg-white text-primary"
                    : onDark
                      ? "bg-white/15 text-white"
                      : "bg-success/15 text-success-foreground",
                )}
              >
                Save 20%
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
