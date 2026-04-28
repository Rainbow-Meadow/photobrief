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
  full_area: {
    id: "full_area",
    label: "Full area",
    description: "Wide shot showing the whole scene with context.",
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
