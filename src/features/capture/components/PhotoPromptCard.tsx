import type { GuideStep } from "@/types/photobrief";

interface PhotoPromptCardProps {
  step: GuideStep;
  index: number;
  total: number;
}

/**
 * Assistant message that announces the next photo we need.
 * Rendered inside a ChatMessage from="assistant" bubble.
 */
export function PhotoPromptCard({ step, index, total }: PhotoPromptCardProps) {
  return (
    <div className="space-y-1.5">
      <p className="text-eyebrow text-[10px]">
        Photo {index} of {total}
      </p>
      <p className="text-sm font-semibold text-foreground">{step.title}</p>
      <p className="text-sm text-foreground/90">{step.instructions}</p>
      {!step.required && (
        <p className="text-xs text-muted-foreground">Optional — you can skip.</p>
      )}
    </div>
  );
}
