import { NavLink } from "react-router-dom";
import { ArrowRight, ShieldCheck, Sparkles, Database, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { signupCtaTarget, signupCtaLabel } from "@/config/access";

/**
 * Headline marketing surface for the rejection refund promise.
 * Phrase "First-pass guarantee" is the locked feature name and must
 * appear verbatim across landing, pricing, dashboard, and auth.
 */
export function FirstPassGuaranteeBand() {
  return (
    <section
      id="first-pass-guarantee"
      className="relative overflow-hidden bg-background"
      aria-labelledby="first-pass-guarantee-heading"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-ambient-mesh opacity-60" />
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          {/* Pitch ----------------------------------------------------- */}
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3 w-3" /> Industry first
            </span>
            <h2
              id="first-pass-guarantee-heading"
              className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            >
              The First-pass guarantee
            </h2>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              Most tools charge whether the photos are usable or not. We don't.
              If you have to send the customer back for a redo, that request is
              <span className="font-semibold text-foreground">
                {" "}refunded to your monthly allowance — automatically
              </span>
              .
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              You only pay for briefs that land right the first time.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="rounded-full px-6">
                <NavLink
                  to={signupCtaTarget()}
                  onClick={() =>
                    trackEvent("cta_click", {
                      location: "guarantee_band",
                      label: "primary",
                    })
                  }
                >
                  {signupCtaLabel()} <ArrowRight className="ml-1 h-4 w-4" />
                </NavLink>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="lg"
                className="rounded-full text-foreground hover:bg-muted"
              >
                <a
                  href="#how-it-works"
                  onClick={() =>
                    trackEvent("cta_click", {
                      location: "guarantee_band",
                      label: "how_it_works",
                    })
                  }
                >
                  How it works
                </a>
              </Button>
            </div>
          </div>

          {/* Bullet card --------------------------------------------- */}
          <div className="glass-strong rounded-3xl p-6 shadow-glass-lg sm:p-8 animate-lift-in">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-primary/10 p-3 text-primary">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                Refund triggers automatically
              </p>
            </div>

            <ul className="mt-6 space-y-5">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 rounded-md bg-success/10 p-1.5 text-success">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Auto-credited
                  </p>
                  <p className="text-sm text-muted-foreground">
                    The moment a reviewer marks a submission for rework, the
                    request is refunded — no support ticket required.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 rounded-md bg-success/10 p-1.5 text-success">
                  <Database className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    One credit per request, guaranteed
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Enforced by a database constraint, not a policy promise. No
                    double-counts, no missed refunds.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 rounded-md bg-success/10 p-1.5 text-success">
                  <BarChart3 className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Visible on your dashboard
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Tracked as your first-pass acceptance rate so you can see
                    quality climb every month.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
