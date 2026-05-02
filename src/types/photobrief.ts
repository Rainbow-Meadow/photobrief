// Shared PhotoBrief domain types — aligned with Supabase schema and app flows.

export type RequestStatus =
  | "draft"
  | "sent"
  | "opened"
  | "in_progress"
  | "needs_customer_action"
  | "submitted"
  | "ready_to_review"
  | "reviewed"
  | "archived"
  | "expired";

export type SubmissionStatus = "new" | "reviewed" | "needs_more" | "archived";

/**
 * Capture type — mirrors DB `capture_type` enum.
 * Workbook uses photo|label|document; legacy values kept for request-builder UI compatibility.
 */
export type ShotType =
  | "photo"
  | "label"
  | "document"
  | "video"
  | "note"
  | "measurement"
  | "wide"
  | "close_up"
  | "serial";

/** Overlay type — mirrors DB `overlay_type` enum plus legacy builder aliases. */
export type OverlayType =
  | "wide_scene"
  | "close_up"
  | "damage_closeup"
  | "document_label"
  | "model_serial_plate"
  | "receipt_order"
  | "before_after_alignment"
  | "square_product_crop"
  | "vertical_story_crop"
  | "scale_reference"
  | "video_motion"
  | "custom"
  | "full_area"
  | "label"
  | "serial_plate"
  | "before_after"
  | "scale_required";

/** AI check type — mirrors DB `ai_check_type` enum plus legacy aliases used by templates. */
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
  | "serial_model_detected"
  | "receipt_order_detected"
  | "damage_visible"
  | "wide_shot_detected"
  | "close_up_detected"
  | "unsafe_condition_flag"
  | "serial_detected"
  | "receipt_detected"
  | "unsafe_condition";

export type AICheckSeverity = "pass" | "warn" | "fail" | "unavailable";

export type ContextQuestionInputType =
  | "short_text"
  | "long_text"
  | "single_select"
  | "multi_select"
  | "number"
  | "yes_no"
  | "date"
  | "phone"
  | "email";

/** Workflow archetype — one of the capture archetypes from the Template Directory. */
export type WorkflowType =
  | "service_repair"
  | "equipment_service"
  | "quote_scope"
  | "proof_claim"
  | "property_intake"
  | "condition_report"
  | "label_proof"
  | "listing"
  | "marketing_capture"
  | "before_after"
  | "care_diagnostic"
  | "care_intake"
  | "vehicle_service"
  | "vehicle_body";

/** Plan tiers — mirrors DB `plan_tier` enum. */
export type Plan = "free" | "starter" | "pro" | "team" | "business";

export type BillingInterval = "monthly" | "annual";

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

/** Curated topline category — mirrors DB `topline_category` enum. */
export type CuratedCategory =
  | "field_service_quote_intake"
  | "property_realestate_claims"
  | "commerce_warranty_resale"
  | "care_health_living_systems"
  | "marketing_content_capture";

export interface PhotoGuide {
  id: string;
  workspaceId?: string;
  name: string;
  category: string;
  description: string;
  isTemplate: boolean;
  steps: GuideStep[];
  questions: ContextQuestion[];
  curatedCategory?: CuratedCategory;
  nestedCategory?: string;
  workflowType?: WorkflowType;
  bestFor?: string;
  estimatedMinutes?: number;
  recommendedPlan?: Plan;
  launchReady?: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
}

/**
 * Canonical values mirror DB `review_pass_status`.
 * Legacy aliases are kept temporarily for existing requests_inbox_view rows until
 * that view is regenerated after the managed DB migrations apply.
 */
export type PassStatus =
  | "pending"
  | "passed"
  | "failed"
  | "needs_more"
  | "not_applicable"
  | "accepted"
  | "rework"
  | "n_a";

export interface PhotoBriefRequest {
  id: string;
  workspaceId: string;
  guideId: string;
  guideName: string;
  recipientName: string;
  recipientContact: string;
  recipientEmail?: string;
  recipientPhone?: string;
  token: string;
  status: RequestStatus;
  createdAt: string;
  readinessScore?: number;
  missingItems?: string[];
  lastActivityAt?: string;
  assigneeId?: string;
  assigneeName?: string;
  firstPassStatus?: PassStatus;
  secondPassStatus?: PassStatus;
}

export type ShotFeedbackSeverity = "pass" | "warn" | "fail" | "unavailable";

export interface ShotAIFeedback {
  severity: ShotFeedbackSeverity;
  headline: string;
  detail?: string;
  checks?: { type: AICheckType; severity: ShotFeedbackSeverity; label: string }[];
  confidence?: number;
  flags?: string[];
  businessSummary?: string;
  suggestedNextAction?: string;
}

export type ShotReviewStatus = "pending" | "approved" | "rejected" | "resubmitted";

export interface SubmissionShot {
  id: string;
  stepId?: string;
  orderIndex: number;
  title: string;
  instructions?: string;
  shotType: ShotType;
  imageUrl?: string;
  missing?: boolean;
  capturedAt?: string;
  feedback?: ShotAIFeedback;
  reviewStatus?: ShotReviewStatus;
  reviewComment?: string;
  reviewedAt?: string;
}

export interface ExtractedDetail {
  label: string;
  value: string;
  confidence?: number;
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
  requestType?: string;
  status: SubmissionStatus;
  readinessScore: number;
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
