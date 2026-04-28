// Mock AI request-builder. Phase 3: keyword-based guide selection +
// templated draft assembly. Phase 7 swaps this for an edge function
// (ai-request-builder-chat) using the real LLM.
import { guideTemplates } from "@/config/guideTemplates";
import { draftFromGuide } from "@/types/requestDraft";
import type { RequestDraft } from "@/types/requestDraft";
import type { ContextQuestion } from "@/types/photobrief";

interface GuideKeywords {
  guideId: string;
  keywords: string[];
}

const KEYWORDS: GuideKeywords[] = [
  { guideId: "guide_leak", keywords: ["leak", "drip", "water damage", "pipe burst"] },
  { guideId: "guide_water_heater", keywords: ["water heater", "hot water", "boiler", "tankless"] },
  { guideId: "guide_junk", keywords: ["junk", "haul", "removal", "trash", "debris", "cleanout"] },
  { guideId: "guide_landscape", keywords: ["yard", "lawn", "landscape", "garden", "irrigation", "sprinkler"] },
  { guideId: "guide_appliance", keywords: ["appliance", "fridge", "washer", "dryer", "oven", "dishwasher"] },
  { guideId: "guide_pest", keywords: ["pest", "rodent", "raccoon", "wasp", "bug", "wildlife", "infestation"] },
];

function pickGuide(prompt: string) {
  const p = prompt.toLowerCase();
  let best = { score: 0, guideId: guideTemplates[0].id };
  for (const k of KEYWORDS) {
    const score = k.keywords.reduce((acc, kw) => (p.includes(kw) ? acc + 1 : acc), 0);
    if (score > best.score) best = { score, guideId: k.guideId };
  }
  return guideTemplates.find((g) => g.id === best.guideId) ?? guideTemplates[0];
}

function craftIntro(prompt: string, businessCategory: string): string {
  const trimmed = prompt.trim().replace(/\s+/g, " ");
  return `Hi! Thanks for reaching out about ${trimmed.toLowerCase().slice(0, 80) || businessCategory.toLowerCase()}. I'll walk you through a few quick photos so we can help you faster.`;
}

function maybeAddPromptedQuestion(prompt: string, existing: ContextQuestion[]): ContextQuestion[] {
  const p = prompt.toLowerCase();
  const extras: ContextQuestion[] = [];
  if (p.includes("quote") || p.includes("estimate")) {
    extras.push({
      id: `q_when_${Date.now()}`,
      orderIndex: existing.length,
      prompt: "When would you like the work scheduled?",
      inputType: "short_text",
      required: false,
    });
  }
  if (p.includes("urgent") || p.includes("emergency")) {
    extras.push({
      id: `q_urgency_${Date.now()}`,
      orderIndex: existing.length + extras.length,
      prompt: "How urgent is this?",
      inputType: "single_select",
      options: ["Today", "This week", "Flexible"],
      required: true,
    });
  }
  return [...existing, ...extras];
}

/** Simulate latency for the chat-style UX. */
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const requestBuilderAi = {
  /** Generate a draft request from a free-text prompt. Mock for Phase 3. */
  async generateRequestDraft(prompt: string): Promise<RequestDraft> {
    await wait(900);
    const guide = pickGuide(prompt);
    const draft = draftFromGuide(guide);
    return {
      ...draft,
      source: "ai",
      prompt,
      title: titleFromPrompt(prompt, guide.name),
      introMessage: craftIntro(prompt, guide.category),
      questions: maybeAddPromptedQuestion(prompt, draft.questions),
    };
  },

  /** Quick conversational reply suggestions to keep the chat flowing. */
  async assistantReply(prompt: string, draft: RequestDraft): Promise<string> {
    await wait(500);
    const stepCount = draft.steps.length;
    const qCount = draft.questions.length;
    return `Got it. I drafted a request titled "${draft.title}" with ${stepCount} photo step${
      stepCount === 1 ? "" : "s"
    }${qCount ? ` and ${qCount} short question${qCount === 1 ? "" : "s"}` : ""}. Take a look on the right — you can edit anything before sending.`;
  },
};

function titleFromPrompt(prompt: string, fallback: string): string {
  const cleaned = prompt.trim().replace(/^i (need|want)\s+/i, "").replace(/^photos? (for|of)\s+/i, "");
  if (!cleaned) return fallback;
  const short = cleaned.split(/[.!?]/)[0].slice(0, 60);
  return short.charAt(0).toUpperCase() + short.slice(1);
}
