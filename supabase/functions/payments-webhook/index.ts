// Stripe webhook handler — registered automatically by enable_stripe_payments.
// Receives ?env=sandbox or ?env=live. Updates the subscriptions table for
// the matching workspace. Webhook URL must be `payments-webhook`.
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

type PlanRow = { plan: string; billing_interval: string };

async function planFromPriceId(priceId: string | undefined): Promise<PlanRow> {
  if (!priceId) return { plan: "free", billing_interval: "monthly" };
  const { data } = await getSupabase().rpc("plan_from_price_id", { _price_id: priceId });
  if (Array.isArray(data) && data.length > 0) {
    return data[0] as PlanRow;
  }
  return { plan: "free", billing_interval: "monthly" };
}

function periodFields(subscription: any) {
  const item = subscription.items?.data?.[0];
  const start = item?.current_period_start ?? subscription.current_period_start;
  const end = item?.current_period_end ?? subscription.current_period_end;
  return {
    current_period_start: start ? new Date(start * 1000).toISOString() : null,
    current_period_end: end ? new Date(end * 1000).toISOString() : null,
  };
}

async function upsertSubscription(subscription: any, env: StripeEnv) {
  const workspaceId = subscription.metadata?.workspace_id;
  if (!workspaceId) {
    console.error("No workspace_id in subscription metadata", subscription.id);
    return;
  }

  const item = subscription.items?.data?.[0];
  const priceId =
    item?.price?.lookup_key ||
    item?.price?.metadata?.lovable_external_id ||
    undefined;
  const { plan, billing_interval } = await planFromPriceId(priceId);
  const periods = periodFields(subscription);

  await getSupabase()
    .from("subscriptions")
    .upsert(
      {
        workspace_id: workspaceId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer,
        price_id: priceId ?? null,
        plan_tier: plan as never,
        billing_interval,
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end ?? false,
        environment: env,
        ...periods,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_subscription_id" },
    );

  // Mirror the plan onto the workspace row so app gates resolve immediately.
  if (subscription.status === "active" || subscription.status === "trialing") {
    await getSupabase()
      .from("business_workspaces")
      .update({ plan_tier: plan as never })
      .eq("id", workspaceId);
  }
}

async function markCanceled(subscription: any, env: StripeEnv) {
  await getSupabase()
    .from("subscriptions")
    .update({
      status: "canceled",
      cancel_at_period_end: false,
      plan_tier: "free" as never,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);

  const workspaceId = subscription.metadata?.workspace_id;
  if (workspaceId) {
    await getSupabase()
      .from("business_workspaces")
      .update({ plan_tier: "free" as never })
      .eq("id", workspaceId);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    console.error("Webhook received with invalid env:", rawEnv);
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  const env: StripeEnv = rawEnv;

  try {
    const event = await verifyWebhook(req, env);
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await upsertSubscription(event.data.object, env);
        break;
      case "customer.subscription.deleted":
        await markCanceled(event.data.object, env);
        break;
      default:
        console.log("Unhandled event:", event.type);
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("payments-webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
