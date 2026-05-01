import { NavLink } from "react-router-dom";
import { MessageSquare, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signupCtaTarget } from "@/config/access";
import { trackEvent } from "@/lib/analytics";

/**
 * Honest beta band.
 *
 * Until we have signed, named customer quotes, we frame this section as an
 * open invitation rather than fabricated social proof. This protects the
 * brand on launch and gives early teams a clear path in.
 */
export function TestimonialsRow() {
  return (
    <section className="relative overflow-hidden bg-background">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-ambient-mesh opacity-40" />
      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-eyebrow">Private beta</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            We're onboarding our first cohort of operators
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
            PhotoBrief is being built alongside a small group of home-services and claims teams.
            We're keeping the cohort tight so every workspace gets hands-on setup, weekly
            improvements, and direct access to the team.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl gap-5 sm:grid-cols-3">
          <BetaBenefit
            title="Hands-on onboarding"
            body="A real human helps you build your first request and review your first submission."
          />
          <BetaBenefit
            title="Weekly improvements"
            body="Your feedback ships into the product within days, not quarters."
          />
          <BetaBenefit
            title="Founding pricing"
            body="Beta workspaces lock in founding-customer pricing for as long as you stay."
          />
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="rounded-full">
            <NavLink
              to={signupCtaTarget()}
              onClick={() => trackEvent("cta_click", { location: "beta_band", label: "join_waitlist" })}
            >
              Join the waitlist <ArrowRight className="ml-1 h-4 w-4" />
            </NavLink>
          </Button>
          <Button asChild size="lg" variant="glass" className="rounded-full">
            <NavLink
              to="/help"
              onClick={() => trackEvent("cta_click", { location: "beta_band", label: "see_how_it_works" })}
            >
              See how it works
            </NavLink>
          </Button>
        </div>
      </div>
    </section>
  );
}

function BetaBenefit({ title, body }: { title: string; body: string }) {
  return (
    <div className="glass-strong flex h-full flex-col rounded-2xl p-5 text-left">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MessageSquare className="h-4 w-4" />
      </span>
      <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
