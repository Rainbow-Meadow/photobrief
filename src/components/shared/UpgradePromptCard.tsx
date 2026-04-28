import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UpgradePromptCardProps {
  title?: string;
  description?: string;
  ctaLabel?: string;
  onCta?: () => void;
  className?: string;
}

export function UpgradePromptCard({
  title = "Upgrade to Pro",
  description = "Unlock the AI request builder, custom guides, and richer briefs.",
  ctaLabel = "See plans",
  onCta,
  className,
}: UpgradePromptCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border bg-gradient-primary p-5 text-primary-foreground shadow-glow",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="rounded-md bg-white/15 p-2">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h4 className="text-sm font-semibold">{title}</h4>
          <p className="mt-1 text-sm/relaxed text-primary-foreground/90">{description}</p>
        </div>
      </div>
      <Button
        onClick={onCta}
        variant="secondary"
        size="sm"
        className="mt-4 bg-white text-primary hover:bg-white/90"
      >
        {ctaLabel}
      </Button>
    </div>
  );
}
