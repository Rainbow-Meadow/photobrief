import { Send, ImageIcon, MessageCircleQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { microcopy } from "@/config/microcopy";
import type { CapturedPhoto, AnsweredQuestion } from "@/types/chat";
import type { PhotoGuide } from "@/types/photobrief";

interface ReviewSummaryCardProps {
  guide: PhotoGuide;
  photos: CapturedPhoto[];
  answers: AnsweredQuestion[];
  onSubmit: () => void;
}

export function ReviewSummaryCard({ guide, photos, answers, onSubmit }: ReviewSummaryCardProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">{microcopy.recipient.reviewTitle}</p>
        <p className="text-xs text-muted-foreground">
          Sending to {guide.name.toLowerCase()} brief.
        </p>
      </div>

      <section className="space-y-2">
        <header className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <ImageIcon className="h-3.5 w-3.5" /> Photos ({photos.length})
        </header>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p, i) => {
            const step = guide.steps.find((s) => s.id === p.stepId);
            return (
              <div key={i} className="space-y-1">
                <div className="aspect-square overflow-hidden rounded-md bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.previewUrl}
                    alt={step?.title ?? "Photo"}
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="line-clamp-2 text-[10px] text-muted-foreground">
                  {step?.title}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {answers.length > 0 && (
        <section className="space-y-2">
          <header className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <MessageCircleQuestion className="h-3.5 w-3.5" /> Answers
          </header>
          <ul className="space-y-2">
            {answers.map((a) => (
              <li key={a.questionId} className="rounded-md border bg-background p-2 text-xs">
                <p className="font-medium text-foreground">{a.prompt}</p>
                <p className="mt-0.5 text-foreground/80">{a.answer}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Button size="sm" className="w-full gap-1.5" onClick={onSubmit}>
        <Send className="h-4 w-4" /> {microcopy.recipient.submit}
      </Button>
    </div>
  );
}
