import { NavLink } from "react-router-dom";
import { Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

export function FinalCtaCard() {
  return (
    <section className="bg-muted/30">
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8 lg:py-24">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-elev-sm">
          <Zap className="h-6 w-6" />
        </span>
        <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Your next customer is about to send you the wrong photos.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
          Fix that in 5 minutes. Send your first PhotoBrief request today — free.
        </p>
        <div className="mt-8 flex justify-center">
          <Button asChild size="lg" className="rounded-full px-7">
            <NavLink
              to="/auth?mode=signup"
              onClick={() => trackEvent("cta_click", { location: "final_card", label: "create_account" })}
            >
              Create Your Free Account <ArrowRight className="ml-1 h-4 w-4" />
            </NavLink>
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Free forever plan · No credit card · Takes 2 minutes
        </p>
      </div>
    </section>
  );
}
