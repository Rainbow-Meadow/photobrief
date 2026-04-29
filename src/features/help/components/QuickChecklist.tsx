import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuickChecklist({
  storageKey,
  items,
  title = "Your checklist",
}: {
  storageKey: string;
  items: { id: string; label: string }[];
  title?: string;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setChecked(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const doneCount = items.filter((i) => checked[i.id]).length;

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">
          {doneCount} / {items.length}
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((item) => {
          const isDone = !!checked[item.id];
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => toggle(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  isDone
                    ? "border-primary/30 bg-primary/5 text-foreground"
                    : "hover:bg-muted/50",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                    isDone ? "border-primary bg-primary text-primary-foreground" : "border-input",
                  )}
                  aria-hidden
                >
                  {isDone && <Check className="h-3.5 w-3.5" />}
                </span>
                <span className={cn(isDone && "line-through opacity-70")}>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
