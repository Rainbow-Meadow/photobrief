// Invite a teammate to the workspace.
// Body: { workspaceId, email, role? }
// Creates a workspace_invites row (admin-only via RLS, enforced server-side too)
// and emails the invite link if Resend is configured.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = Deno.env.get("APP_PUBLIC_URL") ?? "https://photobrief.app";

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

    const { workspaceId, email, role } = (await req.json()) as {
      workspaceId: string;
      email: string;
      role?: "admin" | "member";
    };

    if (!workspaceId || !email) {
      return new Response(JSON.stringify({ error: "workspaceId and email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is admin
    const { data: isAdmin } = await userClient.rpc("has_workspace_role", {
      _workspace_id: workspaceId,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Plan-aware seat cap (counts active members + pending invites)
    const { data: ws } = await admin
      .from("business_workspaces")
      .select("plan_tier, name")
      .eq("id", workspaceId)
      .maybeSingle();
    const seatCaps: Record<string, number> = {
      free: 1, starter: 1, pro: 3, team: 10, business: 25,
    };
    const cap = seatCaps[ws?.plan_tier ?? "free"] ?? 1;
    const { count: activeCount } = await admin
      .from("workspace_members")
      .select("id", { head: true, count: "exact" })
      .eq("workspace_id", workspaceId)
      .eq("status", "active");
    const { count: pendingCount } = await admin
      .from("workspace_invites")
      .select("id", { head: true, count: "exact" })
      .eq("workspace_id", workspaceId)
      .eq("status", "pending");
    if ((activeCount ?? 0) + (pendingCount ?? 0) >= cap) {
      return new Response(
        JSON.stringify({
          error: "PLAN_SEAT_LIMIT_REACHED",
          requiredPlan: cap < 3 ? "pro" : cap < 10 ? "team" : "business",
          cap,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: invite, error: invErr } = await admin
      .from("workspace_invites")
      .upsert(
        {
          workspace_id: workspaceId,
          email: email.toLowerCase(),
          role: role ?? "member",
          invited_by: userData.user.id,
          status: "pending",
          expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        },
        { onConflict: "workspace_id,email" },
      )
      .select("token")
      .maybeSingle();

    if (invErr || !invite) {
      return new Response(JSON.stringify({ error: invErr?.message ?? "Invite failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const acceptUrl = `${APP_URL}/invite/${invite.token}`;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    let delivery: "sent" | "logged_only" = "logged_only";
    if (resendKey) {
      try {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "PhotoBrief <onboarding@resend.dev>",
            to: [email],
            subject: `You've been invited to ${ws?.name ?? "a workspace"} on PhotoBrief`,
            text: `You've been invited to join ${ws?.name ?? "a workspace"} on PhotoBrief. Accept here: ${acceptUrl}`,
          }),
        });
        if (r.ok) delivery = "sent";
      } catch { /* swallow */ }
    }

    return new Response(JSON.stringify({ ok: true, acceptUrl, delivery }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
