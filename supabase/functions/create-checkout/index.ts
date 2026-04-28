// Create an Embedded Checkout session for the requested plan + interval.
// Returns { clientSecret } that the frontend mounts via @stripe/react-stripe-js.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const PLAN_PRICE_IDS = new Set([
  "starter_monthly",
  "starter_annual",
  "pro_monthly",
  "pro_annual",
  "team_monthly",
  "team_annual",
  "business_monthly",
  "business_annual",
]);

function priceIdFor(plan: string, interval: string): string | null {
  const id = `${plan}_${interval === "annual" ? "annual" : "monthly"}`;
  return PLAN_PRICE_IDS.has(id) ? id : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const workspaceId: string | undefined = body?.workspace_id;
    const plan: string | undefined = body?.plan;
    const interval: string = body?.interval === "annual" ? "annual" : "monthly";
    const environment: StripeEnv = body?.environment === "live" ? "live" : "sandbox";
    const returnUrl: string =
      body?.returnUrl ??
      `${req.headers.get("origin") ?? ""}/app/settings/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`;

    if (!workspaceId || !plan) {
      return new Response(JSON.stringify({ error: "workspace_id and plan are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const priceId = priceIdFor(plan, interval);
    if (!priceId) {
      return new Response(JSON.stringify({ error: `Unknown plan/interval: ${plan}/${interval}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(token ?? "");
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify membership
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: "Not a workspace member" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = createStripeClient(environment);

    // Resolve the price by lookup_key (stable across sandbox/live)
    const prices = await stripe.prices.list({ lookup_keys: [priceId] });
    if (!prices.data.length) {
      return new Response(
        JSON.stringify({ error: `Stripe price not found for ${priceId}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const stripePrice = prices.data[0];

    // Reuse existing customer if we already have one for this workspace
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("workspace_id", workspaceId)
      .eq("environment", environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const existingCustomer = existing?.stripe_customer_id ?? undefined;

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      mode: "subscription",
      ui_mode: "embedded",
      return_url: returnUrl,
      ...(existingCustomer
        ? { customer: existingCustomer }
        : { customer_email: user.email ?? undefined }),
      metadata: {
        workspace_id: workspaceId,
        user_id: user.id,
        plan,
        interval,
      },
      subscription_data: {
        metadata: {
          workspace_id: workspaceId,
          user_id: user.id,
          plan,
          interval,
        },
      },
    });

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-checkout error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
