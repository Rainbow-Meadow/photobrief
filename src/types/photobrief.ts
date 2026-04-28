// Shared PhotoBrief domain types — mirrors 03_Data_Model/01_entity_schema.md
// and 08_Config_Blueprints/types_photobrief.example.ts.

export type RequestStatus =
  | "draft"
  | "sent"
  | "in_progress"
  | "submitted"
  | "needs_action"
  | "reviewed"
  | "archived";

export type SubmissionStatus = "new" | "reviewed" | "needs_more" | "archived";

export type ShotType = "wide" | "close_up" | "label" | "serial" | "video" | "document";

export type OverlayType =
  | "full_area"
  | "close_up"
  | "label"
  | "serial_plate"
  | "before_after"
  | "scale_required";

export type AICheckType =
  | "blur"
  | "low_light"
  | "glare"
  | "unreadable_text"
  | "wrong_shot"
  | "cropped_subject"
  | "duplicate_image"
  | "missing_scale"
  | "missing_required_item"
  | "label_detected"
  | "serial_detected"
  | "receipt_detected"
  | "damage_visible"
  | "wide_shot_detected"
  | "close_up_detected"
  | "unsafe_condition";

export type AICheckSeverity = "pass" | "warn" | "fail";

export type ContextQuestionInputType =
  | "short_text"
  | "long_text"
  | "single_select"
  | "multi_select"
  | "number";

export type Plan = "free" | "pro" | "team";

export interface BusinessWorkspace {
  id: string;
  name: string;
  industry: string;
  plan: Plan;
}

export interface BrandProfile {
  workspaceId: string;
  logoUrl?: string;
  brandColor: string;
  introCopy?: string;
  completionCopy?: string;
}

export interface GuideStep {
  id: string;
  orderIndex: number;
  title: string;
  instructions: string;
  shotType: ShotType;
  overlayType: OverlayType;
  aiChecks: AICheckType[];
  required: boolean;
}

export interface ContextQuestion {
  id: string;
  orderIndex: number;
  prompt: string;
  inputType: ContextQuestionInputType;
  options?: string[];
  required: boolean;
}

/**
 * Curated categories shown in the public Guide Library.
 * Internal-only guides leave this undefined and stay hidden behind the
 * admin "Show internal templates" toggle.
 */
export type CuratedCategory =
  | "service_quote"
  | "property_proof"
  | "product_support"
  | "sales_listing"
  | "custom_intake";

export interface PhotoGuide {
  id: string;
  workspaceId?: string;
  name: string;
  category: string;
  description: string;
  isTemplate: boolean;
  steps: GuideStep[];
  questions: ContextQuestion[];
  /** Curated section in the launch-ready library. Omit to keep internal-only. */
  curatedCategory?: CuratedCategory;
  /** Short "best for" tagline shown on the guide card. */
  bestFor?: string;
  /** Rough recipient time-to-complete in minutes. */
  estimatedMinutes?: number;
  /** Minimum plan tier recommended for this guide. */
  recommendedPlan?: Plan;
  /** True when this guide is part of the curated launch catalog. */
  launchReady?: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
}

export interface PhotoBriefRequest {
  id: string;
  workspaceId: string;
  guideId: string;
  guideName: string;
  recipientName: string;
  recipientContact: string;
  token: string;
  status: RequestStatus;
  createdAt: string;
  /** 0-100 — latest known readiness score for this request. Undefined when nothing has been submitted yet. */
  readinessScore?: number;
  /** Short labels for items the recipient still owes (e.g. "Shut-off valve photo"). */
  missingItems?: string[];
  /** ISO timestamp of the last meaningful event (recipient action, AI feedback, reviewer comment). */
  lastActivityAt?: string;
  /** Optional assignee on the business side. */
  assigneeId?: string;
  assigneeName?: string;
}

export type ShotFeedbackSeverity = "pass" | "warn" | "fail";

export interface ShotAIFeedback {
  severity: ShotFeedbackSeverity;
  /** Short headline like "Sharp & well lit" or "Label is unreadable". */
  headline: string;
  /** One or two sentence explanation. */
  detail?: string;
  /** AI checks that were evaluated for this shot. */
  checks?: { type: AICheckType; severity: ShotFeedbackSeverity; label: string }[];
}

export interface SubmissionShot {
  id: string;
  /** Matches GuideStep.id when available, otherwise free-form. */
  stepId?: string;
  orderIndex: number;
  title: string;
  /** Recipient-facing instruction copy (mirrors GuideStep.instructions). */
  instructions?: string;
  shotType: ShotType;
  /** Image URL or data URL. May be undefined when missing. */
  imageUrl?: string;
  /** True when the recipient never captured this shot. */
  missing?: boolean;
  capturedAt?: string;
  feedback?: ShotAIFeedback;
}

export interface ExtractedDetail {
  /** e.g. "Model number", "Serial", "Capacity". */
  label: string;
  value: string;
  /** Optional confidence 0-1 from the AI extractor. */
  confidence?: number;
  /** Source step id for traceability. */
  sourceStepId?: string;
}

export interface CustomerAnswer {
  questionId?: string;
  prompt: string;
  answer: string;
}

export interface InternalNote {
  id: string;
  authorName: string;
  authorInitials: string;
  body: string;
  createdAt: string;
}

export type ActivityEventType =
  | "request_sent"
  | "recipient_opened"
  | "shot_uploaded"
  | "shot_retaken"
  | "answers_submitted"
  | "submission_received"
  | "ai_review_completed"
  | "reviewer_note"
  | "reminder_sent"
  | "more_photos_requested"
  | "marked_reviewed"
  | "archived";

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  label: string;
  detail?: string;
  actor?: string;
  at: string;
}

export interface Submission {
  id: string;
  requestId: string;
  recipientName: string;
  recipientContact?: string;
  guideName: string;
  /** Free-text request type label, falls back to guideName when omitted. */
  requestType?: string;
  status: SubmissionStatus;
  readinessScore: number; // 0-100
  aiSummary: string;
  suggestedNextAction: string;
  submittedAt: string;
  assigneeId?: string;
  assigneeName?: string;
  missingItems?: string[];
  extractedDetails?: ExtractedDetail[];
  shots?: SubmissionShot[];
  customerAnswers?: CustomerAnswer[];
  internalNotes?: InternalNote[];
  activity?: ActivityEvent[];
}

