import { cn } from "@/lib/utils";
import { getPlanLimit } from "@/config/planLimits";
import type { Plan } from "@/types/photobrief";

interface PlanTagProps {
  plan: Plan;
  /** Pin to the right side of a flex/menu item. */
  alignRight?: boolean;
  className?: string;
}

/**
 * Tiny pill used to mark a feature/control as gated to a specific plan.
 * Standardized so we don't keep hand-rolling `text-[10px] uppercase text-primary` everywhere.
 */
export function PlanTag({ plan, alignRight, className }: PlanTagProps) {
  const name = getPlanLimit(plan).name;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary",
        alignRight && "ml-auto",
        className,
      )}
    >
      {name}
    </span>
  );
}
