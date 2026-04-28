import { Lock, Sparkles, ArrowRight } from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  featureCatalog,
  getPlanLimit,
  minPlanFor,
  type FeatureKey,
} from "@/config/planLimits";
import { usePlan } from "@/hooks/usePlan";
import { trackEvent } from "@/lib/analytics";

interface Props {
  feature: FeatureKey;
  /** Children render normally when allowed; locked overlay otherwise. */
  children?: React.ReactNode;
  /** Render style when feature is locked. */
  variant?: "card" | "inline" | "button";
  className?: string;
  /** Override the headline copy (e.g. "Limit reached"). */
  title?: string;
  /** Override the body copy. */
  description?: string;
}

/**
 * Feature gate wrapper. If the current workspace plan can use the feature,
 * renders children. Otherwise shows an upgrade prompt + dialog tied to the
 * required plan from the planLimits source of truth.
 */
export function UpgradePrompt({
  feature,
  children,
  variant = "card",
  className,
  title,
  description,
}: Props) {
  const { can } = usePlan();
  const meta = featureCatalog[feature];
  const requiredPlan = minPlanFor(feature);

  if (can(feature)) return <>{children}</>;
  const required = requiredPlan ? getPlanLimit(requiredPlan) : undefined;

  const headline = title ?? `Upgrade to ${required?.name ?? "a paid plan"}`;
  const body = description ?? meta.description;

  const dialog = (
    <Dialog>
      <DialogTrigger asChild>
        {variant === "button" ? (
          <Button variant="outline" size="sm" className={cn("gap-1.5", className)}>
            <Lock className="h-3.5 w-3.5" /> {meta.label}
          </Button>
        ) : (
          <button
            type="button"
            className={cn(
              variant === "card"
                ? "group relative flex w-full flex-col items-start gap-2 rounded-xl border border-dashed bg-muted/30 p-5 text-left transition hover:border-primary/50 hover:bg-muted/50"
                : "inline-flex items-center gap-1.5 rounded-md border border-dashed bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground",
              className,
            )}
          >
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide",
                "text-primary",
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {required ? required.name : "Upgrade"}
            </span>
            {variant === "card" ? (
              <>
                <span className="text-base font-semibold text-foreground">{meta.label}</span>
                <span className="text-sm text-muted-foreground">{meta.description}</span>
                <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  See plan details <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </>
            ) : (
              <span>{meta.label}</span>
            )}
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {headline}
          </DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>

        {required ? (
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-semibold text-foreground">{required.name}</p>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">${required.priceAnnualMonthly}</span>
                /mo billed yearly
              </p>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm">
              {required.features.slice(0, 4).map((f) => (
                <li key={f} className="flex items-start gap-2 text-foreground">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button asChild variant="ghost">
            <NavLink to="/pricing">Compare plans</NavLink>
          </Button>
          <Button asChild>
            <NavLink
              to={`/app/settings/billing?plan=${requiredPlan ?? "pro"}`}
              onClick={() => trackEvent("plan_upgrade_clicked", { plan: requiredPlan ?? "pro", surface: "upgrade_prompt", feature })}
            >
              Upgrade now <ArrowRight className="ml-1 h-4 w-4" />
            </NavLink>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return dialog;
}
