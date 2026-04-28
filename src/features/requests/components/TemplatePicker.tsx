import { Camera, MessageCircleQuestion } from "lucide-react";
import { cn } from "@/lib/utils";
import { guideTemplates } from "@/config/guideTemplates";
import type { PhotoGuide } from "@/types/photobrief";

interface TemplatePickerProps {
  selectedGuideId?: string;
  onSelect: (guide: PhotoGuide) => void;
}

/** Card grid of available guide templates from config. */
export function TemplatePicker({ selectedGuideId, onSelect }: TemplatePickerProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {guideTemplates.map((g) => {
        const active = selectedGuideId === g.id;
        return (
          <button
            key={g.id}
            type="button"
            onClick={() => onSelect(g)}
            className={cn(
              "flex flex-col gap-2 rounded-xl border bg-card p-4 text-left transition hover:shadow-elev-sm",
              active ? "border-primary ring-2 ring-primary/30" : "border-border",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">{g.name}</p>
                <p className="text-xs text-muted-foreground">{g.category}</p>
              </div>
            </div>
            <p className="line-clamp-2 text-xs text-foreground/80">{g.description}</p>
            <div className="mt-auto flex items-center gap-3 pt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Camera className="h-3.5 w-3.5" /> {g.steps.length} step{g.steps.length === 1 ? "" : "s"}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircleQuestion className="h-3.5 w-3.5" /> {g.questions.length} question
                {g.questions.length === 1 ? "" : "s"}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
