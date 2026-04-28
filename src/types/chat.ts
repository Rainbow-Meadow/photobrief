// Chat-first capture types. Generic over any PhotoGuide.
import type {
  AICheckType,
  AICheckSeverity,
  ContextQuestion,
  GuideStep,
} from "@/types/photobrief";

export interface AICheckResultMock {
  id: AICheckType;
  severity: AICheckSeverity;
  message: string;
}

export interface CapturedPhoto {
  stepId: string;
  /** data URL of preview, or a placeholder image when simulated. */
  previewUrl: string;
  takenAt: string;
  checks: AICheckResultMock[];
  /** True if recipient chose "Use anyway" despite warnings/fails. */
  acceptedDespiteWarnings: boolean;
  /** Storage path inside `submission-media` once uploaded. */
  storagePath?: string;
  /** Public URL of the uploaded file (set after upload). */
  publicUrl?: string;
  /** captured_media row id (set after server insert). */
  capturedMediaId?: string;
}

export interface AnsweredQuestion {
  questionId: string;
  prompt: string;
  answer: string;
}

/** Discriminated union of everything that can appear in the ChatThread. */
export type ChatMessage =
  | { id: string; kind: "assistant_text"; text: string }
  | { id: string; kind: "user_text"; text: string }
  | { id: string; kind: "photo_prompt"; step: GuideStep; index: number; total: number }
  | { id: string; kind: "capture_card"; step: GuideStep; pending: boolean }
  | { id: string; kind: "user_photo"; photo: CapturedPhoto }
  | { id: string; kind: "ai_feedback"; photo: CapturedPhoto; verdict: AICheckSeverity }
  | { id: string; kind: "retake_decision"; photo: CapturedPhoto; step: GuideStep }
  | { id: string; kind: "question"; question: ContextQuestion }
  | { id: string; kind: "review_summary" }
  | { id: string; kind: "submit_confirmation" };

export type FlowPhase =
  | "intro"
  | "capturing"
  | "questions"
  | "review"
  | "submitted";
