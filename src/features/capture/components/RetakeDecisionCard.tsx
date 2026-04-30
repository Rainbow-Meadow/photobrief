import { RefreshCw, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { microcopy } from "@/config/microcopy";
import type { CapturedPhoto } from "@/types/chat";
import type { GuideStep } from "@/types/photobrief";

interface RetakeDecisionCardProps {
  photo: CapturedPhoto;
  step: GuideStep;
  onRetake: () => void;
  onUseAnyway: (photo: CapturedPhoto) => void;
}

/** Shown after a warn/fail verdict. Recipient chooses retake or use-anyway. */
export function RetakeDecisionCard({ photo, step, onRetake, onUseAnyway }: RetakeDecisionCardProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground">What would you like to do?</p>
      <p className="text-eyebrow text-[10px]">For: {step.title}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" className="gap-1.5 btn-primary-glass" onClick={onRetake}>
          <RefreshCw className="h-4 w-4" /> {microcopy.recipient.retake}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => onUseAnyway(photo)}
        >
          {microcopy.recipient.useAnyway} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
