import { Clock, Camera, Sparkles, Eye, Pencil, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";
import type { PhotoGuide } from "@/types/photobrief";

const planMeta: Record<NonNullable<PhotoGuide["recommendedPlan"]>, { label: string; tone: "muted" | "info" | "success" }> = {
  free: { label: "Free", tone: "muted" },
  starter: { label: "Starter", tone: "muted" },
  pro: { label: "Pro", tone: "info" },
  team: { label: "Team", tone: "info" },
  business: { label: "Business", tone: "success" },
};

interface Props {
  guide: PhotoGuide;
  onUse: (guide: PhotoGuide) => void;
  onPreview: (guide: PhotoGuide) => void;
  onCustomize: (guide: PhotoGuide) => void;
}

export function GuideCard({ guide, onUse, onPreview, onCustomize }: Props) {
  const plan = guide.recommendedPlan ? planMeta[guide.recommendedPlan] : null;
  const stepCount = guide.steps.length;
  const minutes = guide.estimatedMinutes;

  return (
    <article className="group flex h-full flex-col surface-card p-5 transition-shadow hover:shadow-elev-md">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {guide.category}
            </p>
            <h3 className="mt-0.5 text-base font-semibold text-foreground">{guide.name}</h3>
          </div>
          {plan ? <StatusBadge label={plan.label} tone={plan.tone} /> : null}
        </div>
        {guide.bestFor ? (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
            <span><span className="font-medium text-foreground">Best for: </span>{guide.bestFor}</span>
          </p>
        ) : null}
      </header>

      <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{guide.description}</p>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1.5">
          <Camera className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-foreground">{stepCount} {stepCount === 1 ? "step" : "steps"}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-foreground">~{minutes ?? Math.max(2, stepCount)} min</span>
        </div>
      </dl>

      <div className={cn("mt-5 flex flex-wrap items-center gap-2 border-t pt-4")}>
        <Button size="sm" className="gap-1.5" onClick={() => onUse(guide)}>
          <Send className="h-3.5 w-3.5" /> Use guide
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onPreview(guide)}>
          <Eye className="h-3.5 w-3.5" /> Preview
        </Button>
        <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => onCustomize(guide)}>
          <Pencil className="h-3.5 w-3.5" /> Customize
        </Button>
      </div>
    </article>
  );
}
