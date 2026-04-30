// Admin-only management for beta invites and waitlist entries.
// Requires the caller to be in `platform_admins`.
//
// Actions (POST { action, ... }):
//  - "create_invite"        { email, business_name?, notes?, waitlist_id? }
//  - "revoke_invite"        { invite_id }
//  - "resend_invite"        { invite_id }  (rotates token, returns new link)
//  - "set_waitlist_status"  { waitlist_id, status }
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: claims, error: claimsErr } =
    await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (claimsErr || !claims?.claims) return json({ error: "unauthorized" }, 401);
  const userId = claims.claims.sub as string;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: adminRow } = await admin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!adminRow) return json({ error: "forbidden" }, 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const action = body.action as string | undefined;

  switch (action) {
    case "create_invite": {
      const email = String(body.email ?? "").trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json({ error: "invalid_email" }, 400);
      }
      const business_name = body.business_name ? String(body.business_name).slice(0, 200) : null;
      const notes = body.notes ? String(body.notes).slice(0, 2000) : null;
      const waitlist_id = body.waitlist_id ? String(body.waitlist_id) : null;

      // Revoke any pending invite for this email so the unique partial index passes.
      await admin
        .from("beta_invites")
        .update({ status: "revoked" })
        .eq("email", email)
        .eq("status", "pending");

      const rawToken = generateToken();
      const token_hash = await sha256(rawToken);
      const token_prefix = rawToken.slice(0, 8);

      const { data: invite, error } = await admin
        .from("beta_invites")
        .insert({
          email,
          business_name,
          notes,
          token_hash,
          token_prefix,
          invited_by: userId,
        })
        .select("id, email, business_name, status, expires_at, token_prefix, created_at")
        .single();

      if (error) {
        console.error("create_invite error", error);
        return json({ error: "insert_failed" }, 500);
      }

      if (waitlist_id) {
        await admin
          .from("waitlist_entries")
          .update({ status: "invited" })
          .eq("id", waitlist_id);
      }

      return json({ ok: true, invite, raw_token: rawToken });
    }

    case "revoke_invite": {
      const invite_id = String(body.invite_id ?? "");
      if (!invite_id) return json({ error: "missing_id" }, 400);
      const { error } = await admin
        .from("beta_invites")
        .update({ status: "revoked" })
        .eq("id", invite_id);
      if (error) return json({ error: "update_failed" }, 500);
      return json({ ok: true });
    }

    case "resend_invite": {
      const invite_id = String(body.invite_id ?? "");
      if (!invite_id) return json({ error: "missing_id" }, 400);
      const rawToken = generateToken();
      const token_hash = await sha256(rawToken);
      const token_prefix = rawToken.slice(0, 8);
      const { data: invite, error } = await admin
        .from("beta_invites")
        .update({
          token_hash,
          token_prefix,
          status: "pending",
          expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          accepted_at: null,
        })
        .eq("id", invite_id)
        .select("id, email, business_name, status, expires_at, token_prefix")
        .single();
      if (error || !invite) return json({ error: "update_failed" }, 500);
      return json({ ok: true, invite, raw_token: rawToken });
    }

    case "set_waitlist_status": {
      const waitlist_id = String(body.waitlist_id ?? "");
      const status = String(body.status ?? "");
      if (!waitlist_id) return json({ error: "missing_id" }, 400);
      if (!["new", "reviewed", "invited", "rejected", "contacted"].includes(status)) {
        return json({ error: "invalid_status" }, 400);
      }
      const { error } = await admin
        .from("waitlist_entries")
        .update({ status })
        .eq("id", waitlist_id);
      if (error) return json({ error: "update_failed" }, 500);
      return json({ ok: true });
    }

    default:
      return json({ error: "unknown_action" }, 400);
  }
});
