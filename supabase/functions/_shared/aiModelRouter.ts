// Centralized AI model router for PhotoBrief edge functions.
//
// Single source of truth for which model handles which task.
// No model id should appear anywhere outside this file (except in comments).
//
// Tiers:
//   default    — fast, cheap-ish chat / drafting (Gemini 3 Flash)
//   vision     — core visual intake (GPT-5 mini) — quality checks, extraction,
//                readiness scoring, submission summary
//   escalation — high-value / ambiguous / admin review (GPT-5.2 → Gemini 3.1 Pro)
//   cheap      — background classification / tagging / routing (GPT-5 nano)
//
// Each task maps to one tier. Each tier exposes an ordered fallback chain so
// a transient provider failure can transparently retry on the next model.
// The 429 (rate limit) and 402 (credits exhausted) responses are NOT retried —
// those are workspace-level signals that must propagate to the caller.

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type AITask =
  | "recipient_guidance"
  | "photo_quality_check"
  | "detail_extraction"
  | "readiness_scoring"
  | "submission_summary"
  | "guide_generation"
  | "followup_message"
  | "admin_review"
  | "classification";

export type AITier = "default" | "vision" | "escalation" | "cheap";

const TIER_CHAIN: Record<AITier, string[]> = {
  default: [
    "google/gemini-3-flash-preview",
    "openai/gpt-5-mini",
    "google/gemini-2.5-flash-lite",
  ],
  vision: [
    "openai/gpt-5-mini",
    "google/gemini-2.5-flash",
    "google/gemini-2.5-flash-lite",
  ],
  escalation: [
    "openai/gpt-5.2",
    "google/gemini-3.1-pro-preview",
    "openai/gpt-5-mini",
  ],
  cheap: ["openai/gpt-5-nano", "google/gemini-2.5-flash-lite"],
};

const TASK_TIER: Record<AITask, AITier> = {
  recipient_guidance: "default",
  guide_generation: "default",
  followup_message: "default",
  photo_quality_check: "vision",
  detail_extraction: "vision",
  readiness_scoring: "vision",
  submission_summary: "vision",
  admin_review: "escalation",
  classification: "cheap",
};

export function tierForTask(task: AITask): AITier {
  return TASK_TIER[task];
}

/**
 * Ordered list of model ids to try for a given task. When `escalate` is true,
 * the escalation tier is prepended so an admin re-run / low-confidence retry
 * uses the most capable model first, with the original tier as fallback.
 */
export function modelsForTask(
  task: AITask,
  opts: { escalate?: boolean } = {},
): string[] {
  const baseTier = tierForTask(task);
  if (opts.escalate && baseTier !== "escalation") {
    // Dedupe — escalation chain may include vision-tier models too.
    const chain = [...TIER_CHAIN.escalation, ...TIER_CHAIN[baseTier]];
    return Array.from(new Set(chain));
  }
  return TIER_CHAIN[baseTier];
}

// =====================================================================
// Standard structured-output envelope
// =====================================================================
//
// Every AI call that affects app behavior must emit this envelope. The
// per-task `result` payload sits inside `result`; envelope-level fields
// (confidence, flags, recipient_feedback, business_summary, missing_items,
// suggested_next_action) are uniform across all tasks so the client can
// reason about them generically.

export interface AIEnvelope<TResult = Record<string, unknown>> {
  result: TResult;
  confidence: number; // 0..1
  flags: string[];
  recipient_feedback: string | null;
  business_summary: string | null;
  missing_items: string[];
  suggested_next_action: string | null;
}

export interface EnvelopeToolSpec {
  /** Function-tool name. The router will set tool_choice to this name. */
  name: string;
  /** Human description of the task for the model. */
  description: string;
  /** JSON-schema fragment describing the inner `result` payload. */
  resultSchema: Record<string, unknown>;
}

export function buildEnvelopeTool(spec: EnvelopeToolSpec) {
  return {
    type: "function" as const,
    function: {
      name: spec.name,
      description: spec.description,
      parameters: {
        type: "object",
        properties: {
          result: spec.resultSchema,
          confidence: {
            type: "number",
            description: "Overall confidence 0..1 in this analysis.",
          },
          flags: {
            type: "array",
            items: { type: "string" },
            description:
              "Short machine-readable flags (e.g. low_light, ambiguous_label, low_confidence).",
          },
          recipient_feedback: {
            type: ["string", "null"],
            description:
              "Kind, actionable one-sentence message for the recipient. Null if not applicable.",
          },
          business_summary: {
            type: ["string", "null"],
            description:
              "One short sentence for the business owner reviewing this. Null if not applicable.",
          },
          missing_items: {
            type: "array",
            items: { type: "string" },
            description:
              "Required items the recipient still needs to provide (titles, not ids).",
          },
          suggested_next_action: {
            type: ["string", "null"],
            description:
              "Single recommended action for the workspace (e.g. 'Mark reviewed', 'Ask for retake').",
          },
        },
        required: [
          "result",
          "confidence",
          "flags",
          "missing_items",
        ],
        additionalProperties: false,
      },
    },
  };
}

// =====================================================================
// Router call
// =====================================================================

export interface RouterCallInput {
  task: AITask;
  /** Whether to escalate to the premium tier first (admin review, low conf). */
  escalate?: boolean;
  /** Standard chat-completion messages array. */
  messages: any[];
  /** Function-tools array, must include the envelope tool. */
  tools: any[];
  /** tool_choice forcing the envelope function. */
  tool_choice: any;
  /** Optional reasoning effort hint, only forwarded for models that support it. */
  reasoningEffort?: "minimal" | "low" | "medium" | "high";
}

export interface RouterCallResult {
  /** Parsed envelope (already JSON-parsed from tool_call arguments). */
  envelope: AIEnvelope;
  /** Model id that actually produced the envelope. */
  model: string;
  /** Models attempted (in order). Useful for logging/analytics. */
  attempts: string[];
}

export class AIRateLimitError extends Error {
  status = 429 as const;
  constructor() {
    super("Rate limit reached. Try again in a moment.");
  }
}
export class AICreditsError extends Error {
  status = 402 as const;
  constructor() {
    super("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
  }
}
export class AIUnavailableError extends Error {
  status = 503 as const;
  attempts: string[];
  constructor(attempts: string[]) {
    super("AI review unavailable.");
    this.attempts = attempts;
  }
}

export async function callAIWithRouter(
  input: RouterCallInput,
): Promise<RouterCallResult> {
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }
  const chain = modelsForTask(input.task, { escalate: input.escalate });
  const attempts: string[] = [];

  let lastErr: unknown = null;
  for (const model of chain) {
    attempts.push(model);
    try {
      const body: Record<string, unknown> = {
        model,
        messages: input.messages,
        tools: input.tools,
        tool_choice: input.tool_choice,
      };
      if (input.reasoningEffort && model.startsWith("openai/")) {
        body.reasoning = { effort: input.reasoningEffort };
      }

      const res = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      // Workspace-level errors propagate immediately — no fallback.
      if (res.status === 429) throw new AIRateLimitError();
      if (res.status === 402) throw new AICreditsError();

      if (!res.ok) {
        const txt = await res.text();
        console.warn(`[aiRouter] ${model} → ${res.status} ${txt.slice(0, 200)}`);
        lastErr = new Error(`gateway_${res.status}`);
        continue;
      }

      const data = await res.json();
      const call = data?.choices?.[0]?.message?.tool_calls?.[0];
      if (!call?.function?.arguments) {
        console.warn(`[aiRouter] ${model} → no tool_call`);
        lastErr = new Error("no_tool_call");
        continue;
      }
      let envelope: AIEnvelope;
      try {
        envelope = JSON.parse(call.function.arguments);
      } catch (e) {
        console.warn(`[aiRouter] ${model} → unparseable tool_call`, e);
        lastErr = e;
        continue;
      }
      // Normalize required fields so downstream code can trust them.
      envelope.flags = Array.isArray(envelope.flags) ? envelope.flags : [];
      envelope.missing_items = Array.isArray(envelope.missing_items)
        ? envelope.missing_items
        : [];
      envelope.confidence = typeof envelope.confidence === "number"
        ? envelope.confidence
        : 0.5;
      envelope.recipient_feedback = envelope.recipient_feedback ?? null;
      envelope.business_summary = envelope.business_summary ?? null;
      envelope.suggested_next_action = envelope.suggested_next_action ?? null;

      return { envelope, model, attempts };
    } catch (e) {
      // Re-throw workspace-level errors; capture transient ones for next attempt.
      if (e instanceof AIRateLimitError || e instanceof AICreditsError) throw e;
      console.warn(`[aiRouter] ${model} threw`, e);
      lastErr = e;
      continue;
    }
  }

  console.error("[aiRouter] all models exhausted", { task: input.task, attempts, lastErr });
  throw new AIUnavailableError(attempts);
}

/** Helper for edge functions: turn router errors into a JSON Response. */
export function routerErrorResponse(
  err: unknown,
  corsHeaders: Record<string, string>,
): Response | null {
  if (err instanceof AIRateLimitError) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (err instanceof AICreditsError) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 402,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (err instanceof AIUnavailableError) {
    // Graceful degradation envelope — HTTP 200 so the client can render the
    // "AI review unavailable" state without throwing. Submission MUST NOT be
    // blocked by AI being down — only app logic (required photos missing) does.
    return new Response(
      JSON.stringify({
        error: "ai_unavailable",
        graceful: true,
        attempts: err.attempts,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
  return null;
}
