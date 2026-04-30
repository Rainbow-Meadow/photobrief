// Mark a beta invite as accepted. Called from the signup page after auth.signUp.
// Requires the caller's session JWT in the Authorization header so we can
// verify they are the user the invite was issued to.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let token: string | undefined;
  try {
    const body = await req.json();
    token = typeof body?.token === "string" ? body.token.trim() : undefined;
  } catch {
    /* noop */
  }

  if (!token) {
    return new Response(JSON.stringify({ error: "missing_token" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: claims, error: claimsErr } =
    await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (claimsErr || !claims?.claims) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userEmail = (claims.claims.email as string | undefined)?.toLowerCase();
  if (!userEmail) {
    return new Response(JSON.stringify({ error: "no_email" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const hash = await sha256(token);

  const { data: invite } = await admin
    .from("beta_invites")
    .select("id, email, status, expires_at")
    .eq("token_hash", hash)
    .maybeSingle();

  if (!invite) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (invite.email.toLowerCase() !== userEmail) {
    return new Response(JSON.stringify({ error: "email_mismatch" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (invite.status === "accepted") {
    // Idempotent.
    return new Response(JSON.stringify({ ok: true, already: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (invite.status === "revoked") {
    return new Response(JSON.stringify({ error: "revoked" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return new Response(JSON.stringify({ error: "expired" }), {
      status: 410,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { error: updateErr } = await admin
    .from("beta_invites")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  if (updateErr) {
    console.error("invite-accept update failed", updateErr);
    return new Response(JSON.stringify({ error: "update_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, already: false }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
