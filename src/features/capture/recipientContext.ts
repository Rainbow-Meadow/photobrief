// Lookup mock branding for a recipient token. Mock-only for Phase 2.
import { guideTemplates } from "@/config/guideTemplates";
import { mockRequests, mockWorkspace } from "@/config/mockData";
import type { PhotoGuide } from "@/types/photobrief";

export interface RecipientContext {
  businessName: string;
  brandColor?: string;
  introBody?: string;
  guide: PhotoGuide;
}

const DEFAULT_GUIDE_ID = "guide_leak";

/** Resolve the guide + branding for a given recipient token (mock). */
export function getRecipientContext(token: string | undefined): RecipientContext {
  const req = mockRequests.find((r) => r.token === token);
  const guideId = req?.guideId ?? DEFAULT_GUIDE_ID;
  const guide =
    guideTemplates.find((g) => g.id === guideId) ?? guideTemplates[0];
  return {
    businessName: mockWorkspace.name,
    brandColor: undefined,
    introBody: req
      ? `Thanks for reaching out, ${req.recipientName.split(" ")[0]}. I'll walk you through a few quick photos.`
      : undefined,
    guide,
  };
}
