// Renders Stripe Embedded Checkout inline. The parent controls visibility
// (typically inside a Dialog) — this component just mounts the iframe.
import { useEffect } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import type { Plan, BillingInterval } from "@/types/photobrief";

interface Props {
  workspaceId: string;
  plan: Plan;
  interval: BillingInterval;
  returnUrl?: string;
}

export function StripeEmbeddedCheckout({ workspaceId, plan, interval, returnUrl }: Props) {
  useEffect(() => {
    trackEvent("checkout_started", { plan, interval });
  }, [plan, interval]);

  const fetchClientSecret = async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: {
        workspace_id: workspaceId,
        plan,
        interval,
        environment: getStripeEnvironment(),
        returnUrl:
          returnUrl ??
          `${window.location.origin}/app/settings/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      },
    });
    if (error || !data?.clientSecret) {
      throw new Error(error?.message ?? "Failed to create checkout session");
    }
    return data.clientSecret;
  };

  return (
    <div id="checkout" className="min-h-[640px]">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
