// Overlay framing presets used by the capture stepper and chat capture cards.
// Adding a new overlay = add an entry here, NOT a new component.
import type { OverlayType } from "@/types/photobrief";

export interface OverlayDefinition {
  id: OverlayType;
  label: string;
  description: string;
  /** Aspect ratio hint for the framing guide (width / height). */
  aspectRatio: number;
  /** Whether the recipient should hold the device a specific way. */
  orientation: "any" | "portrait" | "landscape";
}

export const overlayTypes: Record<OverlayType, OverlayDefinition> = {
  // ── Canonical workbook overlays ─────────────────────────────────────
  wide_scene: {
    id: "wide_scene",
    label: "Wide scene",
    description: "Stand back and capture the whole space for context.",
    aspectRatio: 4 / 3,
    orientation: "landscape",
  },
  close_up: {
    id: "close_up",
    label: "Close-up",
    description: "Tight shot of the subject with no extra background.",
    aspectRatio: 1,
    orientation: "any",
  },
  damage_closeup: {
    id: "damage_closeup",
    label: "Damage close-up",
    description: "Get close enough to see exactly what is damaged.",
    aspectRatio: 1,
    orientation: "any",
  },
  document_label: {
    id: "document_label",
    label: "Document / label",
    description: "Straight-on shot of a printed label or document so text is readable.",
    aspectRatio: 4 / 3,
    orientation: "any",
  },
  model_serial_plate: {
    id: "model_serial_plate",
    label: "Model / serial plate",
    description: "Plate or sticker showing the model and serial number.",
    aspectRatio: 4 / 3,
    orientation: "any",
  },
  receipt_order: {
    id: "receipt_order",
    label: "Receipt / order",
    description: "Photo of the receipt or order confirmation.",
    aspectRatio: 3 / 4,
    orientation: "portrait",
  },
  before_after_alignment: {
    id: "before_after_alignment",
    label: "Before / after alignment",
    description: "Two photos from the same angle for comparison.",
    aspectRatio: 4 / 3,
    orientation: "any",
  },
  square_product_crop: {
    id: "square_product_crop",
    label: "Square product crop",
    description: "Centered square crop of the product on a clean background.",
    aspectRatio: 1,
    orientation: "any",
  },
  vertical_story_crop: {
    id: "vertical_story_crop",
    label: "Vertical story crop",
    description: "Tall vertical frame ready for social stories or reels.",
    aspectRatio: 9 / 16,
    orientation: "portrait",
  },
  scale_reference: {
    id: "scale_reference",
    label: "With scale reference",
    description: "Include a coin, ruler, or hand to show real size.",
    aspectRatio: 4 / 3,
    orientation: "any",
  },
  video_motion: {
    id: "video_motion",
    label: "Short video",
    description: "Short video showing motion, sound, or behavior over time.",
    aspectRatio: 16 / 9,
    orientation: "landscape",
  },
  custom: {
    id: "custom",
    label: "Custom",
    description: "Free-form capture — no specific framing required.",
    aspectRatio: 4 / 3,
    orientation: "any",
  },

  // ── Legacy aliases ─────────────────────────────────────────────────
  full_area: {
    id: "full_area",
    label: "Full area",
    description: "Wide shot showing the whole scene with context.",
    aspectRatio: 4 / 3,
    orientation: "landscape",
  },
  label: {
    id: "label",
    label: "Label",
    description: "Straight-on shot of a printed label so text is readable.",
    aspectRatio: 4 / 3,
    orientation: "any",
  },
  serial_plate: {
    id: "serial_plate",
    label: "Serial / model plate",
    description: "Plate or sticker showing the model and serial number.",
    aspectRatio: 4 / 3,
    orientation: "any",
  },
  before_after: {
    id: "before_after",
    label: "Before / after",
    description: "Two photos from the same angle for comparison.",
    aspectRatio: 4 / 3,
    orientation: "any",
  },
  scale_required: {
    id: "scale_required",
    label: "With scale",
    description: "Include a coin, ruler, or hand to show real size.",
    aspectRatio: 4 / 3,
    orientation: "any",
  },
};
