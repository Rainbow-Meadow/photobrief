// Resolve recipient context (request + guide + branding) for a token.
// Used by the public recipient page. Falls back to the local launch
// templates if the token resolves a guide that exists only in config.

import { getTokenClient } from "@/integrations/supabase/tokenClient";
import { guideTemplates } from "@/config/guideTemplates";
import { guidesService } from "@/services/guidesService";
import type { PhotoGuide } from "@/types/photobrief";

export interface RecipientContext {
  requestId: string | null;
  workspaceId: string | null;
  recipientName: string;
  businessName: string;
  brandColor?: string;
  introBody?: string;
  completionBody?: string;
  logoUrl?: string;
  guide: PhotoGuide;
}

const DEFAULT_GUIDE = guideTemplates[0];

export async function loadRecipientContext(
  token: string | undefined,
): Promise<RecipientContext> {
  if (!token) {
    return {
      requestId: null,
      workspaceId: null,
      recipientName: "",
      businessName: "Your business",
      guide: DEFAULT_GUIDE,
    };
  }

  const client = getTokenClient(token);

  const { data: req } = await client
    .from("photo_brief_requests")
    .select("id, workspace_id, guide_id, recipient_name")
    .eq("token", token)
    .maybeSingle();

  if (!req) {
    return {
      requestId: null,
      workspaceId: null,
      recipientName: "",
      businessName: "Your business",
      guide: DEFAULT_GUIDE,
    };
  }

  const [{ data: ws }, { data: brand }, guide] = await Promise.all([
    client
      .from("business_workspaces")
      .select("name")
      .eq("id", req.workspace_id)
      .maybeSingle(),
    client
      .from("brand_profiles")
      .select("logo_url, primary_color, intro_message, completion_message")
      .eq("workspace_id", req.workspace_id)
      .maybeSingle(),
    req.guide_id
      ? guidesService.getByIdViaToken(token, req.guide_id)
      : Promise.resolve(DEFAULT_GUIDE),
  ]);

  const firstName = (req.recipient_name ?? "").split(" ")[0] || "there";
  const businessName = ws?.name ?? "Your business";

  return {
    requestId: req.id,
    workspaceId: req.workspace_id,
    recipientName: req.recipient_name ?? "",
    businessName,
    brandColor: brand?.primary_color ?? undefined,
    logoUrl: brand?.logo_url ?? undefined,
    introBody:
      brand?.intro_message ??
      `Hi ${firstName}! ${businessName} here — I'll walk you through a few quick photos.`,
    completionBody: brand?.completion_message ?? undefined,
    guide: guide ?? DEFAULT_GUIDE,
  };
}
