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

const transientCodes = new Set(["PGRST001", "PGRST002", "503", "57P03", "08000", "08001", "08006"]);

function isTransientDatabaseError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string; status?: number };
  const msg = e.message ?? "";
  return (
    e.status === 503 ||
    transientCodes.has(e.code ?? "") ||
    msg.includes("schema cache") ||
    msg.includes("Database client error") ||
    msg.includes("temporarily unavailable") ||
    msg.includes("timeout") ||
    msg.includes("Connection terminated")
  );
}

async function withDatabaseRetry<T extends { error?: unknown }>(operation: () => PromiseLike<T>, maxAttempts = 7): Promise<T> {
  let result = await operation();
  for (let attempt = 1; result.error && isTransientDatabaseError(result.error) && attempt < maxAttempts; attempt++) {
    const delay = Math.min(4000, 300 * 2 ** (attempt - 1)) + Math.floor(Math.random() * 150);
    await new Promise((resolve) => setTimeout(resolve, delay));
    result = await operation();
  }
  return result;
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
    const { data: existingProfile, error: profReadErr } = await withDatabaseRetry(() =>
      admin
        .from("profiles")
        .select("id, default_workspace_id")
        .eq("id", user.id)
        .maybeSingle(),
    );
    if (profReadErr) throw profReadErr;

    let profile = existingProfile;
    if (!profile) {
      const { data: inserted, error: profInsErr } = await withDatabaseRetry(() =>
        admin
          .from("profiles")
          .insert({ id: user.id, email: user.email ?? null, name: displayName })
          .select("id, default_workspace_id")
          .maybeSingle(),
      );
      if (profInsErr) throw profInsErr;
      profile = inserted;
    }

    let workspaceId = profile?.default_workspace_id ?? null;

    // 2. Reuse an existing owned workspace if the profile pointer is missing.
    if (!workspaceId) {
      const { data: ownedWs, error: ownedWsErr } = await withDatabaseRetry(() =>
        admin
          .from("business_workspaces")
          .select("id")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
      );
      if (ownedWsErr) throw ownedWsErr;
      if (ownedWs?.id) workspaceId = ownedWs.id;
    }

    // 3. Otherwise create a fresh workspace.
    if (!workspaceId) {
      const { data: ws, error: wsErr } = await withDatabaseRetry(() =>
        admin
          .from("business_workspaces")
          .insert({
            name: `${displayName}'s workspace`,
            owner_id: user.id,
            plan_tier: "free",
          })
          .select("id")
          .single(),
      );
      if (wsErr) throw wsErr;
      workspaceId = ws.id;
    }

    // 4. Owner membership row.
    const { data: existingMember, error: existingMemberErr } = await withDatabaseRetry(() =>
      admin
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .maybeSingle(),
    );
    if (existingMemberErr) throw existingMemberErr;
    if (!existingMember) {
      const { error: memberInsErr } = await withDatabaseRetry(() =>
        admin.from("workspace_members").insert({
          workspace_id: workspaceId,
          user_id: user.id,
          role: "owner",
          status: "active",
        }),
      );
      if (memberInsErr) throw memberInsErr;
    }

    // 5. Brand profile.
    const { data: existingBrand, error: existingBrandErr } = await withDatabaseRetry(() =>
      admin
        .from("brand_profiles")
        .select("id")
        .eq("workspace_id", workspaceId)
        .maybeSingle(),
    );
    if (existingBrandErr) throw existingBrandErr;
    if (!existingBrand) {
      const { error: brandInsErr } = await withDatabaseRetry(() =>
        admin.from("brand_profiles").insert({
          workspace_id: workspaceId,
          intro_message: "Hi! Help us help you — a few quick photos.",
          completion_message: "Thanks! We've got everything we need.",
        }),
      );
      if (brandInsErr) throw brandInsErr;
    }

    // 6. Subscription row.
    const { data: existingSub, error: existingSubErr } = await withDatabaseRetry(() =>
      admin
        .from("subscriptions")
        .select("id")
        .eq("workspace_id", workspaceId)
        .maybeSingle(),
    );
    if (existingSubErr) throw existingSubErr;
    if (!existingSub) {
      const { error: subInsErr } = await withDatabaseRetry(() =>
        admin.from("subscriptions").insert({
          workspace_id: workspaceId,
          plan_tier: "free",
          status: "active",
        }),
      );
      if (subInsErr) throw subInsErr;
    }

    // 7. Point profile at this workspace.
    if (profile?.default_workspace_id !== workspaceId) {
      const { error: profileUpdateErr } = await withDatabaseRetry(() =>
        admin
          .from("profiles")
          .update({ default_workspace_id: workspaceId })
          .eq("id", user.id),
      );
      if (profileUpdateErr) throw profileUpdateErr;
    }

    return json({ workspace_id: workspaceId });
  } catch (err) {
    // Surface the real error: Supabase PostgrestError objects don't extend
    // Error, so `err.message` is undefined and we'd log "Unknown error".
    const e = err as { message?: string; code?: string; details?: string; hint?: string };
    const message =
      e?.message ||
      e?.details ||
      e?.hint ||
      (typeof err === "string" ? err : JSON.stringify(err));
    console.error("ensure-workspace failed:", message, "code:", e?.code, "raw:", err);
    return json({ error: message, code: e?.code ?? null }, 500);
  }
});
