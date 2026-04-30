import { NavLink } from "react-router-dom";
import { Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { signupCtaTarget, signupCtaLabel, INVITE_ONLY_BETA } from "@/config/access";

export function FinalCtaCard() {
  return (
    <section className="relative overflow-hidden bg-background">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-ambient-sky" />
      <div className="relative mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="glass-strong relative rounded-[28px] p-10 text-center shadow-glass-lg sm:p-14">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
            <Zap className="h-6 w-6" />
          </span>
          <h2 className="mt-6 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Your next customer is about to send you the wrong photos.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
            Fix that in 5 minutes. Send your first PhotoBrief request today — free.
          </p>
          <div className="mt-8 flex justify-center">
            <Button asChild size="xl" className="rounded-full">
              <NavLink
                to={signupCtaTarget()}
                onClick={() => trackEvent("cta_click", { location: "final_card", label: "primary" })}
              >
                {INVITE_ONLY_BETA ? signupCtaLabel() : "Create your free account"} <ArrowRight className="ml-1 h-4 w-4" />
              </NavLink>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {INVITE_ONLY_BETA
              ? "Invite-only beta · We're onboarding businesses carefully"
              : "Free forever plan · No credit card · Takes 2 minutes"}
          </p>
        </div>
      </div>
    </section>
  );
}
