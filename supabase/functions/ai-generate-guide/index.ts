// ai-generate-guide — Pro-gated AI guide / request scaffolding from
// a free-text business prompt. Powers the AI Request Builder and the
// Guide Generator UI.
//
// Input: { prompt: string, category?: string }
// Output: { draft: RequestDraft-ish, assistantReply: string }
//
// Plan gating: requires the caller's workspace to be on Pro+ tier.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import {
  buildEnvelopeTool,
  callAIWithRouter,
  routerErrorResponse,
} from "../_shared/aiModelRouter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const PRO_TIERS = new Set(["pro", "team", "business"]);

const SYSTEM = `You are PhotoBrief's guide builder. Given a small-business owner's free-text description of what they need from a customer, draft a short, friendly photo-request brief.

Rules:
- 3 to 7 photo steps, ordered logically (overview → detail → labels/serials → context).
- Each step has a clear title (max 6 words), one-sentence instruction in plain English, and a capture type (photo|video|document).
- 0 to 4 short context questions (only if genuinely needed; never pad).
- Friendly intro message (1-2 sentences) the recipient reads first.
- Match the tone the business would use: warm, simple, no jargon.

Always call build_guide and populate the full envelope:
  result.title, result.category, result.introMessage,
  result.assistantReply, result.steps[], result.questions[]
  confidence (0..1), flags[] (e.g. low_confidence, ambiguous_request),
  recipient_feedback (null — this task is for the business owner),
  business_summary (one short sentence describing the drafted brief),
  missing_items[] (empty for this task),
  suggested_next_action (e.g. "Review draft and send").`;

const TOOL = buildEnvelopeTool({
  name: "build_guide",
  description: "Return a complete request draft.",
  resultSchema: {
    type: "object",
    properties: {
      title: { type: "string" },
      category: { type: "string" },
      introMessage: { type: "string" },
      assistantReply: { type: "string", description: "Friendly chat reply describing what was drafted." },
      steps: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            instruction: { type: "string" },
            captureType: { type: "string", enum: ["photo", "video", "document"] },
            required: { type: "boolean" },
          },
          required: ["title", "instruction", "captureType"],
          additionalProperties: false,
        },
      },
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            prompt: { type: "string" },
            inputType: {
              type: "string",
              enum: ["short_text", "long_text", "single_select", "multi_select", "yes_no", "number"],
            },
            options: { type: "array", items: { type: "string" } },
            required: { type: "boolean" },
          },
          required: ["prompt", "inputType"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "introMessage", "steps", "assistantReply"],
    additionalProperties: false,
  },
}) as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

  let body: { prompt?: string; category?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const prompt = (body?.prompt ?? "").trim();
  if (!prompt) return json({ error: "prompt is required" }, 400);

  // Plan gate.
  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "Sign in required." }, 401);
  const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return json({ error: "Sign in required." }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: ws } = await admin
    .from("workspace_members")
    .select("workspace_id, business_workspaces!inner(plan_tier)")
    .eq("user_id", u.user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  const tier = (ws as any)?.business_workspaces?.plan_tier;
  if (!tier || !PRO_TIERS.has(tier)) {
    return json(
      { error: "AI guide generation requires the Pro plan or higher.", requiredPlan: "pro" },
      402,
    );
  }

  try {
    const { envelope, model, attempts } = await callAIWithRouter({
      task: "guide_generation",
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Business owner says: "${prompt}"${body.category ? `\nLikely category: ${body.category}` : ""}\n\nDraft the request brief now.`,
        },
      ],
      tools: [TOOL],
      tool_choice: { type: "function", function: { name: "build_guide" } },
    });

    const args = (envelope.result ?? {}) as any;
    if (!args.title) return json({ error: "AI returned no draft" }, 502);

    return json({
      draft: {
        title: args.title,
        category: args.category ?? "Custom",
        introMessage: args.introMessage,
        steps: (args.steps ?? []).map((s: any, i: number) => ({
          orderIndex: i,
          title: s.title,
          instructions: s.instruction,
          shotType: s.captureType ?? "photo",
          required: s.required ?? true,
          aiChecks: [],
        })),
        questions: (args.questions ?? []).map((q: any, i: number) => ({
          orderIndex: i,
          prompt: q.prompt,
          inputType: q.inputType ?? "short_text",
          options: q.options,
          required: q.required ?? false,
        })),
      },
      assistantReply: args.assistantReply ?? `Drafted "${args.title}".`,
      // Envelope-level fields:
      confidence: envelope.confidence,
      flags: envelope.flags,
      businessSummary: envelope.business_summary,
      suggestedNextAction: envelope.suggested_next_action,
      model,
      attempts,
    });
  } catch (e) {
    const mapped = routerErrorResponse(e, corsHeaders);
    if (mapped) return mapped;
    console.error("ai-generate-guide error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
