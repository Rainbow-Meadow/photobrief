// Public API: programmatic request creation.
// Auth: Bearer <api_key> issued via the Team Settings UI.
// Body: { recipient_name, recipient_email?, recipient_phone?, guide_id?, custom_message?, due_date? }
// Returns: { request_id, recipient_url, token }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const apiKey = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (!apiKey || !apiKey.startsWith("pb_")) {
      return new Response(JSON.stringify({ error: "Missing or invalid API key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const keyHash = await sha256Hex(apiKey);
    const { data: keyRow, error: keyErr } = await admin
      .from("workspace_api_keys")
      .select("id, workspace_id, revoked_at")
      .eq("key_hash", keyHash)
      .maybeSingle();

    if (keyErr || !keyRow || keyRow.revoked_at) {
      return new Response(JSON.stringify({ error: "Invalid or revoked API key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const recipient_name = String(body.recipient_name ?? "").trim();
    const recipient_email = body.recipient_email ? String(body.recipient_email).trim() : null;
    const recipient_phone = body.recipient_phone ? String(body.recipient_phone).trim() : null;
    const guide_id = body.guide_id ? String(body.guide_id) : null;
    const custom_message = body.custom_message ? String(body.custom_message) : null;
    const due_date = body.due_date ? String(body.due_date) : null;

    if (!recipient_name) {
      return new Response(JSON.stringify({ error: "recipient_name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!recipient_email && !recipient_phone) {
      return new Response(
        JSON.stringify({ error: "recipient_email or recipient_phone is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (guide_id) {
      const { data: g } = await admin
        .from("photo_guides")
        .select("id, workspace_id, is_global_template")
        .eq("id", guide_id)
        .maybeSingle();
      if (!g || (g.workspace_id && g.workspace_id !== keyRow.workspace_id && !g.is_global_template)) {
        return new Response(JSON.stringify({ error: "guide_id not accessible" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: created, error: insErr } = await admin
      .from("photo_brief_requests")
      .insert({
        workspace_id: keyRow.workspace_id,
        guide_id,
        recipient_name,
        recipient_email,
        recipient_phone,
        custom_message,
        due_date,
        status: "sent",
      })
      .select("id, token")
      .single();

    if (insErr || !created) {
      return new Response(
        JSON.stringify({ error: insErr?.message ?? "Could not create request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await admin
      .from("workspace_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRow.id);

    const origin = req.headers.get("origin") ?? new URL(req.url).origin;
    const recipient_url = `${origin}/r/${created.token}`;

    return new Response(
      JSON.stringify({ request_id: created.id, token: created.token, recipient_url }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
