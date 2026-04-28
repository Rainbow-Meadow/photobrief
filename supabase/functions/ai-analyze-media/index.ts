// ai-analyze-media — runs Lovable AI vision checks on a single captured photo.
// Contract: 05_AI_System/02_prompt_contracts.md (ai-check-photo).
//
// Input:
//  { stepId, stepTitle, instruction, captureType, overlayType,
//    aiChecks: string[], imageUrl, recipientNote?, capturedMediaId? }
//
// Output:
//  { verdict: "pass"|"warn"|"fail",
//    headline: string, detail?: string,
//    checks: [{ type, severity, label, message }],
//    extractedDetails: [{ label, value, confidence }] }
//
// If `capturedMediaId` is provided AND the caller is authenticated as a
// workspace member of the submission's workspace, the result is also
// persisted to ai_check_results + captured_media.ai_feedback.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-request-token",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYSTEM = `You are PhotoBrief's image-quality reviewer. You judge whether a single recipient-submitted photo is usable for a small-business workflow (quotes, claims, intake, support).

Reply ONLY by calling the analyze_photo function. Be specific, kind, and actionable. Severity guidance:
- "pass": photo clearly satisfies the step's intent and quality is acceptable.
- "warn": usable but a better retake would help (slight blur, glare, framing).
- "fail": not usable for this step (wrong subject, too dark, blurry, missing key element).

Per-check messages should be one short sentence the recipient could act on.`;

const TOOL = {
  type: "function",
  function: {
    name: "analyze_photo",
    description: "Return per-check verdicts and reviewer feedback for one photo.",
    parameters: {
      type: "object",
      properties: {
        verdict: { type: "string", enum: ["pass", "warn", "fail"] },
        headline: { type: "string", description: "Short reviewer headline (max 60 chars)." },
        detail: { type: "string", description: "Optional 1-sentence detail." },
        checks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string" },
              severity: { type: "string", enum: ["pass", "warn", "fail"] },
              message: { type: "string" },
            },
            required: ["type", "severity", "message"],
            additionalProperties: false,
          },
        },
        extractedDetails: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              value: { type: "string" },
              confidence: { type: "number" },
            },
            required: ["label", "value"],
            additionalProperties: false,
          },
        },
      },
      required: ["verdict", "headline", "checks"],
      additionalProperties: false,
    },
  },
} as const;

interface Body {
  stepId?: string;
  stepTitle: string;
  instruction?: string;
  captureType?: string;
  overlayType?: string;
  aiChecks?: string[];
  imageUrl: string;
  recipientNote?: string;
  capturedMediaId?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!LOVABLE_API_KEY) {
    return json({ error: "LOVABLE_API_KEY not configured" }, 500);
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!body?.imageUrl || !body?.stepTitle) {
    return json({ error: "imageUrl and stepTitle are required" }, 400);
  }

  const userPrompt = [
    `Step: ${body.stepTitle}`,
    body.instruction ? `Instruction to recipient: ${body.instruction}` : null,
    body.captureType ? `Expected capture type: ${body.captureType}` : null,
    body.overlayType ? `Framing overlay shown: ${body.overlayType}` : null,
    body.aiChecks?.length ? `AI checks to evaluate: ${body.aiChecks.join(", ")}` : null,
    body.recipientNote ? `Recipient note: ${body.recipientNote}` : null,
    "",
    "Evaluate the photo and call analyze_photo.",
  ].filter(Boolean).join("\n");

  try {
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: body.imageUrl } },
            ],
          },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "analyze_photo" } },
      }),
    });

    if (aiRes.status === 429) return json({ error: "Rate limit reached. Try again in a moment." }, 429);
    if (aiRes.status === 402) return json({ error: "AI credits exhausted. Add credits in Settings." }, 402);
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI gateway error", aiRes.status, t);
      return json({ error: "AI gateway error" }, 502);
    }

    const data = await aiRes.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = call ? JSON.parse(call.function.arguments) : null;
    if (!args) return json({ error: "AI returned no analysis" }, 502);

    // Add labels for each check using the requested aiChecks list as fallback.
    const enrichedChecks = (args.checks ?? []).map((c: any) => ({
      type: c.type,
      severity: c.severity,
      label: c.label ?? prettyLabel(c.type),
      message: c.message,
    }));
    const result = {
      verdict: args.verdict ?? "pass",
      headline: args.headline ?? "Photo received",
      detail: args.detail,
      checks: enrichedChecks,
      extractedDetails: args.extractedDetails ?? [],
    };

    // Optional persistence (only if caller is an authed workspace member).
    if (body.capturedMediaId) {
      try {
        await persist(req, body.capturedMediaId, result);
      } catch (e) {
        console.warn("persist failed (non-fatal)", e);
      }
    }

    return json(result, 200);
  } catch (e) {
    console.error("ai-analyze-media error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function prettyLabel(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function persist(req: Request, capturedMediaId: string, result: any) {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Look up media + the request_id behind its submission.
  const { data: media } = await admin
    .from("captured_media")
    .select("id, submission_id, submissions!inner(workspace_id, request_id)")
    .eq("id", capturedMediaId)
    .maybeSingle();
  if (!media) return;
  const submission: any = (media as any).submissions;
  const workspaceId = submission?.workspace_id;
  const requestId = submission?.request_id;

  // Authorize: either an authenticated workspace member, OR an anon
  // recipient whose x-request-token header resolves to the same request.
  let authorized = false;

  const auth = req.headers.get("Authorization");
  if (auth) {
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (u?.user) {
      const { data: member } = await admin
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", u.user.id)
        .eq("status", "active")
        .maybeSingle();
      if (member) authorized = true;
    }
  }

  if (!authorized) {
    const token = req.headers.get("x-request-token");
    if (token && requestId) {
      const { data: tokReq } = await admin
        .from("photo_brief_requests")
        .select("id")
        .eq("token", token)
        .eq("id", requestId)
        .maybeSingle();
      if (tokReq) authorized = true;
    }
  }

  if (!authorized) return;

  await admin
    .from("captured_media")
    .update({ ai_feedback: result, status: result.verdict === "fail" ? "needs_retake" : "approved" })
    .eq("id", capturedMediaId);

  if (Array.isArray(result.checks)) {
    const rows = result.checks.map((c: any) => ({
      captured_media_id: capturedMediaId,
      check_type: c.type,
      passed: c.severity === "pass",
      score: c.severity === "pass" ? 1 : c.severity === "warn" ? 0.6 : 0.2,
      message: c.message,
    }));
    if (rows.length) await admin.from("ai_check_results").insert(rows);
  }
}
