// AI service — single client for all Lovable AI Gateway interactions.
// Phase 1: stub interfaces only. Phase 5+ wires these to edge functions
// (ai-check-photo, ai-generate-summary, ai-generate-guide,
// ai-request-builder-chat, ai-dashboard-assistant).
//
// All AI calls go through a backend edge function — never call models
// directly from the client.
import type { AICheckType, AICheckSeverity, PhotoGuide } from "@/types/photobrief";

export interface AICheckOutput {
  checkType: AICheckType;
  severity: AICheckSeverity;
  message: string;
}

export interface AISummaryOutput {
  readinessScore: number;
  summary: string;
  suggestedNextAction: string;
  missingItems: string[];
  extractedDetails: Array<{ key: string; value: string; confidence: number }>;
}

export const aiService = {
  /** Phase 5: POST /functions/v1/ai-check-photo */
  async checkPhoto(_input: {
    mediaUrl: string;
    stepId: string;
    expectedChecks: AICheckType[];
  }): Promise<AICheckOutput[]> {
    throw new Error("aiService.checkPhoto: not implemented until Phase 5");
  },
  /** Phase 5: POST /functions/v1/ai-generate-summary */
  async generateSummary(_input: { submissionId: string }): Promise<AISummaryOutput> {
    throw new Error("aiService.generateSummary: not implemented until Phase 5");
  },
  /** Phase 7/8: POST /functions/v1/ai-generate-guide */
  async generateGuide(_input: { prompt: string }): Promise<PhotoGuide> {
    throw new Error("aiService.generateGuide: not implemented until Phase 7");
  },
};
