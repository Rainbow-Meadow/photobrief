// Create a one-time Embedded Checkout session for a request-credit top-up pack.
// Returns { clientSecret } that the frontend mounts via @stripe/react-stripe-js.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const PACK_PRICE_IDS = new Set(["topup_25", "topup_100", "topup_500"]);

const PACK_SIZES: Record<string, number> = {
  topup_25: 25,
  topup_100: 100,
  topup_500: 500,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const workspaceId: string | undefined = body?.workspace_id;
    const priceId: string | undefined = body?.price_id;
    const environment: StripeEnv = body?.environment === "live" ? "live" : "sandbox";
    const returnUrl: string =
      body?.returnUrl ??
      `${req.headers.get("origin") ?? ""}/settings/billing?topup=success&session_id={CHECKOUT_SESSION_ID}`;

    if (!workspaceId || !priceId) {
      return new Response(
        JSON.stringify({ error: "workspace_id and price_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!PACK_PRICE_IDS.has(priceId)) {
      return new Response(
        JSON.stringify({ error: `Unknown top-up pack: ${priceId}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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

    // Fetch workspace plan tier (for record-keeping on the pack)
    const { data: workspace } = await supabase
      .from("business_workspaces")
      .select("plan_tier")
      .eq("id", workspaceId)
      .maybeSingle();

    const stripe = createStripeClient(environment);

    const prices = await stripe.prices.list({ lookup_keys: [priceId] });
    if (!prices.data.length) {
      return new Response(
        JSON.stringify({ error: `Stripe price not found for ${priceId}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const stripePrice = prices.data[0];

    // Reuse existing customer if available
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
      mode: "payment",
      ui_mode: "embedded",
      return_url: returnUrl,
      ...(existingCustomer
        ? { customer: existingCustomer }
        : { customer_email: user.email ?? undefined }),
      metadata: {
        kind: "topup",
        workspace_id: workspaceId,
        user_id: user.id,
        price_id: priceId,
        pack_size: String(PACK_SIZES[priceId] ?? 0),
        plan_at_purchase: workspace?.plan_tier ?? "free",
      },
      payment_intent_data: {
        metadata: {
          kind: "topup",
          workspace_id: workspaceId,
          user_id: user.id,
          price_id: priceId,
          pack_size: String(PACK_SIZES[priceId] ?? 0),
        },
      },
    });

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-topup-checkout error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
