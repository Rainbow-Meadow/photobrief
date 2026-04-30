// admin-ai-rerun — Platform-admin only. Re-runs a guide or summary task
// through the centralized AI router and returns the full envelope so the
// admin UI can compare a baseline run vs. an escalated (premium-tier) run.
//
// Caller must be a platform admin (row in `public.platform_admins`).
//
// Input:
//   {
//     task: "submission_summary" | "guide_generation",
//     escalate?: boolean,
//     input: {
//       // submission_summary, mode A: { submissionId }
//       submissionId?: string,
//       // submission_summary, mode B (compute-only):
//       guideName?: string,
//       recipientName?: string,
//       shots?: { title, missing?, feedbackSeverity?, feedbackHeadline?, imageUrl? }[],
//       customerAnswers?: { prompt, answer }[],
//       // guide_generation:
//       prompt?: string,
//       category?: string,
//     }
//   }
//
// Output: { tier, escalate, model, attempts, envelope, durationMs, result }
//   where `envelope` is the standardized AIEnvelope and `result` mirrors
//   what the equivalent production function would have returned.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import {
  buildEnvelopeTool,
  callAIWithRouter,
  routerErrorResponse,
  type AITask,
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

// ---------- Tools ----------

const SUMMARY_TOOL = buildEnvelopeTool({
  name: "summarize_submission",
  description: "Summarize a submission for the reviewer.",
  resultSchema: {
    type: "object",
    properties: {
      summary: { type: "string" },
      highlights: { type: "array", items: { type: "string" } },
      nextAction: { type: "string" },
      missingItems: { type: "array", items: { type: "string" } },
      extractedDetails: {
        type: "array",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            value: { type: "string" },
            type: { type: "string" },
            confidence: { type: "number" },
          },
          required: ["label", "value"],
          additionalProperties: false,
        },
      },
    },
    required: ["summary", "highlights", "nextAction", "missingItems"],
    additionalProperties: false,
  },
}) as const;

const GUIDE_TOOL = buildEnvelopeTool({
  name: "build_guide",
  description: "Return a complete request draft.",
  resultSchema: {
    type: "object",
    properties: {
      title: { type: "string" },
      category: { type: "string" },
      introMessage: { type: "string" },
      assistantReply: { type: "string" },
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

// ---------- System prompts (kept in sync with production functions) ----------

const SUMMARY_SYSTEM = `You are PhotoBrief's reviewer assistant. You receive a submission's
photos, AI quality checks, and recipient answers. You produce a concise reviewer
summary, suggested next action, the list of missing or unusable shots that block
readiness, and any structured details you can extract from the photos.

Tone: clear, professional, no fluff.

Always call summarize_submission exactly once and populate the full envelope.`;

const GUIDE_SYSTEM = `You are PhotoBrief's guide builder. Given a small-business owner's free-text
description of what they need from a customer, draft a short, friendly photo-request brief.

Rules:
- 3 to 7 photo steps, ordered logically.
- Each step has a clear title (max 6 words), one-sentence instruction, and a capture type.
- 0 to 4 short context questions (only if genuinely needed).
- Friendly intro message (1-2 sentences) the recipient reads first.

Always call build_guide and populate the full envelope.`;

// ---------- Helpers ----------

interface ShotIn {
  title: string;
  missing?: boolean;
  feedbackSeverity?: "pass" | "warn" | "fail";
  feedbackHeadline?: string;
  imageUrl?: string;
}

async function loadSubmissionForSummary(submissionId: string) {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: sub } = await admin
    .from("submissions")
    .select(
      "id, workspace_id, submitter_name, request_id, photo_brief_requests!inner(guide_id, photo_guides(name))",
    )
    .eq("id", submissionId)
    .maybeSingle();
  if (!sub) return null;

  const guideId = (sub as any).photo_brief_requests?.guide_id as string | null;

  const [{ data: media }, { data: requiredSteps }] = await Promise.all([
    admin
      .from("captured_media")
      .select("id, note, ai_feedback, status, step_id, file_url, guide_steps(title)")
      .eq("submission_id", submissionId),
    guideId
      ? admin.from("guide_steps").select("id, title, required").eq("guide_id", guideId)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const SUPABASE_PROJECT_URL = SUPABASE_URL.replace(/\/$/, "");
  const toPublicUrl = (filePath: string | null) => {
    if (!filePath) return undefined;
    if (filePath.startsWith("http")) return filePath;
    return `${SUPABASE_PROJECT_URL}/storage/v1/object/public/submission-media/${filePath}`;
  };

  const capturedStepIds = new Set<string>(
    (media ?? []).map((m: any) => m.step_id).filter(Boolean),
  );

  const capturedShots: ShotIn[] = (media ?? []).map((m: any) => ({
    title: m.guide_steps?.title ?? m.note ?? "Photo",
    missing: false,
    feedbackSeverity: m.ai_feedback?.severity ?? m.ai_feedback?.verdict,
    feedbackHeadline: m.ai_feedback?.headline,
    imageUrl: toPublicUrl(m.file_url),
  }));

  const missingShots: ShotIn[] = ((requiredSteps as any[]) ?? [])
    .filter((s) => s.required && !capturedStepIds.has(s.id))
    .map((s) => ({ title: s.title, missing: true }));

  return {
    guideName: (sub as any).photo_brief_requests?.photo_guides?.name ?? "Submission",
    recipientName: (sub as any).submitter_name ?? "Recipient",
    shots: [...capturedShots, ...missingShots],
    customerAnswers: [] as { prompt: string; answer: string }[],
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------- Handler ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

  // 1. Auth + admin gate.
  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "Sign in required." }, 401);
  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: auth } },
  });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return json({ error: "Sign in required." }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: adminRow } = await admin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", u.user.id)
    .maybeSingle();
  if (!adminRow) return json({ error: "Forbidden" }, 403);

  // 2. Parse body.
  let body: {
    task?: AITask;
    escalate?: boolean;
    input?: any;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const task = body.task;
  const escalate = !!body.escalate;
  const input = body.input ?? {};
  if (task !== "submission_summary" && task !== "guide_generation") {
    return json({ error: "task must be submission_summary or guide_generation" }, 400);
  }

  const startedAt = Date.now();

  try {
    if (task === "submission_summary") {
      // Resolve compute input either from submissionId or inline shots.
      let computeInput: {
        guideName: string;
        recipientName?: string;
        shots: ShotIn[];
        customerAnswers?: { prompt: string; answer: string }[];
      };
      if (input.submissionId) {
        const loaded = await loadSubmissionForSummary(input.submissionId);
        if (!loaded) return json({ error: "Submission not found" }, 404);
        computeInput = loaded;
      } else {
        if (!input.guideName || !Array.isArray(input.shots)) {
          return json(
            { error: "Provide submissionId, or guideName + shots[] for compute-only mode." },
            400,
          );
        }
        computeInput = {
          guideName: input.guideName,
          recipientName: input.recipientName,
          shots: input.shots,
          customerAnswers: input.customerAnswers ?? [],
        };
      }

      const userText = [
        `Guide: ${computeInput.guideName}`,
        `Recipient: ${computeInput.recipientName ?? "Unknown"}`,
        `Shots (${computeInput.shots.length}):`,
        ...computeInput.shots.map(
          (s, i) =>
            `  ${i + 1}. ${s.title} — ${
              s.missing
                ? "MISSING"
                : `verdict: ${s.feedbackSeverity ?? "n/a"}${
                    s.feedbackHeadline ? ` (${s.feedbackHeadline})` : ""
                  }`
            }`,
        ),
        computeInput.customerAnswers?.length
          ? `Recipient answers:\n${computeInput.customerAnswers
              .map((a) => `  - ${a.prompt}: ${a.answer}`)
              .join("\n")}`
          : "Recipient answers: none",
      ].join("\n");

      const imageShots = computeInput.shots
        .filter((s) => !s.missing && s.imageUrl)
        .slice(0, 8);
      const userContent: any[] = [{ type: "text", text: userText }];
      for (const s of imageShots) {
        userContent.push({ type: "image_url", image_url: { url: s.imageUrl } });
      }

      const { envelope, model, attempts } = await callAIWithRouter({
        task: "submission_summary",
        escalate,
        messages: [
          { role: "system", content: SUMMARY_SYSTEM },
          { role: "user", content: userContent },
        ],
        tools: [SUMMARY_TOOL],
        tool_choice: { type: "function", function: { name: "summarize_submission" } },
      });

      return json({
        task,
        escalate,
        tier: escalate ? "escalation" : "vision",
        model,
        attempts,
        durationMs: Date.now() - startedAt,
        envelope,
        result: envelope.result,
      });
    }

    // task === "guide_generation"
    const prompt = (input.prompt ?? "").trim();
    if (!prompt) return json({ error: "prompt is required for guide_generation" }, 400);

    const { envelope, model, attempts } = await callAIWithRouter({
      task: "guide_generation",
      escalate,
      messages: [
        { role: "system", content: GUIDE_SYSTEM },
        {
          role: "user",
          content: `Business owner says: "${prompt}"${
            input.category ? `\nLikely category: ${input.category}` : ""
          }\n\nDraft the request brief now.`,
        },
      ],
      tools: [GUIDE_TOOL],
      tool_choice: { type: "function", function: { name: "build_guide" } },
    });

    return json({
      task,
      escalate,
      tier: escalate ? "escalation" : "default",
      model,
      attempts,
      durationMs: Date.now() - startedAt,
      envelope,
      result: envelope.result,
    });
  } catch (e) {
    const mapped = routerErrorResponse(e, corsHeaders);
    if (mapped) return mapped;
    console.error("admin-ai-rerun error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
