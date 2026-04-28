// ai-summarize-submission — generates the reviewer-facing AI summary,
// readiness score (0-100, blended per 05_AI_System/03_readiness_scoring.md),
// and the suggested next action for a submission.
//
// Two modes:
//  1) { submissionId } — reads the submission from DB and persists results.
//  2) { guideName, recipientName, shots, customerAnswers? } — pure compute,
//     used by client-side hooks that haven't synced to DB yet.
//
// Output: { summary, highlights[], readinessScore, band, nextAction, missingItems[] }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYSTEM = `You are PhotoBrief's reviewer assistant. Given a submission's photos, AI checks, and recipient answers, produce a concise reviewer summary plus a suggested next action.

Tone: clear, professional, no fluff. The reader is a busy small-business owner deciding whether to act on this submission.

Always call the summarize_submission function.`;

const TOOL = {
  type: "function",
  function: {
    name: "summarize_submission",
    description: "Summarize a submission for the reviewer.",
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string", description: "1-3 sentence reviewer summary." },
        highlights: {
          type: "array",
          items: { type: "string" },
          description: "2-4 bullet highlights.",
        },
        nextAction: { type: "string", description: "One short instruction (e.g. 'Mark as reviewed', 'Ask for more photos')." },
        missingItems: {
          type: "array",
          items: { type: "string" },
          description: "Titles of missing or unusable shots that block readiness.",
        },
      },
      required: ["summary", "highlights", "nextAction"],
      additionalProperties: false,
    },
  },
} as const;

interface ShotIn {
  title: string;
  missing?: boolean;
  feedbackSeverity?: "pass" | "warn" | "fail";
  feedbackHeadline?: string;
}

interface ComputeBody {
  guideName: string;
  recipientName?: string;
  shots: ShotIn[];
  customerAnswers?: { prompt: string; answer: string }[];
}

interface PersistBody {
  submissionId: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

  let body: ComputeBody | PersistBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  let computeInput: ComputeBody;
  let persistTo: { submissionId: string; workspaceId: string } | null = null;

  if ("submissionId" in body && body.submissionId) {
    // Mode 1: load from DB.
    const loaded = await loadSubmission(body.submissionId);
    if (!loaded) return json({ error: "Submission not found" }, 404);
    computeInput = loaded.computeInput;
    persistTo = { submissionId: body.submissionId, workspaceId: loaded.workspaceId };
  } else {
    computeInput = body as ComputeBody;
  }

  const { readinessScore, band, missingComputed } = computeReadiness(computeInput.shots);

  try {
    const userPrompt = [
      `Guide: ${computeInput.guideName}`,
      `Recipient: ${computeInput.recipientName ?? "Unknown"}`,
      `Shots (${computeInput.shots.length}):`,
      ...computeInput.shots.map((s, i) =>
        `  ${i + 1}. ${s.title} — ${s.missing ? "MISSING" : `verdict: ${s.feedbackSeverity ?? "n/a"}${s.feedbackHeadline ? ` (${s.feedbackHeadline})` : ""}`}`,
      ),
      computeInput.customerAnswers?.length
        ? `Recipient answers:\n${computeInput.customerAnswers.map((a) => `  - ${a.prompt}: ${a.answer}`).join("\n")}`
        : "Recipient answers: none",
      `Computed readiness score: ${readinessScore} (${band}).`,
      "",
      "Call summarize_submission with a reviewer summary, 2-4 highlights, and the suggested next action.",
    ].join("\n");

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
          { role: "user", content: userPrompt },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "summarize_submission" } },
      }),
    });

    if (aiRes.status === 429) return json({ error: "Rate limit reached." }, 429);
    if (aiRes.status === 402) return json({ error: "AI credits exhausted." }, 402);
    if (!aiRes.ok) {
      console.error("gateway", aiRes.status, await aiRes.text());
      return json({ error: "AI gateway error" }, 502);
    }
    const data = await aiRes.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = call ? JSON.parse(call.function.arguments) : null;
    if (!args) return json({ error: "AI returned no summary" }, 502);

    const result = {
      summary: args.summary,
      highlights: args.highlights ?? [],
      nextAction: args.nextAction,
      missingItems: args.missingItems?.length ? args.missingItems : missingComputed,
      readinessScore,
      band,
    };

    if (persistTo) {
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
      await admin
        .from("submissions")
        .update({
          ai_summary: result.summary,
          readiness_score: result.readinessScore,
          next_action: result.nextAction,
        })
        .eq("id", persistTo.submissionId);
    }

    return json(result);
  } catch (e) {
    console.error("ai-summarize-submission error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Readiness blend per 03_readiness_scoring.md: shots quality 45 / coverage 20 / details 15 / answers 15 / freshness 5.
function computeReadiness(shots: ShotIn[]) {
  const total = shots.length || 1;
  const captured = shots.filter((s) => !s.missing);
  const passes = captured.filter((s) => s.feedbackSeverity === "pass").length;
  const warns = captured.filter((s) => s.feedbackSeverity === "warn").length;
  const fails = captured.filter((s) => s.feedbackSeverity === "fail").length;

  const quality = ((passes * 1 + warns * 0.6 + fails * 0.2) / total) * 45;
  const coverage = (captured.length / total) * 20;
  const details = 15; // baseline; OCR fills this in over time
  const answers = 15; // baseline
  const freshness = 5;
  const readinessScore = Math.round(quality + coverage + details + answers + freshness);
  const band: "low" | "medium" | "high" = readinessScore >= 80 ? "high" : readinessScore >= 50 ? "medium" : "low";
  const missingComputed = shots.filter((s) => s.missing).map((s) => s.title);
  return { readinessScore: Math.min(100, Math.max(0, readinessScore)), band, missingComputed };
}

async function loadSubmission(submissionId: string) {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: sub } = await admin
    .from("submissions")
    .select(
      "id, workspace_id, submitter_name, photo_brief_requests!inner(guide_id, photo_guides(name))",
    )
    .eq("id", submissionId)
    .maybeSingle();
  if (!sub) return null;

  const [{ data: media }, { data: details }] = await Promise.all([
    admin
      .from("captured_media")
      .select("id, note, ai_feedback, status, step_id, guide_steps(title)")
      .eq("submission_id", submissionId),
    admin.from("extracted_details").select("label, value, confidence").eq("submission_id", submissionId),
  ]);

  const shots: ShotIn[] = (media ?? []).map((m: any) => ({
    title: m.guide_steps?.title ?? m.note ?? "Photo",
    missing: false,
    feedbackSeverity: m.ai_feedback?.severity ?? m.ai_feedback?.verdict,
    feedbackHeadline: m.ai_feedback?.headline,
  }));

  return {
    workspaceId: (sub as any).workspace_id,
    computeInput: {
      guideName: (sub as any).photo_brief_requests?.photo_guides?.name ?? "Submission",
      recipientName: (sub as any).submitter_name ?? "Recipient",
      shots,
      customerAnswers: [],
    },
  };
}
