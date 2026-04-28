import { Sparkles, Lock } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  featureCatalog,
  getPlanLimit,
  minPlanFor,
  type FeatureKey,
} from "@/config/planLimits";

interface UpgradePromptCardProps {
  /**
   * Feature this card is gating. When provided, the title, description, and
   * required-plan label are derived from the central catalog so we never
   * hardcode plan names in components.
   */
  feature?: FeatureKey;
  title?: string;
  description?: string;
  ctaLabel?: string;
  onCta?: () => void;
  /** Compact inline variant for use inside cards/panels. */
  variant?: "default" | "inline";
  className?: string;
}

export function UpgradePromptCard({
  feature,
  title,
  description,
  ctaLabel,
  onCta,
  variant = "default",
  className,
}: UpgradePromptCardProps) {
  const meta = feature ? featureCatalog[feature] : null;
  const requiredPlan = feature ? minPlanFor(feature) : undefined;
  const requiredPlanName = requiredPlan ? getPlanLimit(requiredPlan).name : undefined;

  const resolvedTitle =
    title ?? (meta ? `${meta.label} is on ${requiredPlanName ?? "a higher plan"}` : "Upgrade to Pro");
  const resolvedDescription =
    description ??
    meta?.description ??
    "Unlock the AI request builder, custom guides, and richer briefs.";
  const resolvedCta = ctaLabel ?? (requiredPlanName ? `Upgrade to ${requiredPlanName}` : "See plans");

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm",
          className,
        )}
      >
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{resolvedTitle}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{resolvedDescription}</p>
        </div>
        {onCta ? (
          <Button size="sm" variant="outline" onClick={onCta}>
            {resolvedCta}
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline">
            <NavLink to="/settings/billing">{resolvedCta}</NavLink>
          </Button>
        )}
      </div>
    );
  }

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
          <h4 className="text-sm font-semibold">{resolvedTitle}</h4>
          <p className="mt-1 text-sm/relaxed text-primary-foreground/90">{resolvedDescription}</p>
        </div>
      </div>
      {onCta ? (
        <Button
          onClick={onCta}
          variant="secondary"
          size="sm"
          className="mt-4 bg-white text-primary hover:bg-white/90"
        >
          {resolvedCta}
        </Button>
      ) : (
        <Button asChild variant="secondary" size="sm" className="mt-4 bg-white text-primary hover:bg-white/90">
          <NavLink to="/settings/billing">{resolvedCta}</NavLink>
        </Button>
      )}
    </div>
  );
}
