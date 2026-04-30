// Public endpoint: validate a beta invite token without revealing other invites.
// Returns { valid, reason, email?, business_name? }.
// JWT verification off; safe because we only return invite-bound metadata.
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

  let token: string | undefined;
  try {
    const body = await req.json();
    token = typeof body?.token === "string" ? body.token.trim() : undefined;
  } catch {
    /* fallthrough */
  }

  if (!token || token.length < 16 || token.length > 200) {
    return new Response(
      JSON.stringify({ valid: false, reason: "not_found" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const hash = await sha256(token);
  const { data: invite } = await admin
    .from("beta_invites")
    .select("email, business_name, status, expires_at")
    .eq("token_hash", hash)
    .maybeSingle();

  if (!invite) {
    return new Response(
      JSON.stringify({ valid: false, reason: "not_found" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (invite.status === "revoked") {
    return new Response(
      JSON.stringify({ valid: false, reason: "revoked" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (invite.status === "accepted") {
    return new Response(
      JSON.stringify({ valid: false, reason: "accepted" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return new Response(
      JSON.stringify({ valid: false, reason: "expired" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      valid: true,
      reason: "ok",
      email: invite.email,
      business_name: invite.business_name,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
