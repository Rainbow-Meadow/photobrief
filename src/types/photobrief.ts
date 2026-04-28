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

export interface PhotoGuide {
  id: string;
  workspaceId?: string;
  name: string;
  category: string;
  description: string;
  isTemplate: boolean;
  steps: GuideStep[];
  questions: ContextQuestion[];
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
}

export interface Submission {
  id: string;
  requestId: string;
  recipientName: string;
  guideName: string;
  status: SubmissionStatus;
  readinessScore: number; // 0-100
  aiSummary: string;
  suggestedNextAction: string;
  submittedAt: string;
}
