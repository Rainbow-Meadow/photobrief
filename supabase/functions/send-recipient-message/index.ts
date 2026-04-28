// Sends a recipient message (initial / reminder / followup / custom)
// and persists it to request_messages. Email sending is best-effort:
// if RESEND_API_KEY is configured the message is delivered via Resend,
// otherwise the row is still logged so reminders show in the timeline.
//
// Body: { requestId, kind, subject?, body?, missingItems?, channel? }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const APP_URL = Deno.env.get("APP_PUBLIC_URL") ?? "https://photobrief.app";

interface Body {
  requestId: string;
  kind: "initial" | "reminder" | "followup" | "custom";
  subject?: string;
  body?: string;
  missingItems?: string[];
  channel?: "email" | "sms";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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

    const payload = (await req.json()) as Body;
    if (!payload?.requestId || !payload?.kind) {
      return new Response(JSON.stringify({ error: "Missing requestId or kind" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load request via user RLS (also confirms membership)
    const { data: request, error: reqErr } = await userClient
      .from("photo_brief_requests")
      .select("id, workspace_id, recipient_email, recipient_name, recipient_phone, token, custom_message")
      .eq("id", payload.requestId)
      .maybeSingle();
    if (reqErr || !request) {
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reminders gating: Pro+
    if (payload.kind === "reminder" || payload.kind === "followup") {
      const { data: ws } = await admin
        .from("business_workspaces")
        .select("plan_tier")
        .eq("id", request.workspace_id)
        .maybeSingle();
      const plan = ws?.plan_tier;
      if (!["pro", "team", "business"].includes(plan ?? "")) {
        return new Response(
          JSON.stringify({
            error: "PLAN_FEATURE_LOCKED",
            feature: "reminders",
            requiredPlan: "pro",
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const channel = payload.channel ?? "email";
    const link = `${APP_URL}/r/${request.token}`;
    const firstName = (request.recipient_name ?? "there").split(" ")[0];

    let subject = payload.subject;
    let body = payload.body;
    if (!body) {
      switch (payload.kind) {
        case "initial":
          subject ??= "Quick photo request";
          body = `Hi ${firstName}, please tap the link to submit your photos: ${link}`;
          break;
        case "reminder":
          subject ??= "Quick reminder";
          body = `Hi ${firstName}, just a quick nudge — your photo request is still open: ${link}`;
          break;
        case "followup":
          subject ??= "We need a couple more photos";
          body = `Hi ${firstName}, thanks for the photos so far. We need a few more to wrap up. ${
            payload.missingItems?.length ? `Missing: ${payload.missingItems.join(", ")}. ` : ""
          }Open here: ${link}`;
          break;
        default:
          subject ??= "Photo request update";
          body = `Hi ${firstName}, ${link}`;
      }
    }

    // Best-effort email send via Resend (optional)
    const resendKey = Deno.env.get("RESEND_API_KEY");
    let deliveryStatus: "sent" | "logged_only" | "skipped" = "logged_only";
    let deliveryError: string | undefined;
    const toEmail = request.recipient_email;
    if (channel === "email" && resendKey && toEmail) {
      try {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "PhotoBrief <onboarding@resend.dev>",
            to: [toEmail],
            subject,
            text: body,
          }),
        });
        if (r.ok) deliveryStatus = "sent";
        else {
          deliveryError = await r.text();
          deliveryStatus = "logged_only";
        }
      } catch (e) {
        deliveryError = e instanceof Error ? e.message : String(e);
      }
    } else if (channel === "email" && !toEmail) {
      deliveryStatus = "skipped";
    }

    const { error: insErr } = await admin.from("request_messages").insert({
      request_id: request.id,
      workspace_id: request.workspace_id,
      kind: payload.kind,
      channel,
      to_address: toEmail ?? request.recipient_phone,
      subject,
      body,
      sent_by: userData.user.id,
      metadata: {
        delivery: deliveryStatus,
        ...(deliveryError ? { error: deliveryError } : {}),
        ...(payload.missingItems ? { missingItems: payload.missingItems } : {}),
      },
    });
    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Bump status to 'sent' if it was draft
    if (payload.kind === "initial") {
      await admin
        .from("photo_brief_requests")
        .update({ status: "sent" })
        .eq("id", request.id)
        .in("status", ["draft"]);
    }

    return new Response(
      JSON.stringify({ ok: true, delivery: deliveryStatus }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
