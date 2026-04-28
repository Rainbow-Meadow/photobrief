import { Camera, Clock, MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { PhotoGuide } from "@/types/photobrief";

interface Props {
  guide: PhotoGuide | null;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onUse: (guide: PhotoGuide) => void;
  onCustomize: (guide: PhotoGuide) => void;
}

export function GuidePreviewDialog({ guide, open, onOpenChange, onUse, onCustomize }: Props) {
  if (!guide) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <span>{guide.category}</span>
            {guide.recommendedPlan ? (
              <StatusBadge
                label={guide.recommendedPlan === "free" ? "Free" : guide.recommendedPlan === "pro" ? "Pro" : "Team"}
                tone={guide.recommendedPlan === "free" ? "muted" : guide.recommendedPlan === "pro" ? "info" : "success"}
              />
            ) : null}
          </div>
          <DialogTitle className="mt-1">{guide.name}</DialogTitle>
          <DialogDescription>{guide.description}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1.5">
            <Camera className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{guide.steps.length} capture steps</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span>~{guide.estimatedMinutes ?? Math.max(2, guide.steps.length)} min for the recipient</span>
          </div>
        </div>

        <section className="mt-2 max-h-[50vh] space-y-4 overflow-y-auto pr-1">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Capture steps
            </h3>
            <ol className="mt-2 space-y-2">
              {guide.steps.map((step, i) => (
                <li key={step.id} className="flex gap-3 rounded-md border bg-background p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {step.title}
                      {step.required ? null : (
                        <span className="ml-2 text-[11px] font-normal text-muted-foreground">Optional</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{step.instructions}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {guide.questions.length > 0 ? (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Context questions
              </h3>
              <ul className="mt-2 space-y-2">
                {guide.questions.map((q) => (
                  <li
                    key={q.id}
                    className="flex items-start gap-2 rounded-md border bg-background p-3 text-sm"
                  >
                    <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span>
                      {q.prompt}
                      {q.required ? <span className="ml-1 text-destructive">*</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onCustomize(guide)}>
            Customize
          </Button>
          <Button onClick={() => onUse(guide)}>Use this guide</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
