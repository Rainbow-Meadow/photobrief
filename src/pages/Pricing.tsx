import { NavLink } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { planLimits, type Quota } from "@/config/planLimits";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatQuota(q: Quota, singular: string, pluralSuffix = "s"): string {
  if (q === "unlimited") return `Unlimited ${singular}${pluralSuffix}`;
  return `${q} ${singular}${q === 1 ? "" : pluralSuffix}`;
}

// NOTE: This page is being fully rewritten in the next phase with the new
// PricingCardGrid + monthly/annual toggle + Founding Pro spotlight. Keeping
// it building against the new spec for now.

export default function PricingPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">
          Simple pricing for small businesses
        </h1>
        <p className="mt-3 text-muted-foreground">
          Start free. Upgrade when PhotoBrief is saving you real time.
        </p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-4">
        {planLimits.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              "flex flex-col rounded-xl border bg-card p-6 shadow-elev-sm",
              plan.highlight && "border-primary shadow-glow ring-2 ring-primary/30 lg:scale-[1.03]",
            )}
          >
            {plan.highlight ? (
              <span className="mb-2 inline-flex w-fit rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                Most popular
              </span>
            ) : null}
            <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
            <p className="mt-5 text-4xl font-semibold text-foreground">
              ${plan.priceMonthly}
              <span className="text-base font-normal text-muted-foreground">/mo</span>
            </p>
            <ul className="mt-6 flex-1 space-y-2.5 text-sm">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span className="text-foreground">{f}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-1 text-xs text-muted-foreground">
              <p>{formatQuota(plan.quotas.requestsPerMonth, "request", "s / month")}</p>
              <p>{formatQuota(plan.quotas.users, "user")}</p>
            </div>
            <Button
              asChild
              className="mt-6"
              variant={plan.highlight ? "default" : "outline"}
            >
              <NavLink to="/auth?mode=signup">
                {plan.priceMonthly === 0 ? "Start free" : `Choose ${plan.name}`}
              </NavLink>
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
