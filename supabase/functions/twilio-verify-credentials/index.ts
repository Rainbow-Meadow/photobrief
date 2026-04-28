// Verifies a workspace's Twilio credentials and returns SMS-capable
// phone numbers from the connected account. Called from the SMS Settings
// page when an admin connects or rotates credentials.
//
// Body: { workspaceId: string, accountSid?, apiKeySid?, apiKeySecret? }
//   - If credentials are omitted, uses the stored config.
//   - On success: marks verified_at, returns { ok: true, numbers: [...] }
//   - On failure: stores last_error, returns { ok: false, error }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  workspaceId: string;
  accountSid?: string;
  apiKeySid?: string;
  apiKeySecret?: string;
  fromNumber?: string;
}

function basicAuth(sid: string, secret: string): string {
  return "Basic " + btoa(`${sid}:${secret}`);
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
    if (!body?.workspaceId) {
      return new Response(JSON.stringify({ error: "Missing workspaceId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is workspace admin (use user-RLS-bound client).
    const { data: roleCheck } = await userClient.rpc("has_workspace_role", {
      _workspace_id: body.workspaceId,
      _role: "admin",
    });
    if (!roleCheck) {
      return new Response(
        JSON.stringify({ error: "Workspace admin role required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Resolve credentials: prefer body, fall back to stored config.
    let accountSid = body.accountSid?.trim();
    let apiKeySid = body.apiKeySid?.trim();
    let apiKeySecret = body.apiKeySecret?.trim();

    if (!accountSid || !apiKeySid || !apiKeySecret) {
      const { data: stored } = await admin
        .from("workspace_sms_config")
        .select("account_sid, api_key_sid, api_key_secret")
        .eq("workspace_id", body.workspaceId)
        .maybeSingle();
      accountSid ||= stored?.account_sid ?? undefined;
      apiKeySid ||= stored?.api_key_sid ?? undefined;
      apiKeySecret ||= stored?.api_key_secret ?? undefined;
    }

    if (!accountSid || !apiKeySid || !apiKeySecret) {
      return new Response(
        JSON.stringify({ error: "Missing Twilio credentials" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!/^AC[0-9a-f]{32}$/i.test(accountSid)) {
      return new Response(
        JSON.stringify({ error: "Account SID must look like AC…" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (!/^SK[0-9a-f]{32}$/i.test(apiKeySid)) {
      return new Response(
        JSON.stringify({ error: "API Key SID must look like SK…" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const authHeader = basicAuth(apiKeySid, apiKeySecret);
    const baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}`;

    // 1. Confirm credentials work
    const acctRes = await fetch(`${baseUrl}.json`, {
      headers: { Authorization: authHeader },
    });
    const acctText = await acctRes.text();
    if (!acctRes.ok) {
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(acctText);
      } catch {
        // ignore
      }
      const errorMsg =
        (parsed.message as string) ??
        `Twilio rejected credentials (${acctRes.status})`;
      await admin
        .from("workspace_sms_config")
        .update({ last_error: errorMsg, verified_at: null, enabled: false })
        .eq("workspace_id", body.workspaceId);
      return new Response(JSON.stringify({ ok: false, error: errorMsg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. List incoming phone numbers (SMS-capable)
    const numsRes = await fetch(
      `${baseUrl}/IncomingPhoneNumbers.json?PageSize=100`,
      { headers: { Authorization: authHeader } },
    );
    const numsJson = (await numsRes.json()) as {
      incoming_phone_numbers?: Array<{
        phone_number: string;
        friendly_name: string;
        capabilities?: { sms?: boolean };
      }>;
    };
    const numbers = (numsJson.incoming_phone_numbers ?? [])
      .filter((n) => n.capabilities?.sms !== false)
      .map((n) => ({
        phoneNumber: n.phone_number,
        friendlyName: n.friendly_name,
      }));

    // 3. Mark verified
    await admin
      .from("workspace_sms_config")
      .update({
        verified_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("workspace_id", body.workspaceId);

    return new Response(
      JSON.stringify({ ok: true, numbers }),
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
