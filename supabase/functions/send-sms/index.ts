// Sends an SMS via the workspace's own Twilio account (BYO).
// Logs to `sms_send_log` and `request_messages`.
//
// Body: { workspaceId, requestId?, toNumber, body, kind?, appendOptOut? }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  workspaceId: string;
  requestId?: string;
  toNumber: string;
  body: string;
  kind?: "initial" | "reminder" | "followup" | "custom";
  appendOptOut?: boolean;
}

function basicAuth(sid: string, secret: string): string {
  return "Basic " + btoa(`${sid}:${secret}`);
}

function normalizeE164(num: string): string {
  const trimmed = num.trim();
  if (/^\+[1-9]\d{6,14}$/.test(trimmed)) return trimmed;
  // Best-effort: strip non-digits, prepend + if missing.
  const digits = trimmed.replace(/[^\d]/g, "");
  if (digits.length >= 7 && digits.length <= 15) return `+${digits}`;
  return trimmed;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: auth } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    if (!body?.workspaceId || !body?.toNumber || !body?.body) {
      return new Response(
        JSON.stringify({ error: "Missing workspaceId, toNumber, or body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (body.body.length > 1500) {
      return new Response(
        JSON.stringify({ error: "Message body exceeds 1500 chars" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Confirm membership via user-bound client.
    const { data: isMember } = await userClient.rpc("is_workspace_member", {
      _workspace_id: body.workspaceId,
    });
    if (!isMember) {
      return new Response(JSON.stringify({ error: "Not a workspace member" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load config (service role — we need the secret).
    const { data: cfg } = await admin
      .from("workspace_sms_config")
      .select(
        "account_sid, api_key_sid, api_key_secret, from_number, enabled, verified_at",
      )
      .eq("workspace_id", body.workspaceId)
      .maybeSingle();

    if (!cfg || !cfg.enabled || !cfg.verified_at || !cfg.from_number) {
      return new Response(
        JSON.stringify({
          error:
            "SMS is not configured for this workspace. Connect Twilio in Settings → SMS.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const toNumber = normalizeE164(body.toNumber);

    // Suppression check
    const { data: suppressed } = await admin
      .from("sms_suppressions")
      .select("id")
      .eq("workspace_id", body.workspaceId)
      .eq("phone_number", toNumber)
      .maybeSingle();

    if (suppressed) {
      return new Response(
        JSON.stringify({
          error: "Recipient has opted out of SMS from this workspace.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Compose body (append opt-out hint if requested or for first send)
    let messageBody = body.body;
    if (body.appendOptOut !== false) {
      // Check if we've sent to this number before — if not, append once.
      const { count } = await admin
        .from("sms_send_log")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", body.workspaceId)
        .eq("to_number", toNumber);
      if (!count || count === 0) {
        if (!/STOP/i.test(messageBody)) {
          messageBody = `${messageBody}\nReply STOP to opt out.`;
        }
      }
    }

    // Send via Twilio
    const url = `https://api.twilio.com/2010-04-01/Accounts/${cfg.account_sid}/Messages.json`;
    const form = new URLSearchParams({
      To: toNumber,
      From: cfg.from_number,
      Body: messageBody,
    });

    const twilioRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: basicAuth(cfg.api_key_sid, cfg.api_key_secret),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    const twilioJson = (await twilioRes.json()) as Record<string, unknown>;

    const ok = twilioRes.ok;
    const messageSid = (twilioJson.sid as string) ?? null;
    const errorCode = twilioJson.code ? String(twilioJson.code) : null;
    const errorMessage = ok ? null : (twilioJson.message as string) ?? "Send failed";

    // Log
    await admin.from("sms_send_log").insert({
      workspace_id: body.workspaceId,
      request_id: body.requestId ?? null,
      to_number: toNumber,
      from_number: cfg.from_number,
      body: messageBody,
      twilio_message_sid: messageSid,
      status: ok ? ((twilioJson.status as string) ?? "queued") : "failed",
      error_code: errorCode,
      error_message: errorMessage,
      sent_by: userData.user.id,
      metadata: { kind: body.kind ?? "custom" },
    });

    if (!ok) {
      return new Response(
        JSON.stringify({ ok: false, error: errorMessage, code: errorCode }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Mirror to request_messages timeline if tied to a request
    if (body.requestId) {
      await admin.from("request_messages").insert({
        request_id: body.requestId,
        workspace_id: body.workspaceId,
        kind: body.kind ?? "custom",
        channel: "sms",
        direction: "outbound",
        to_address: toNumber,
        body: messageBody,
        sent_by: userData.user.id,
        metadata: { twilio_sid: messageSid },
      });

      // Bump status on initial send
      if (body.kind === "initial") {
        await admin
          .from("photo_brief_requests")
          .update({ status: "sent" })
          .eq("id", body.requestId)
          .in("status", ["draft"]);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, messageSid }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
