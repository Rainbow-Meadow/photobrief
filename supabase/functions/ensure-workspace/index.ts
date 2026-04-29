// Fallback workspace provisioner.
//
// Normally `handle_new_user` creates a workspace + brand_profile + sub +
// profile row at signup. If that trigger ever skipped (e.g. a partial
// failure during a Cloud restart, or an old account predating the
// trigger), the user is stuck on /onboarding because `default_workspace_id`
// is null and the page can't update a non-existent workspace.
//
// This function runs server-side with the service role, idempotently
// ensuring all four rows exist for the calling user, then returns the
// workspace id. The client calls it from /onboarding when it detects a
// missing workspace.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !serviceKey || !anonKey) {
    return json({ error: "Server not configured" }, 500);
  }

  // Identify caller from their JWT.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Missing auth token" }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user) {
    return json({ error: "Invalid auth token" }, 401);
  }
  const user = userData.user;

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const displayName =
      (user.user_metadata?.name as string | undefined) ||
      (user.user_metadata?.full_name as string | undefined) ||
      (user.email ? user.email.split("@")[0] : "User");

    // 1. Profile — read existing row; insert if missing. Avoid upsert because
    //    PostgREST's onConflict requires a matching unique constraint name and
    //    can fail silently with the service-role client.
    const { data: existingProfile, error: profReadErr } = await admin
      .from("profiles")
      .select("id, default_workspace_id")
      .eq("id", user.id)
      .maybeSingle();
    if (profReadErr) throw profReadErr;

    let profile = existingProfile;
    if (!profile) {
      const { data: inserted, error: profInsErr } = await admin
        .from("profiles")
        .insert({ id: user.id, email: user.email ?? null, name: displayName })
        .select("id, default_workspace_id")
        .maybeSingle();
      if (profInsErr) throw profInsErr;
      profile = inserted;
    }

    let workspaceId = profile?.default_workspace_id ?? null;

    // 2. Reuse an existing owned workspace if the profile pointer is missing.
    if (!workspaceId) {
      const { data: ownedWs } = await admin
        .from("business_workspaces")
        .select("id")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (ownedWs?.id) workspaceId = ownedWs.id;
    }

    // 3. Otherwise create a fresh workspace.
    if (!workspaceId) {
      const { data: ws, error: wsErr } = await admin
        .from("business_workspaces")
        .insert({
          name: `${displayName}'s workspace`,
          owner_id: user.id,
          plan_tier: "free",
        })
        .select("id")
        .single();
      if (wsErr) throw wsErr;
      workspaceId = ws.id;
    }

    // 4. Owner membership row.
    const { data: existingMember } = await admin
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!existingMember) {
      await admin.from("workspace_members").insert({
        workspace_id: workspaceId,
        user_id: user.id,
        role: "owner",
        status: "active",
      });
    }

    // 5. Brand profile.
    const { data: existingBrand } = await admin
      .from("brand_profiles")
      .select("id")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (!existingBrand) {
      await admin.from("brand_profiles").insert({
        workspace_id: workspaceId,
        intro_message: "Hi! Help us help you — a few quick photos.",
        completion_message: "Thanks! We've got everything we need.",
      });
    }

    // 6. Subscription row.
    const { data: existingSub } = await admin
      .from("subscriptions")
      .select("id")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (!existingSub) {
      await admin.from("subscriptions").insert({
        workspace_id: workspaceId,
        plan_tier: "free",
        status: "active",
      });
    }

    // 7. Point profile at this workspace.
    if (profile?.default_workspace_id !== workspaceId) {
      await admin
        .from("profiles")
        .update({ default_workspace_id: workspaceId })
        .eq("id", user.id);
    }

    return json({ workspace_id: workspaceId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("ensure-workspace failed:", message);
    return json({ error: message }, 500);
  }
});
