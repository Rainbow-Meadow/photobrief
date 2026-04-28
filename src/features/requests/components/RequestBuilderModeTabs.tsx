import { Sparkles, LayoutTemplate } from "lucide-react";
import { cn } from "@/lib/utils";

export type BuilderMode = "template" | "ai";

interface RequestBuilderModeTabsProps {
  mode: BuilderMode;
  onChange: (mode: BuilderMode) => void;
}

/** Two-tab switcher between guide templates and AI chat builder. */
export function RequestBuilderModeTabs({ mode, onChange }: RequestBuilderModeTabsProps) {
  const tabs: Array<{ id: BuilderMode; label: string; icon: typeof Sparkles; hint: string }> = [
    { id: "template", label: "Choose template", icon: LayoutTemplate, hint: "Start from a saved guide" },
    { id: "ai", label: "Describe with AI", icon: Sparkles, hint: "Tell us what you need" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl border bg-card p-1">
      {tabs.map((t) => {
        const active = mode === t.id;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={cn(
              "flex flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition",
              active ? "bg-primary text-primary-foreground shadow-elev-sm" : "hover:bg-accent",
            )}
          >
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Icon className="h-4 w-4" /> {t.label}
            </span>
            <span className={cn("text-xs", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
              {t.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}
