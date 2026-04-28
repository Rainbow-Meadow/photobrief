// Deprecated: kept as a thin shim over aiService for backwards compatibility.
// New code should import from "@/services/aiService" directly.
import { aiService } from "@/services/aiService";
import type { RequestDraft } from "@/types/requestDraft";

export const requestBuilderAi = {
  async generateRequestDraft(prompt: string): Promise<RequestDraft> {
    const { draft } = await aiService.generateGuideFromPrompt({ prompt });
    return draft;
  },
  async assistantReply(prompt: string, _draft: RequestDraft): Promise<string> {
    const { assistantReply } = await aiService.generateGuideFromPrompt({ prompt });
    return assistantReply;
  },
};
