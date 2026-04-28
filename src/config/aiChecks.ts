// AI quality check catalog with recipient-friendly coaching copy.
// Source of truth for 05_AI_System/01_ai_behavior_spec.md.
// Feedback should coach, not scold.
import type { AICheckType, AICheckSeverity } from "@/types/photobrief";

export interface AICheckDefinition {
  id: AICheckType;
  label: string;
  /** Whether this check tends to block submission or just inform. */
  defaultSeverity: AICheckSeverity;
  /** Coaching message shown to recipients when the check fails. */
  failMessage: string;
  /** Optional positive confirmation. */
  passMessage?: string;
}

export const aiChecks: Record<AICheckType, AICheckDefinition> = {
  blur: {
    id: "blur",
    label: "Sharpness",
    defaultSeverity: "fail",
    failMessage: "This shot is a little blurry. Hold steady and try again.",
    passMessage: "Nice and sharp.",
  },
  low_light: {
    id: "low_light",
    label: "Lighting",
    defaultSeverity: "fail",
    failMessage: "The photo is dark. Try turning on a light or using flash.",
  },
  glare: {
    id: "glare",
    label: "Glare",
    defaultSeverity: "warn",
    failMessage: "There's some glare. Try a slight angle to avoid the reflection.",
  },
  unreadable_text: {
    id: "unreadable_text",
    label: "Readable text",
    defaultSeverity: "fail",
    failMessage: "The label is too blurry to read. Retake closer and straight-on.",
  },
  wrong_shot: {
    id: "wrong_shot",
    label: "Right subject",
    defaultSeverity: "fail",
    failMessage: "This looks like a different subject than we asked for.",
  },
  cropped_subject: {
    id: "cropped_subject",
    label: "Framing",
    defaultSeverity: "warn",
    failMessage: "Part of the subject is cut off. Try stepping back a bit.",
  },
  duplicate_image: {
    id: "duplicate_image",
    label: "Unique photo",
    defaultSeverity: "warn",
    failMessage: "This looks like the same photo as a previous step.",
  },
  missing_scale: {
    id: "missing_scale",
    label: "Scale reference",
    defaultSeverity: "warn",
    failMessage: "The damage is visible, but there is no scale reference.",
  },
  missing_required_item: {
    id: "missing_required_item",
    label: "Required item visible",
    defaultSeverity: "fail",
    failMessage: "We can't see the item we asked about. Make sure it's in frame.",
  },
  label_detected: {
    id: "label_detected",
    label: "Label detected",
    defaultSeverity: "pass",
    failMessage: "",
    passMessage: "Label detected — thanks!",
  },
  serial_detected: {
    id: "serial_detected",
    label: "Serial detected",
    defaultSeverity: "pass",
    failMessage: "",
    passMessage: "Serial number captured.",
  },
  receipt_detected: {
    id: "receipt_detected",
    label: "Receipt detected",
    defaultSeverity: "pass",
    failMessage: "",
    passMessage: "Receipt captured.",
  },
  damage_visible: {
    id: "damage_visible",
    label: "Damage visible",
    defaultSeverity: "pass",
    failMessage: "",
    passMessage: "Damage clearly visible.",
  },
  wide_shot_detected: {
    id: "wide_shot_detected",
    label: "Wide shot detected",
    defaultSeverity: "pass",
    failMessage: "",
    passMessage: "Good wide angle.",
  },
  close_up_detected: {
    id: "close_up_detected",
    label: "Close-up detected",
    defaultSeverity: "pass",
    failMessage: "",
    passMessage: "Nice close-up.",
  },
  unsafe_condition: {
    id: "unsafe_condition",
    label: "Unsafe condition flag",
    defaultSeverity: "warn",
    failMessage: "This looks like a potential safety issue. Please be careful and step back if needed.",
  },
  // Canonical workbook aliases
  serial_model_detected: {
    id: "serial_model_detected",
    label: "Serial / model detected",
    defaultSeverity: "pass",
    failMessage: "",
    passMessage: "Serial / model captured.",
  },
  receipt_order_detected: {
    id: "receipt_order_detected",
    label: "Receipt / order detected",
    defaultSeverity: "pass",
    failMessage: "",
    passMessage: "Receipt / order captured.",
  },
  unsafe_condition_flag: {
    id: "unsafe_condition_flag",
    label: "Unsafe condition flag",
    defaultSeverity: "warn",
    failMessage: "This looks like a potential safety issue. Please be careful and step back if needed.",
  },
};
