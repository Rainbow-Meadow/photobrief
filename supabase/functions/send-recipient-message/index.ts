// Sends a recipient message (initial / reminder / followup / custom) by
// invoking the shared `send-transactional-email` Edge Function (Lovable
// Email infrastructure) and persists a record to `request_messages`.
//
// Body: { requestId, kind, subject?, body?, missingItems?, channel? }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const APP_URL =
  Deno.env.get("APP_PUBLIC_URL") ?? "https://photobrief.ai";

interface Body {
  requestId: string;
  kind: "initial" | "reminder" | "followup" | "custom";
  subject?: string;
  body?: string;
  missingItems?: string[];
  channel?: "email" | "sms" | "both";
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

    const payload = (await req.json()) as Body;
    if (!payload?.requestId || !payload?.kind) {
      return new Response(
        JSON.stringify({ error: "Missing requestId or kind" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Load request via user RLS (also confirms membership)
    const { data: request, error: reqErr } = await userClient
      .from("photo_brief_requests")
      .select(
        "id, workspace_id, recipient_email, recipient_name, recipient_phone, token, custom_message",
      )
      .eq("id", payload.requestId)
      .maybeSingle();
    if (reqErr || !request) {
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reminders / follow-ups gating: Pro+
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
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Pull workspace + brand profile for branded copy.
    const [{ data: ws }, { data: brand }] = await Promise.all([
      admin
        .from("business_workspaces")
        .select("name")
        .eq("id", request.workspace_id)
        .maybeSingle(),
      admin
        .from("brand_profiles")
        .select("intro_message")
        .eq("workspace_id", request.workspace_id)
        .maybeSingle(),
    ]);

    // Resolve channel: explicit payload wins; otherwise use the workspace's
    // SMS default if SMS is enabled & verified, else fall back to email.
    let channel: "email" | "sms" | "both" = payload.channel ?? "email";
    if (!payload.channel) {
      const { data: smsCfg } = await admin
        .from("workspace_sms_config")
        .select("default_channel, enabled, verified_at, from_number")
        .eq("workspace_id", request.workspace_id)
        .maybeSingle();
      const smsReady =
        smsCfg?.enabled && smsCfg.verified_at && smsCfg.from_number;
      if (smsReady && smsCfg.default_channel) {
        channel = smsCfg.default_channel as "email" | "sms" | "both";
      }
      // Down-grade if a channel can't actually be used for this recipient.
      if (channel === "sms" && !request.recipient_phone) channel = "email";
      if (channel === "both" && !request.recipient_phone) channel = "email";
      if (channel === "both" && !request.recipient_email) channel = "sms";
    }
    const link = `${APP_URL}/r/${request.token}`;
    const businessName = ws?.name ?? "PhotoBrief";
    const firstName = (request.recipient_name ?? "there").split(" ")[0];
    const introMessage =
      request.custom_message?.trim() ||
      brand?.intro_message?.trim() ||
      undefined;

    // Compose default subject + plain-text body for the message log + SMS path.
    let subject = payload.subject;
    let body = payload.body;
    if (!body) {
      switch (payload.kind) {
        case "initial":
          subject ??= `${businessName}: a quick photo request`;
          body = `Hi ${firstName}, ${businessName} needs a few quick photos. Open here: ${link}`;
          break;
        case "reminder":
          subject ??= `Quick reminder from ${businessName}`;
          body = `Hi ${firstName}, just a nudge — your photo request is still open: ${link}`;
          break;
        case "followup":
          subject ??= "We need a couple more photos";
          body = `Hi ${firstName}, thanks for the photos so far. We need a few more to wrap up.${
            payload.missingItems?.length
              ? ` Missing: ${payload.missingItems.join(", ")}.`
              : ""
          } Open here: ${link}`;
          break;
        default:
          subject ??= "Photo request update";
          body = `Hi ${firstName}, ${link}`;
      }
    }

    // Best-effort delivery via Lovable transactional email (initial only for
    // now — reminders/follow-ups will get their own templates in a later stage).
    const toEmail = request.recipient_email;
    let deliveryStatus: "sent" | "logged_only" | "skipped" = "logged_only";
    let deliveryError: string | undefined;

    if (channel === "sms" || channel === "both") {
      // Route SMS through the BYO Twilio send-sms function. It logs to
      // sms_send_log AND inserts a request_messages row.
      if (!request.recipient_phone) {
        if (channel === "sms") {
          return new Response(
            JSON.stringify({ error: "Recipient has no phone number" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      } else {
        const { error: smsErr } = await admin.functions.invoke("send-sms", {
          body: {
            workspaceId: request.workspace_id,
            requestId: request.id,
            toNumber: request.recipient_phone,
            body,
            kind: payload.kind,
          },
          headers: { Authorization: auth },
        });
        if (smsErr) {
          const ctx = (smsErr as { context?: { error?: string } }).context;
          if (channel === "sms") {
            return new Response(
              JSON.stringify({ error: ctx?.error ?? smsErr.message }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }
          // For "both", swallow SMS error and continue with email.
          deliveryError = `SMS failed: ${ctx?.error ?? smsErr.message}`;
        } else if (channel === "sms") {
          return new Response(
            JSON.stringify({ ok: true, delivery: "sent" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      }
    }

    const includeEmail = channel === "email" || channel === "both";
    if (includeEmail && toEmail) {
      const templateName =
        payload.kind === "initial"
          ? "recipient-request-link"
          : payload.kind === "reminder" || payload.kind === "followup"
          ? "recipient-reminder"
          : null;

      if (templateName) {
        const idempotencyKey =
          payload.kind === "initial"
            ? `recipient-link-${request.id}`
            : `recipient-${payload.kind}-${request.id}-${Date.now()}`;

        const templateData =
          templateName === "recipient-request-link"
            ? {
                recipientName: firstName,
                businessName,
                introMessage,
                link,
                estimatedMinutes: 2,
              }
            : {
                recipientName: firstName,
                businessName,
                link,
                estimatedMinutes: 2,
              };

        const { error: sendErr } = await admin.functions.invoke(
          "send-transactional-email",
          {
            body: {
              templateName,
              recipientEmail: toEmail,
              idempotencyKey,
              templateData,
            },
          },
        );
        if (sendErr) {
          deliveryError = deliveryError
            ? `${deliveryError}; email failed: ${sendErr.message}`
            : sendErr.message;
          deliveryStatus = "logged_only";
        } else {
          deliveryStatus = "sent";
        }
      } else {
        deliveryStatus = "logged_only";
      }
    } else if (includeEmail && !toEmail) {
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
        ...(payload.missingItems
          ? { missingItems: payload.missingItems }
          : {}),
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
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
