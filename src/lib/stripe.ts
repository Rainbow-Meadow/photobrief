// Stripe.js loader — uses the publishable token injected by enable_stripe_payments.
//
// Use the `/pure` entrypoint so importing this module does NOT eagerly inject
// the https://js.stripe.com/... script tag into <head>. Without `/pure`,
// stripe.js is added on app boot (because BillingSettingsPage is statically
// imported in App.tsx), which Lighthouse flags as a render-blocking request
// costing ~1.8s on the marketing landing page.
//
// With `/pure`, the script is only fetched when `loadStripe()` is actually
// called — i.e. when the user opens an embedded checkout. Behavior is
// otherwise identical.
import { loadStripe } from "@stripe/stripe-js/pure";
import type { Stripe } from "@stripe/stripe-js";

type StripeEnv = "sandbox" | "live";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;
const environment: StripeEnv = clientToken?.startsWith("pk_test_") ? "sandbox" : "live";

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    if (!clientToken) {
      throw new Error("VITE_PAYMENTS_CLIENT_TOKEN is not set");
    }
    stripePromise = loadStripe(clientToken);
  }
  return stripePromise;
}

export function getStripeEnvironment(): StripeEnv {
  return environment;
}

export function isPaymentsConfigured(): boolean {
  return Boolean(clientToken);
}
