// Renders Stripe Embedded Checkout for a one-time top-up purchase.
// Parent controls visibility (typically inside a Dialog).
import { useEffect } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import type { TopupPack } from "@/config/topupPacks";

interface Props {
  workspaceId: string;
  pack: TopupPack;
  returnUrl?: string;
}

export function StripeTopupCheckout({ workspaceId, pack, returnUrl }: Props) {
  useEffect(() => {
    trackEvent("topup_checkout_started", {
      price_id: pack.priceId,
      pack_size: pack.size,
      amount_cents: pack.amountCents,
    });
  }, [pack]);

  const fetchClientSecret = async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("create-topup-checkout", {
      body: {
        workspace_id: workspaceId,
        price_id: pack.priceId,
        environment: getStripeEnvironment(),
        returnUrl:
          returnUrl ??
          `${window.location.origin}/app/settings/billing?topup=success&session_id={CHECKOUT_SESSION_ID}`,
      },
    });
    if (error || !data?.clientSecret) {
      throw new Error(error?.message ?? "Failed to create top-up checkout session");
    }
    return data.clientSecret;
  };

  return (
    <div id="topup-checkout" className="min-h-[560px]">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
