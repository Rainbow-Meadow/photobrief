import { Zap, ArrowRight } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useFoundingPro } from "@/hooks/useFoundingPro";
import { FOUNDING_PRO } from "@/config/planLimits";
import { trackEvent } from "@/lib/analytics";
import { INVITE_ONLY_BETA } from "@/config/access";

export function FoundingCustomerBanner() {
  const { available, loading } = useFoundingPro();
  if (loading || !available) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-warning/40 bg-warning/10 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-warning/20 text-warning">
            <Zap className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Founding Customer Offer — Limited to first {FOUNDING_PRO.totalSlots} businesses
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Lock in <span className="font-semibold text-foreground">Founding Pro at ${FOUNDING_PRO.monthlyPrice}/month for life</span> — full Pro plan, forever.
            </p>
          </div>
        </div>
        <Button
          asChild
          className="shrink-0 rounded-full bg-warning text-warning-foreground hover:bg-warning/90"
        >
          <NavLink
            to={INVITE_ONLY_BETA
              ? `/waitlist?interest=founding-pro`
              : `/auth?mode=signup&plan=pro&coupon=${FOUNDING_PRO.couponCode}`}
            onClick={() => trackEvent("cta_click", { location: "founding_banner", label: "claim_founding" })}
          >
            {INVITE_ONLY_BETA ? "Request founding access" : "Claim Founding Price"} <ArrowRight className="ml-1 h-4 w-4" />
          </NavLink>
        </Button>
      </div>
    </div>
  );
}
