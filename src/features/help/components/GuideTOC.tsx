import { cn } from "@/lib/utils";

export type TocItem = { id: string; label: string };

export function GuideTOC({
  items,
  activeId,
  className,
}: {
  items: TocItem[];
  activeId?: string;
  className?: string;
}) {
  return (
    <nav className={cn("space-y-1 text-sm", className)} aria-label="Guide sections">
      <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        On this page
      </p>
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={cn(
            "block rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            activeId === item.id && "bg-muted font-medium text-foreground",
          )}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
