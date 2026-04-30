import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  /**
   * Optional eyebrow / breadcrumb above the title. Renders with the global
   * `.text-eyebrow` style (uppercase, tracked, muted). Useful for section
   * context like "Settings · Brand" or "Workspace".
   */
  eyebrow?: ReactNode;
  actions?: ReactNode;
  /**
   * Render the bottom border + padding. Default true (matches Dashboard / Inbox / Detail).
   * Set to false on settings-style pages where the next element is itself a bordered card.
   */
  bordered?: boolean;
  className?: string;
}

export function PageHeader({ title, description, eyebrow, actions, bordered = true, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        bordered ? "hairline-b pb-5" : "pb-1",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? <p className="text-eyebrow mb-1.5">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
