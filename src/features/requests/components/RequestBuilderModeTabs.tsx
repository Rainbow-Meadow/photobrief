import { Sparkles, LayoutTemplate, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";

export type BuilderMode = "template" | "ai";

interface RequestBuilderModeTabsProps {
  mode: BuilderMode;
  onChange: (mode: BuilderMode) => void;
}

/** Two-tab switcher between guide templates and AI chat builder. */
export function RequestBuilderModeTabs({ mode, onChange }: RequestBuilderModeTabsProps) {
  const { can } = usePlan();
  const aiUnlocked = can("ai_request_builder");
  const tabs: Array<{ id: BuilderMode; label: string; icon: typeof Sparkles; hint: string; locked?: boolean }> = [
    { id: "template", label: "Choose template", icon: LayoutTemplate, hint: "Start from a saved guide" },
    {
      id: "ai",
      label: "Describe with AI",
      icon: Sparkles,
      hint: aiUnlocked ? "Tell us what you need" : "Available on Pro",
      locked: !aiUnlocked,
    },
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
            disabled={t.locked}
            onClick={() => onChange(t.id)}
            className={cn(
              "flex flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left transition",
              active ? "bg-primary text-primary-foreground shadow-elev-sm" : "hover:bg-accent",
              t.locked && "cursor-not-allowed opacity-60 hover:bg-transparent",
            )}
          >
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Icon className="h-4 w-4" /> {t.label}
              {t.locked ? <Lock className="h-3 w-3" /> : null}
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
