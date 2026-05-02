import { supabase } from "@/integrations/supabase/client";
import { getTokenClient } from "@/integrations/supabase/tokenClient";
import { guideTemplates } from "@/config/guideTemplates";
import { draftFromGuide } from "@/types/requestDraft";
import type { RequestDraft } from "@/types/requestDraft";
import type {
  AICheckSeverity,
  AICheckType,
  ContextQuestion,
  ExtractedDetail,
  GuideStep,
  PhotoGuide,
  ShotAIFeedback,
  SubmissionShot,
} from "@/types/photobrief";

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

export const aiModelRouter: Record<AITask, AITier> = {
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

export interface AnalyzeMediaInput {
  step: GuideStep;
  mediaUrl?: string;
  capturedMediaId?: string;
  recipientNote?: string;
  escalate?: boolean;
  /** Public recipient flow token. Required when analyzing token-created captured_media rows. */
  requestToken?: string;
}

export interface AnalyzeMediaOutput {
  checks: { type: AICheckType; severity: AICheckSeverity; message: string }[];
  verdict: AICheckSeverity;
  feedback: ShotAIFeedback;
  unavailable?: boolean;
}

export interface SubmissionSummaryInput {
  guideName: string;
  recipientName: string;
  shots: SubmissionShot[];
  customerAnswers?: { prompt: string; answer: string }[];
}

export interface SubmissionSummaryOutput {
  summary: string;
  highlights: string[];
}

export interface ReadinessScoreInput {
  shots: SubmissionShot[];
  requiredStepCount?: number;
  hasMissingItems?: boolean;
}

export interface ReadinessScoreOutput {
  score: number;
  band: "low" | "medium" | "high";
  rationale: string;
  missingItems: string[];
  suggestedNextAction: string;
}

export interface ExtractDetailsInput {
  shots: SubmissionShot[];
  guideName: string;
}

export interface ExtractDetailsOutput {
  details: ExtractedDetail[];
}

export interface GenerateGuideInput {
  prompt: string;
  category?: string;
}

export interface GenerateGuideOutput {
  draft: RequestDraft;
  assistantReply: string;
  sourceGuideId: string;
}

export type FollowupTone = "friendly" | "firm" | "urgent";

export interface FollowupMessageInput {
  recipientName: string;
  guideName: string;
  missingItems?: string[];
  retakeShotTitles?: string[];
  tone?: FollowupTone;
}

export interface FollowupMessageOutput {
  subject: string;
  body: string;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function worstOf(severities: AICheckSeverity[]): AICheckSeverity {
  if (severities.some((s) => s === "fail")) return "fail";
  if (severities.some((s) => s === "warn")) return "warn";
  return "pass";
}

function bandFromScore(score: number): ReadinessScoreOutput["band"] {
  if (score >= 80) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function feedbackHeadline(verdict: AICheckSeverity, stepTitle: string): string {
  if (verdict === "pass") return "Sharp & well lit";
  if (verdict === "warn") return `${stepTitle}: usable, but could be better`;
  if (verdict === "unavailable") return `${stepTitle}: AI review unavailable`;
  return `${stepTitle}: needs a retake`;
}

function aiUnavailableResult(stepTitle: string): AnalyzeMediaOutput {
  const checks = [
    {
      type: "manual_review" as unknown as AICheckType,
      severity: "unavailable" as AICheckSeverity,
      message: "AI review is temporarily unavailable — you can still submit this photo.",
      label: "AI review unavailable",
    },
  ];
  const feedback: ShotAIFeedback = {
    severity: "unavailable",
    headline: `${stepTitle}: AI review unavailable`,
    detail: "You can submit it as-is or retake.",
    checks: checks.map((c) => ({ type: c.type, severity: c.severity, label: c.label })),
  };
  return {
    checks: checks.map(({ type, severity, message }) => ({ type, severity, message })),
    verdict: "unavailable",
    feedback,
    unavailable: true,
  };
}

export const aiService = {
  async analyzeCapturedMedia(input: AnalyzeMediaInput): Promise<AnalyzeMediaOutput> {
    const { step, mediaUrl, capturedMediaId, recipientNote, escalate, requestToken } = input;
    const usableUrl = mediaUrl && /^https?:\/\//.test(mediaUrl) ? mediaUrl : null;

    if (usableUrl) {
      try {
        const client = requestToken ? getTokenClient(requestToken) : supabase;
        const { data, error } = await client.functions.invoke("ai-analyze-media", {
          body: {
            stepId: step.id,
            stepTitle: step.title,
            instruction: step.instructions,
            captureType: step.shotType,
            overlayType: step.overlayType,
            aiChecks: step.aiChecks,
            imageUrl: usableUrl,
            recipientNote,
            capturedMediaId,
            priority: escalate ? "admin_review" : undefined,
            task: "photo_quality_check",
          },
        });
        if (error) throw error;
        if (data && data.error === "ai_unavailable") return aiUnavailableResult(step.title);

        if (data && data.checks) {
          const checks = data.checks.map((c: any) => ({
            type: c.type as AICheckType,
            severity: c.severity as AICheckSeverity,
            message: c.message,
            label: c.label,
          }));
          const verdict = (data.verdict ?? worstOf(checks.map((c: any) => c.severity))) as AICheckSeverity;
          const feedback: ShotAIFeedback = {
            severity: verdict,
            headline: data.headline ?? feedbackHeadline(verdict, step.title),
            detail: data.detail ?? checks.find((c: any) => c.severity !== "pass")?.message,
            checks: checks.map((c: any) => ({ type: c.type, severity: c.severity, label: c.label })),
            confidence: typeof data.confidence === "number" ? data.confidence : undefined,
            flags: Array.isArray(data.flags) ? data.flags : undefined,
            businessSummary: data.businessSummary ?? undefined,
            suggestedNextAction: data.suggestedNextAction ?? undefined,
          };
          return {
            checks: checks.map(({ type, severity, message }: any) => ({ type, severity, message })),
            verdict,
            feedback,
          };
        }
      } catch (e) {
        console.warn("ai-analyze-media failed", e);
      }
    }

    return aiUnavailableResult(step.title);
  },

  async generateSubmissionSummary(input: SubmissionSummaryInput): Promise<SubmissionSummaryOutput> {
    try {
      const { data, error } = await supabase.functions.invoke("ai-summarize-submission", {
        body: {
          guideName: input.guideName,
          recipientName: input.recipientName,
          shots: input.shots.map((s) => ({
            title: s.title,
            missing: s.missing,
            feedbackSeverity: s.feedback?.severity,
            feedbackHeadline: s.feedback?.headline,
          })),
          customerAnswers: input.customerAnswers,
          task: "submission_summary",
        },
      });
      if (error) throw error;
      if (data?.summary) return { summary: data.summary, highlights: data.highlights ?? [] };
    } catch (e) {
      console.warn("ai-summarize-submission failed, using fallback", e);
    }

    await wait(300);
    const captured = input.shots.filter((s) => !s.missing);
    const total = input.shots.length;
    const fail = captured.filter((s) => s.feedback?.severity === "fail").length;
    const warn = captured.filter((s) => s.feedback?.severity === "warn").length;
    const firstName = input.recipientName.split(" ")[0] || "Customer";
    const summary =
      `${firstName} submitted ${captured.length} of ${total} requested shots for the ${input.guideName} brief. ` +
      (fail > 0
        ? `${fail} shot${fail === 1 ? " needs" : "s need"} attention before you can act on this. `
        : warn > 0
          ? `Quality is acceptable overall, with ${warn} minor issue${warn === 1 ? "" : "s"} flagged. `
          : `All captured photos passed AI quality checks. `) +
      (input.customerAnswers?.length
        ? `Customer also answered ${input.customerAnswers.length} context question${input.customerAnswers.length === 1 ? "" : "s"}.`
        : "");

    const highlights: string[] = [];
    if (fail > 0) highlights.push(`${fail} shot${fail === 1 ? "" : "s"} failed AI checks`);
    if (warn > 0) highlights.push(`${warn} shot${warn === 1 ? "" : "s"} flagged with warnings`);
    if (captured.length === total) highlights.push("All requested shots captured");
    else highlights.push(`${total - captured.length} shot${total - captured.length === 1 ? "" : "s"} missing`);
    if (input.customerAnswers?.length) {
      highlights.push(`${input.customerAnswers.length} context answer${input.customerAnswers.length === 1 ? "" : "s"} provided`);
    }
    return { summary, highlights };
  },

  async calculateReadinessScore(input: ReadinessScoreInput): Promise<ReadinessScoreOutput> {
    await wait(300);
    const total = input.shots.length || 1;
    const captured = input.shots.filter((s) => !s.missing);
    const passCount = captured.filter((s) => s.feedback?.severity === "pass").length;
    const warnCount = captured.filter((s) => s.feedback?.severity === "warn").length;
    const failCount = captured.filter((s) => s.feedback?.severity === "fail").length;
    const missingCount = total - captured.length;
    const raw = (passCount * 1 + warnCount * 0.6 + failCount * 0.2) / total;
    let score = Math.round(raw * 100);
    if (input.hasMissingItems) score = Math.max(0, score - 5);
    score = Math.min(100, Math.max(0, score));
    const band = bandFromScore(score);
    const missingItems = input.shots.filter((s) => s.missing).map((s) => s.title);
    const rationale =
      band === "high"
        ? "Submission is complete and quality is high — safe to act on."
        : band === "medium"
          ? "Most items are usable but a few need attention before this is action-ready."
          : "Significant gaps or quality issues — request more photos before proceeding.";
    const suggestedNextAction =
      missingCount > 0 || failCount > 0
        ? "Ask for more photos"
        : warnCount > 0
          ? "Review flagged shots, then mark reviewed"
          : "Mark as reviewed";
    return { score, band, rationale, missingItems, suggestedNextAction };
  },

  async extractDetails(input: ExtractDetailsInput): Promise<ExtractDetailsOutput> {
    await wait(500);
    const details: ExtractedDetail[] = [];
    for (const shot of input.shots) {
      if (shot.missing) continue;
      const detected = (shot.feedback?.checks ?? []).filter((c) => c.severity === "pass").map((c) => c.type);
      if (detected.includes("label_detected")) {
        details.push({ label: "Model number", value: `MDL-${Math.floor(1000 + Math.random() * 9000)}`, confidence: 0.86, sourceStepId: shot.stepId });
      }
      if (detected.includes("serial_detected")) {
        details.push({ label: "Serial number", value: `SN${Math.floor(100000 + Math.random() * 900000)}`, confidence: 0.79, sourceStepId: shot.stepId });
      }
      if (detected.includes("receipt_detected")) {
        details.push({ label: "Purchase date", value: "2024-08-12", confidence: 0.71, sourceStepId: shot.stepId });
      }
    }
    if (details.length === 0) details.push({ label: "Request type", value: input.guideName, confidence: 1 });
    return { details };
  },

  async generateGuideFromPrompt(input: GenerateGuideInput): Promise<GenerateGuideOutput> {
    const { prompt } = input;
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate-guide", {
        body: { prompt, category: input.category, task: "guide_generation" },
      });
      if (error) throw error;
      if (data?.draft) {
        const d = data.draft;
        const seedGuide = guideTemplates[0];
        const finalDraft: RequestDraft = {
          ...draftFromGuide(seedGuide),
          source: "ai",
          prompt,
          title: d.title ?? titleFromPrompt(prompt, seedGuide.name),
          introMessage: d.introMessage,
          steps: (d.steps ?? []).map((s: any, i: number) => ({
            id: `step_${Date.now()}_${i}`,
            orderIndex: s.orderIndex ?? i,
            title: s.title,
            instructions: s.instructions ?? s.instruction ?? "",
            shotType: (s.shotType ?? "wide") as any,
            overlayType: "full_area" as any,
            aiChecks: s.aiChecks ?? [],
            required: s.required ?? true,
          })),
          questions: (d.questions ?? []).map((q: any, i: number) => ({
            id: `q_${Date.now()}_${i}`,
            orderIndex: q.orderIndex ?? i,
            prompt: q.prompt,
            inputType: q.inputType ?? "short_text",
            options: q.options,
            required: q.required ?? false,
          })),
        };
        return {
          draft: finalDraft,
          assistantReply: data.assistantReply ?? `Drafted "${finalDraft.title}".`,
          sourceGuideId: seedGuide.id,
        };
      }
    } catch (e: any) {
      console.warn("ai-generate-guide failed, using template fallback", e?.message);
    }

    await wait(400);
    const tokens = prompt.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 3);
    let best = { score: 0, guideId: guideTemplates[0].id };
    for (const g of guideTemplates) {
      const bag = `${g.name} ${g.nestedCategory ?? ""} ${g.workflowType ?? ""} ${g.category}`.toLowerCase();
      let score = 0;
      for (const t of tokens) if (bag.includes(t)) score += 1;
      if (score > best.score) best = { score, guideId: g.id };
    }
    const guide: PhotoGuide = guideTemplates.find((g) => g.id === best.guideId) ?? guideTemplates[0];
    const draft = draftFromGuide(guide);
    const finalDraft: RequestDraft = {
      ...draft,
      source: "ai",
      prompt,
      title: titleFromPrompt(prompt, guide.name),
      introMessage: `Hi! Thanks for reaching out about ${prompt.trim().toLowerCase().slice(0, 80) || guide.category.toLowerCase()}. I'll walk you through a few quick photos so we can help you faster.`,
      questions: augmentQuestions(prompt, draft.questions),
    };
    const stepCount = finalDraft.steps.length;
    const qCount = finalDraft.questions.length;
    return {
      draft: finalDraft,
      assistantReply: `Got it. I drafted a request titled "${finalDraft.title}" with ${stepCount} photo step${stepCount === 1 ? "" : "s"}${qCount ? ` and ${qCount} short question${qCount === 1 ? "" : "s"}` : ""}. Take a look on the right — you can edit anything before sending.`,
      sourceGuideId: guide.id,
    };
  },

  async generateFollowupMessage(input: FollowupMessageInput): Promise<FollowupMessageOutput> {
    await wait(400);
    const tone = input.tone ?? "friendly";
    const firstName = input.recipientName.split(" ")[0] || "there";
    const items = [
      ...(input.missingItems ?? []),
      ...(input.retakeShotTitles ?? []).map((t) => `Retake: ${t}`),
    ];
    const opener =
      tone === "urgent"
        ? `Hi ${firstName}, quick urgent ask —`
        : tone === "firm"
          ? `Hi ${firstName}, following up on your ${input.guideName} submission.`
          : `Hi ${firstName}! Thanks for the photos so far.`;
    const itemList = items.length
      ? `\n\nCould you grab the following so we can move forward?\n${items.map((i) => `• ${i}`).join("\n")}`
      : `\n\nWe just need one quick follow-up to wrap this up.`;
    const closer =
      tone === "urgent"
        ? `\n\nIf you can send these in the next hour, we can keep things on track. Thanks!`
        : tone === "firm"
          ? `\n\nPlease reply with the items above when you have a moment.`
          : `\n\nWhenever you have a sec — appreciate it!`;
    return { subject: `Quick follow-up on your ${input.guideName} photos`, body: `${opener}${itemList}${closer}` };
  },
};

function titleFromPrompt(prompt: string, fallback: string): string {
  const cleaned = prompt.trim().replace(/^i (need|want)\s+/i, "").replace(/^photos? (for|of)\s+/i, "");
  if (!cleaned) return fallback;
  const short = cleaned.split(/[.!?]/)[0].slice(0, 60);
  return short.charAt(0).toUpperCase() + short.slice(1);
}

function augmentQuestions(prompt: string, existing: ContextQuestion[]): ContextQuestion[] {
  const p = prompt.toLowerCase();
  const extras: ContextQuestion[] = [];
  if (p.includes("quote") || p.includes("estimate")) {
    extras.push({ id: `q_when_${Date.now()}`, orderIndex: existing.length, prompt: "When would you like the work scheduled?", inputType: "short_text", required: false });
  }
  if (p.includes("urgent") || p.includes("emergency")) {
    extras.push({ id: `q_urgency_${Date.now()}`, orderIndex: existing.length + extras.length, prompt: "How urgent is this?", inputType: "single_select", options: ["Today", "This week", "Flexible"], required: true });
  }
  return [...existing, ...extras];
}
