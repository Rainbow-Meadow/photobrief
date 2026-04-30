import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  /** Primary action(s) — typically a Button or Button group. */
  action?: ReactNode;
  /** Optional secondary action / link below the primary CTA. */
  secondaryAction?: ReactNode;
  className?: string;
  /** Visual size — `default` for inline empty lists, `lg` for full-page states. */
  size?: "default" | "lg";
  /** @deprecated Use `size="default"`. Kept for backward compat — maps to a tighter padding. */
  compact?: boolean;
}

/**
 * Centered empty / zero-state primitive built on the surface-card system.
 * Pairs a translucent lens-ring backdrop with a glass icon chip — used for
 * inboxes, search results, and other "nothing here yet" surfaces.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = "default",
  compact,
}: EmptyStateProps) {
  const effectiveSize = compact ? "default" : size;
  return (
    <div
      className={cn(
        "surface-card relative isolate overflow-hidden text-center",
        compact ? "px-4 py-8" : effectiveSize === "lg" ? "px-6 py-16" : "px-6 py-12",
        className,
      )}
    >
      {/* Decorative lens-ring backdrop */}
      <div
        className={cn(
          "pointer-events-none absolute left-1/2 top-0 -z-10 -translate-x-1/2 opacity-30",
          effectiveSize === "lg" ? "h-72 w-72 -translate-y-12" : "h-56 w-56 -translate-y-10",
          "lens-ring",
        )}
        aria-hidden
      />
      {Icon ? (
        <span
          className={cn(
            "mx-auto flex items-center justify-center rounded-full glass-strong text-primary",
            effectiveSize === "lg" ? "h-16 w-16" : "h-14 w-14",
          )}
          aria-hidden
        >
          <Icon className={cn(effectiveSize === "lg" ? "h-7 w-7" : "h-6 w-6")} />
        </span>
      ) : null}
      <h3
        className={cn(
          "mt-4 font-semibold tracking-tight text-foreground",
          effectiveSize === "lg" ? "text-lg" : "text-base",
        )}
      >
        {title}
      </h3>
      {description ? (
        <p
          className={cn(
            "mx-auto mt-1.5 max-w-sm text-muted-foreground",
            effectiveSize === "lg" ? "text-sm" : "text-xs",
          )}
        >
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
      {secondaryAction ? (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}
