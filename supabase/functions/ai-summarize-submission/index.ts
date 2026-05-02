// ai-summarize-submission — generates the reviewer-facing AI summary,
// readiness score, suggested next action, missing items, and extracted
// details for a submission.
//
// Authorization happens BEFORE model calls. Public recipient traffic must
// include x-request-token tied to the submission's request; workspace traffic
// must be an active member of the submission workspace.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import {
  buildEnvelopeTool,
  callAIWithRouter,
  routerErrorResponse,
  AIUnavailableError,
} from "../_shared/aiModelRouter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-request-token",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const SYSTEM = `You are PhotoBrief's reviewer assistant. You receive a submission's
photos, AI quality checks, and recipient answers. You produce a concise reviewer
summary, suggested next action, the list of missing or unusable shots that block
readiness, and any structured details you can extract from the photos
(model numbers, serial numbers, dimensions, addresses, brand/make, dates, etc.).

Tone: clear, professional, no fluff. The reader is a busy small-business owner
deciding whether to act on this submission. Look at the photos provided and only
extract details you can actually see — never invent values.

Always call summarize_submission exactly once and populate the full envelope:
  result.summary, result.highlights[], result.nextAction,
  result.missingItems[], result.extractedDetails[]
  confidence (0..1), flags[] (e.g. low_confidence, photos_unclear),
  recipient_feedback (one short kind sentence — null if N/A),
  business_summary (one short sentence for the business owner),
  missing_items[] (mirror of result.missingItems for envelope-level consumers),
  suggested_next_action (e.g. "Mark reviewed", "Ask for retakes").`;

const TOOL = buildEnvelopeTool({
  name: "summarize_submission",
  description: "Summarize a submission for the reviewer.",
  resultSchema: {
    type: "object",
    properties: {
      summary: { type: "string", description: "1-3 sentence reviewer summary." },
      highlights: {
        type: "array",
        items: { type: "string" },
        description: "2-4 short bullet highlights.",
      },
      nextAction: {
        type: "string",
        description: "One short instruction (e.g. 'Mark as reviewed', 'Ask for more photos').",
      },
      missingItems: {
        type: "array",
        items: { type: "string" },
        description: "Titles of required shots that are missing OR present but unusable.",
      },
      extractedDetails: {
        type: "array",
        description:
          "Structured details visible in the photos (model #, serial, dimensions, address, brand, date, etc.). Only include details you can directly observe.",
        items: {
          type: "object",
          properties: {
            label: { type: "string", description: "Human label, e.g. 'Model number'." },
            value: { type: "string", description: "The observed value." },
            type: {
              type: "string",
              description: "Optional category: model, serial, dimension, address, brand, date, other.",
            },
            confidence: { type: "number", description: "0-1 confidence based on legibility." },
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

interface ShotIn {
  title: string;
  missing?: boolean;
  feedbackSeverity?: "pass" | "warn" | "fail";
  feedbackHeadline?: string;
  imageUrl?: string;
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

interface ExtractedDetailOut {
  label: string;
  value: string;
  type?: string;
  confidence?: number;
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
    const loaded = await loadSubmission(body.submissionId);
    if (!loaded) return json({ error: "Submission not found" }, 404);

    const authorized = await isAuthorizedForWorkspaceOrRequest(
      req,
      loaded.workspaceId,
      loaded.requestId,
    );
    if (!authorized) return json({ error: "Not authorized for this submission" }, 403);

    computeInput = loaded.computeInput;
    persistTo = { submissionId: body.submissionId, workspaceId: loaded.workspaceId };
  } else {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Authentication required" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data } = await userClient.auth.getUser();
    if (!data?.user) return json({ error: "Invalid auth token" }, 401);
    computeInput = body as ComputeBody;
  }

  const { readinessScore, band, missingComputed } = computeReadiness(computeInput.shots);

  try {
    const userText = [
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
      "Use the photos below to write the summary, list missing/unusable shots, and extract any visible structured details. Then call summarize_submission.",
    ].join("\n");

    const imageShots = computeInput.shots
      .filter((s) => !s.missing && s.imageUrl)
      .slice(0, 8);
    const userContent: any[] = [{ type: "text", text: userText }];
    for (const s of imageShots) {
      userContent.push({ type: "image_url", image_url: { url: s.imageUrl } });
    }

    const messages = [
      { role: "system", content: SYSTEM },
      { role: "user", content: userContent },
    ];

    let routerResult;
    try {
      routerResult = await callAIWithRouter({
        task: "submission_summary",
        messages,
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "summarize_submission" } },
      });
    } catch (e) {
      const mapped = routerErrorResponse(e, corsHeaders);
      if (mapped) return mapped;
      throw e;
    }

    const lowConf =
      routerResult.envelope.confidence < 0.5 ||
      routerResult.envelope.flags.includes("low_confidence");
    if (lowConf) {
      try {
        const escalated = await callAIWithRouter({
          task: "submission_summary",
          escalate: true,
          messages,
          tools: [TOOL],
          tool_choice: { type: "function", function: { name: "summarize_submission" } },
        });
        if (escalated.envelope.confidence > routerResult.envelope.confidence) {
          routerResult = escalated;
        }
      } catch (e) {
        if (!(e instanceof AIUnavailableError)) console.warn("escalation retry failed", e);
      }
    }

    const { envelope, model, attempts } = routerResult;
    const inner = (envelope.result ?? {}) as {
      summary?: string;
      highlights?: string[];
      nextAction?: string;
      missingItems?: string[];
      extractedDetails?: ExtractedDetailOut[];
    };

    const extractedDetails: ExtractedDetailOut[] = Array.isArray(inner.extractedDetails)
      ? inner.extractedDetails
      : [];
    const missingItems: string[] = inner.missingItems?.length
      ? inner.missingItems
      : envelope.missing_items?.length
        ? envelope.missing_items
        : missingComputed;

    const result = {
      summary: inner.summary ?? envelope.business_summary ?? "",
      highlights: inner.highlights ?? [],
      nextAction: inner.nextAction ?? envelope.suggested_next_action ?? "",
      missingItems,
      extractedDetails,
      readinessScore,
      band,
      confidence: envelope.confidence,
      flags: envelope.flags,
      businessSummary: envelope.business_summary,
      suggestedNextAction: envelope.suggested_next_action,
      model,
      attempts,
    };

    if (persistTo) {
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
      await admin
        .from("submissions")
        .update({
          ai_summary: result.summary,
          readiness_score: result.readinessScore,
          next_action: result.nextAction,
          missing_items: result.missingItems,
        })
        .eq("id", persistTo.submissionId);

      await admin.from("extracted_details").delete().eq("submission_id", persistTo.submissionId);
      if (extractedDetails.length > 0) {
        await admin.from("extracted_details").insert(
          extractedDetails.map((d) => ({
            submission_id: persistTo!.submissionId,
            label: d.label,
            value: d.value,
            type: d.type ?? null,
            confidence: typeof d.confidence === "number" ? d.confidence : null,
          })),
        );
      }
    }

    return json(result);
  } catch (e) {
    const mapped = routerErrorResponse(e, corsHeaders);
    if (mapped) return mapped;
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

function computeReadiness(shots: ShotIn[]) {
  const total = shots.length || 1;
  const captured = shots.filter((s) => !s.missing);
  const passes = captured.filter((s) => s.feedbackSeverity === "pass").length;
  const warns = captured.filter((s) => s.feedbackSeverity === "warn").length;
  const fails = captured.filter((s) => s.feedbackSeverity === "fail").length;

  const quality = ((passes * 1 + warns * 0.6 + fails * 0.2) / total) * 45;
  const coverage = (captured.length / total) * 20;
  const details = 15;
  const answers = 15;
  const freshness = 5;
  const readinessScore = Math.round(quality + coverage + details + answers + freshness);
  const band: "low" | "medium" | "high" = readinessScore >= 80 ? "high" : readinessScore >= 50 ? "medium" : "low";
  const missingComputed = shots.filter((s) => s.missing).map((s) => s.title);
  return { readinessScore: Math.min(100, Math.max(0, readinessScore)), band, missingComputed };
}

async function isAuthorizedForWorkspaceOrRequest(
  req: Request,
  workspaceId: string,
  requestId: string,
): Promise<boolean> {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const auth = req.headers.get("Authorization");
  if (auth) {
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
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
      if (member) return true;
    }
  }

  const token = req.headers.get("x-request-token");
  if (!token) return false;
  const { data: tokReq } = await admin
    .from("photo_brief_requests")
    .select("id")
    .eq("token", token)
    .eq("id", requestId)
    .maybeSingle();
  return !!tokReq;
}

async function loadSubmission(submissionId: string) {
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

  const [{ data: media }, { data: requiredSteps }, { data: answers }] = await Promise.all([
    admin
      .from("captured_media")
      .select("id, note, ai_feedback, status, step_id, file_url, guide_steps(title)")
      .eq("submission_id", submissionId),
    guideId
      ? admin.from("guide_steps").select("id, title, required").eq("guide_id", guideId)
      : Promise.resolve({ data: [] as any[] }),
    admin
      .from("submission_answers")
      .select("prompt, answer, order_index")
      .eq("submission_id", submissionId)
      .order("order_index", { ascending: true }),
  ]);

  const SUPABASE_PROJECT_URL = SUPABASE_URL.replace(/\/$/, "");
  const toPublicUrl = (filePath: string | null) => {
    if (!filePath) return undefined;
    if (filePath.startsWith("http")) return filePath;
    return `${SUPABASE_PROJECT_URL}/storage/v1/object/public/submission-media/${filePath}`;
  };

  const capturedStepIds = new Set<string>((media ?? []).map((m: any) => m.step_id).filter(Boolean));

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
    workspaceId: (sub as any).workspace_id,
    requestId: (sub as any).request_id,
    computeInput: {
      guideName: (sub as any).photo_brief_requests?.photo_guides?.name ?? "Submission",
      recipientName: (sub as any).submitter_name ?? "Recipient",
      shots: [...capturedShots, ...missingShots],
      customerAnswers: (answers ?? []).map((a: any) => ({
        prompt: a.prompt,
        answer: a.answer,
      })),
    },
  };
}
