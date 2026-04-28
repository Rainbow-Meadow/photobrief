// Twilio inbound SMS webhook.
// Public (no JWT). Twilio POSTs application/x-www-form-urlencoded.
//
// Handles:
//   • STOP / STOPALL / UNSUBSCRIBE / CANCEL / END / QUIT  → add to suppressions, auto-reply
//   • START / UNSTOP / YES                                 → remove from suppressions, auto-reply
//   • HELP / INFO                                          → auto-reply with workspace name + how to reach support
//   • Anything else                                        → log inbound to request_messages timeline + notify members
//
// We identify the workspace by matching the `To` (our Twilio number) against
// workspace_sms_config.from_number. We try to associate the inbound message
// with the most recent outbound to/from this pair, so it shows up on the
// right request timeline.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

const STOP_KEYWORDS = new Set([
  "STOP",
  "STOPALL",
  "UNSUBSCRIBE",
  "CANCEL",
  "END",
  "QUIT",
]);
const START_KEYWORDS = new Set(["START", "UNSTOP", "YES"]);
const HELP_KEYWORDS = new Set(["HELP", "INFO"]);

function twiml(message?: string): Response {
  const xml = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(
        message,
      )}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response/>`;
  return new Response(xml, {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/xml" },
  });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeE164(num: string): string {
  const trimmed = num.trim();
  if (/^\+[1-9]\d{6,14}$/.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/[^\d]/g, "");
  if (digits.length >= 7 && digits.length <= 15) return `+${digits}`;
  return trimmed;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Twilio sends form-urlencoded.
    const form = await req.formData();
    const fromRaw = (form.get("From") as string | null) ?? "";
    const toRaw = (form.get("To") as string | null) ?? "";
    const bodyRaw = ((form.get("Body") as string | null) ?? "").trim();
    const messageSid = (form.get("MessageSid") as string | null) ?? null;

    if (!fromRaw || !toRaw) {
      return twiml(); // Silent ack — bad payload.
    }

    const fromNumber = normalizeE164(fromRaw);
    const toNumber = normalizeE164(toRaw);

    // Find the workspace that owns this `To` number.
    const { data: cfg } = await admin
      .from("workspace_sms_config")
      .select("workspace_id")
      .eq("from_number", toNumber)
      .maybeSingle();

    if (!cfg) {
      // Unknown number — just ack to Twilio so it doesn't retry forever.
      console.log("twilio-inbound: no workspace for To=", toNumber);
      return twiml();
    }
    const workspaceId = cfg.workspace_id as string;

    // Try to associate with the most recent request that involved this pair.
    const { data: lastOut } = await admin
      .from("sms_send_log")
      .select("request_id")
      .eq("workspace_id", workspaceId)
      .eq("to_number", fromNumber)
      .not("request_id", "is", null)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const requestId: string | null = lastOut?.request_id ?? null;

    const upper = bodyRaw.toUpperCase();
    const firstWord = upper.split(/\s+/)[0] ?? "";

    // STOP path
    if (STOP_KEYWORDS.has(firstWord)) {
      await admin
        .from("sms_suppressions")
        .upsert(
          {
            workspace_id: workspaceId,
            phone_number: fromNumber,
            reason: "stop",
            metadata: { keyword: firstWord, message_sid: messageSid },
          },
          { onConflict: "workspace_id,phone_number" },
        );

      await logInbound(
        admin,
        workspaceId,
        requestId,
        fromNumber,
        toNumber,
        bodyRaw,
        messageSid,
        "stop",
      );
      await notifyMembers(
        admin,
        workspaceId,
        "SMS opt-out received",
        `${fromNumber} replied STOP. They've been added to your suppression list.`,
      );
      // Twilio auto-handles STOP confirmation in most US flows, but we send our own
      // short ack to be safe (idempotent — Twilio dedupes).
      return twiml(
        "You've been unsubscribed and will not receive more messages. Reply START to opt back in.",
      );
    }

    // START path
    if (START_KEYWORDS.has(firstWord)) {
      await admin
        .from("sms_suppressions")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("phone_number", fromNumber);

      await logInbound(
        admin,
        workspaceId,
        requestId,
        fromNumber,
        toNumber,
        bodyRaw,
        messageSid,
        "start",
      );
      await notifyMembers(
        admin,
        workspaceId,
        "SMS opt-in received",
        `${fromNumber} replied START and is opted back in.`,
      );
      return twiml("You're opted back in. Reply STOP to unsubscribe.");
    }

    // HELP path
    if (HELP_KEYWORDS.has(firstWord)) {
      const { data: ws } = await admin
        .from("business_workspaces")
        .select("name")
        .eq("id", workspaceId)
        .maybeSingle();
      await logInbound(
        admin,
        workspaceId,
        requestId,
        fromNumber,
        toNumber,
        bodyRaw,
        messageSid,
        "help",
      );
      const name = ws?.name ?? "this business";
      return twiml(
        `${name}: this number sends photo requests. Reply STOP to unsubscribe. Msg & data rates may apply.`,
      );
    }

    // Generic inbound reply: log + notify, no auto-reply.
    await logInbound(
      admin,
      workspaceId,
      requestId,
      fromNumber,
      toNumber,
      bodyRaw,
      messageSid,
      "reply",
    );
    await notifyMembers(
      admin,
      workspaceId,
      "New SMS reply",
      `${fromNumber}: ${bodyRaw.slice(0, 140)}`,
    );

    return twiml();
  } catch (e) {
    console.error("twilio-inbound error:", e);
    // Still 200 so Twilio doesn't retry forever; we logged the error.
    return twiml();
  }
});

async function logInbound(
  admin: ReturnType<typeof createClient>,
  workspaceId: string,
  requestId: string | null,
  fromNumber: string,
  toNumber: string,
  body: string,
  messageSid: string | null,
  category: "reply" | "stop" | "start" | "help",
) {
  if (!requestId) return; // request_messages requires a request_id
  const { error } = await admin.from("request_messages").insert({
    request_id: requestId,
    workspace_id: workspaceId,
    kind: "custom",
    channel: "sms",
    direction: "inbound",
    to_address: toNumber,
    body,
    metadata: {
      from_number: fromNumber,
      twilio_sid: messageSid,
      category,
    },
  });
  if (error) console.error("twilio-inbound: insert request_messages failed", error);
}

async function notifyMembers(
  admin: ReturnType<typeof createClient>,
  workspaceId: string,
  title: string,
  bodyText: string,
) {
  const { data: members } = await admin
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .eq("status", "active");
  if (!members?.length) return;
  const rows = members.map((m) => ({
    workspace_id: workspaceId,
    user_id: m.user_id,
    type: "sms_inbound",
    title,
    body: bodyText,
  }));
  const { error } = await admin.from("notifications").insert(rows);
  if (error) console.error("twilio-inbound: insert notifications failed", error);
}
