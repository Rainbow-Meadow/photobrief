# PhotoBrief AI — Model Routing & Structured Outputs

Today every AI call hardcodes a single model in its edge function (`google/gemini-2.5-flash` for analyze + guide, `google/gemini-2.5-pro` for summarize). We will replace that with a centralized router that picks the right model per task, normalizes structured output, and degrades gracefully on failure — without touching any UI components.

## 1. New shared module: `supabase/functions/_shared/aiModelRouter.ts`

Single source of truth for which model handles which task.

```ts
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
```

Tier → model mapping (provider-redundant, with explicit fallback chain):

| Tier         | Primary                      | Fallback             | Cheap last-resort         |
| ------------ | ---------------------------- | -------------------- | ------------------------- |
| `default`    | `google/gemini-3-flash-preview` | `openai/gpt-5-mini`  | `google/gemini-2.5-flash-lite` |
| `vision`     | `openai/gpt-5-mini`          | `google/gemini-2.5-flash` | `google/gemini-2.5-flash-lite` |
| `escalation` | `openai/gpt-5.2`             | `google/gemini-3.1-pro-preview` | `openai/gpt-5-mini` |
| `cheap`      | `openai/gpt-5-nano`          | `google/gemini-2.5-flash-lite` | — |

Task → tier:

- `recipient_guidance`, `guide_generation`, `followup_message` → `default`
- `photo_quality_check`, `detail_extraction`, `readiness_scoring`, `submission_summary` → `vision`
- `admin_review` → `escalation`
- `classification` → `cheap`

Exports:
- `modelsForTask(task, { escalate?: boolean })` → ordered fallback list of model ids.
- `callAIWithRouter({ task, messages, tools, tool_choice, escalate? })` — wraps the Lovable AI gateway, iterates the fallback chain on `5xx`, network errors, or empty `tool_calls`. Returns `{ model, response, attempts }`. Surfaces `429` and `402` immediately (no fallback — those are workspace-level signals).

## 2. Standard structured-output envelope

A new helper `buildEnvelopeTool(taskName, innerSchema)` produces the function-tool schema every task uses. Inner result is task-specific; envelope is uniform:

```ts
{
  result: <task-specific payload>,
  confidence: number,                // 0-1
  flags: string[],                   // e.g. ["low_light","ambiguous_label"]
  recipient_feedback: string | null, // shown to recipient (kind, actionable)
  business_summary: string | null,   // shown to workspace owner
  missing_items: string[],
  suggested_next_action: string | null
}
```

Each edge function still returns its existing response shape to keep UI compatibility, but populates it from `envelope.result` plus the envelope-level fields. New fields (`confidence`, `flags`, `business_summary`, `suggested_next_action`) are added to the JSON responses additively.

## 3. Edge-function updates

Refactor each function to:
1. Build messages.
2. Call `callAIWithRouter({ task, ... })`.
3. Parse the envelope.
4. Map to existing response keys + include the new envelope fields.
5. On total failure (all fallbacks exhausted) return a typed `{ error: "ai_unavailable", graceful: true }` payload (HTTP 200 for analyze/extract paths so the client can render the "AI review unavailable" state without throwing).

Files:

- `supabase/functions/ai-analyze-media/index.ts` → task `photo_quality_check`. Vision tier. Allow `escalate: true` when caller passes `priority: "admin_review"` (admin re-runs).
- `supabase/functions/ai-summarize-submission/index.ts` → split internal calls:
  - submission summary → `submission_summary` (vision)
  - readiness score → `readiness_scoring` (vision, but uses already-collected check data so cheap inputs)
  - extracted details → `detail_extraction` (vision)
  Currently this function already does all three in one model call; keep the single call but route via `submission_summary` task. Add `escalate=true` when `flags` includes `low_confidence` OR `confidence < 0.5` to retry once on the escalation tier.
- `supabase/functions/ai-generate-guide/index.ts` → task `guide_generation` (default tier — fast Gemini Flash).
- New `supabase/functions/ai-followup-message/index.ts` (currently client-only fallback in `aiService.generateFollowupMessage`) → task `followup_message`. Optional, but registers the route end-to-end.

Each function imports from `_shared/aiModelRouter.ts`. No model id appears outside that file.

## 4. Client side: `src/services/aiService.ts`

- Add `import type { AITask } from ...` mirror (string-literal union duplicated client-side, since edge `_shared` isn't importable from the SPA).
- New top-level `aiModelRouter` export on the client is **only metadata** (task → tier label) used for analytics / debug surfaces. It does NOT pick models — the edge function is the single decision point. This guarantees rule "do not hardcode model names inside components".
- Update each `aiService.*` method to:
  - Send `{ task: "..." }` in the function body so the edge router knows which task this is (defense in depth — the function already knows, but explicit task lets a single shared function be reused later).
  - Read new envelope fields (`confidence`, `flags`, `businessSummary`, `suggestedNextAction`) into the existing typed outputs (additive — `AnalyzeMediaOutput`, `SubmissionSummaryOutput`, `ReadinessScoreOutput` extended with optional `confidence?`, `flags?`).
- Failure handling chain in `analyzeCapturedMedia`:
  1. Edge call OK → return real result.
  2. Edge returns `{ error: "ai_unavailable", graceful: true }` → return a new `verdict: "unavailable"` shape that triggers the "AI review unavailable" UI state (already partially handled today as a `warn` placeholder; we make it explicit). Submission is **not** blocked.
  3. Required-photo gating remains app-logic only (`step.required && missing`), unchanged.

## 5. Types

- `src/types/photobrief.ts`: extend `AICheckSeverity` with `"unavailable"` (UI maps to neutral grey badge). Extend `ShotAIFeedback` with optional `confidence?: number; flags?: string[]; businessSummary?: string; suggestedNextAction?: string`.
- `src/services/aiService.ts`: extend output interfaces with optional envelope fields.

## 6. Things explicitly NOT changed

- No UI component edits required — all reads go through `aiService` and the existing severity-driven render paths.
- No DB migrations. (`captured_media.ai_feedback` is `jsonb`, so the extra envelope fields persist automatically.)
- No plan-tier changes; `ai-generate-guide` keeps its Pro+ gate.
- We do not introduce per-request model overrides from the client — only `escalate?: boolean` on admin re-runs.

## Files touched

- new: `supabase/functions/_shared/aiModelRouter.ts`
- edited: `supabase/functions/ai-analyze-media/index.ts`
- edited: `supabase/functions/ai-summarize-submission/index.ts`
- edited: `supabase/functions/ai-generate-guide/index.ts`
- new (optional): `supabase/functions/ai-followup-message/index.ts`
- edited: `src/services/aiService.ts`
- edited: `src/types/photobrief.ts`
