// Outbound webhook dispatcher.
// POST { workspace_id, event, data } from the app/db. We look up the active
// subscriptions for the workspace that listen to this event and POST a
// signed payload to each. Each attempt is logged.
//
// Signature: HMAC-SHA256 of "<timestamp>.<body>" using the subscription
// secret, sent as header `X-PhotoBrief-Signature: t=<ts>,v1=<hex>`.
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PayloadSchema = z.object({
  workspace_id: z.string().uuid(),
  event: z.string().min(1).max(100),
  data: z.record(z.unknown()),
});

async function sign(secret: string, timestamp: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${body}`),
  );
  return Array.from(new Uint8Array(signed), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  // This endpoint is server-side only (DB triggers / internal callers).
  // Require the service-role key in the Authorization header so anonymous
  // callers cannot inject arbitrary signed webhook deliveries.
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  const presentedKey = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
  if (!presentedKey || presentedKey !== serviceRoleKey) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    serviceRoleKey,
  );

  let parsed;
  try {
    parsed = PayloadSchema.safeParse(await req.json());
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const { workspace_id, event, data } = parsed.data;

  const { data: subs, error } = await supabase
    .from("webhook_subscriptions")
    .select("id, url, secret, events, active")
    .eq("workspace_id", workspace_id)
    .eq("active", true);

  if (error) {
    console.error("Could not load subscriptions", error);
    return new Response(JSON.stringify({ error: "lookup_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const matching = (subs ?? []).filter((s: any) =>
    Array.isArray(s.events) && s.events.includes(event),
  );

  const body = JSON.stringify({
    event,
    workspace_id,
    sent_at: new Date().toISOString(),
    data,
  });
  const ts = Math.floor(Date.now() / 1000).toString();

  const results = await Promise.all(
    matching.map(async (sub: any) => {
      let statusCode: number | null = null;
      let ok = false;
      let errMsg: string | null = null;
      try {
        const signature = await sign(sub.secret, ts, body);
        const res = await fetch(sub.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-PhotoBrief-Event": event,
            "X-PhotoBrief-Signature": `t=${ts},v1=${signature}`,
          },
          body,
          signal: AbortSignal.timeout(8000),
        });
        statusCode = res.status;
        ok = res.ok;
        if (!ok) {
          errMsg = `HTTP ${res.status}`;
        }
      } catch (e) {
        errMsg = e instanceof Error ? e.message : String(e);
      }

      await supabase.from("webhook_deliveries").insert({
        subscription_id: sub.id,
        workspace_id,
        event,
        payload: JSON.parse(body),
        status_code: statusCode,
        ok,
        error: errMsg,
      });

      return { subscription_id: sub.id, ok, status: statusCode, error: errMsg };
    }),
  );

  return new Response(
    JSON.stringify({ delivered: results.length, results }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
