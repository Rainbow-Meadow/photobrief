// Public endpoint: insert a row into waitlist_entries.
// JWT verification is off (anon visitors submit this).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  name?: string;
  business_name?: string;
  email?: string;
  business_type?: string;
  website?: string;
  use_case?: string;
  estimated_monthly_requests?: string;
  notes?: string;
  source?: string;
}

function clean(v: unknown, max = 500): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const name = clean(body.name, 200);
  const email = clean(body.email, 254)?.toLowerCase() ?? null;
  if (!name || !email || !isEmail(email)) {
    return new Response(JSON.stringify({ error: "invalid_input" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Dedupe: friendly response if already on the list.
  const { data: existing } = await admin
    .from("waitlist_entries")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return new Response(JSON.stringify({ ok: true, already: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const insertPayload = {
    name,
    email,
    business_name: clean(body.business_name, 200),
    business_type: clean(body.business_type, 100),
    website: clean(body.website, 300),
    use_case: clean(body.use_case, 1000),
    estimated_monthly_requests: clean(body.estimated_monthly_requests, 50),
    notes: clean(body.notes, 2000),
    source: clean(body.source, 50) ?? "web",
  };

  const { data: inserted, error } = await admin
    .from("waitlist_entries")
    .insert(insertPayload)
    .select("id, created_at")
    .single();

  if (error) {
    // Unique violation race
    if ((error as { code?: string }).code === "23505") {
      return new Response(JSON.stringify({ ok: true, already: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("waitlist-submit insert failed", error);
    return new Response(JSON.stringify({ error: "insert_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fire-and-forget transactional emails. Email failures must NOT fail the
  // waitlist submission — the user is already on the list at this point.
  const entryId = inserted?.id;
  const createdAt = inserted?.created_at
    ? new Date(inserted.created_at).toISOString()
    : new Date().toISOString();
  const ADMIN_EMAIL = "hello@rainbow-meadow.org";

  try {
    await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: "waitlist-confirmation",
        recipientEmail: email,
        idempotencyKey: `waitlist-confirm-${entryId ?? email}`,
        templateData: { name },
      },
    });
  } catch (e) {
    console.error("waitlist-submit: confirmation email failed", e);
  }

  try {
    await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: "waitlist-admin-notification",
        recipientEmail: ADMIN_EMAIL,
        idempotencyKey: `waitlist-admin-${entryId ?? email}`,
        templateData: {
          ...insertPayload,
          created_at: createdAt,
        },
      },
    });
  } catch (e) {
    console.error("waitlist-submit: admin email failed", e);
  }

  return new Response(JSON.stringify({ ok: true, already: false }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
