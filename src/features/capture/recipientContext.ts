// Resolve recipient context (request + guide + branding) for a token.
// Used by the public recipient page. Falls back to the local launch
// templates if the token resolves a guide that exists only in config.

import { getTokenClient } from "@/integrations/supabase/tokenClient";
import { guideTemplates } from "@/config/guideTemplates";
import { guidesService } from "@/services/guidesService";
import type { PhotoGuide } from "@/types/photobrief";

export interface ResubmitItem {
  /** captured_media row id of the rejected shot (will be marked resubmitted). */
  rejectedMediaId: string;
  /** guide step id this rejection is tied to. */
  stepId: string;
  /** reviewer's per-shot comment shown to the recipient as guidance. */
  comment: string;
}

export interface ResubmitContext {
  submissionId: string;
  /** Aggregated reviewer message from the rejection round. */
  summaryMessage?: string;
  items: ResubmitItem[];
}

export interface RecipientContext {
  requestId: string | null;
  workspaceId: string | null;
  recipientName: string;
  businessName: string;
  brandColor?: string;
  introBody?: string;
  completionBody?: string;
  logoUrl?: string;
  hidePhotobriefBranding?: boolean;
  guide: PhotoGuide;
  /** Present when the latest submission has rejected shots awaiting rework. */
  resubmit?: ResubmitContext;
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
      .select("logo_url, primary_color, intro_message, completion_message, hide_photobrief_branding")
      .eq("workspace_id", req.workspace_id)
      .maybeSingle(),
    req.guide_id
      ? guidesService.getByIdViaToken(token, req.guide_id)
      : Promise.resolve(DEFAULT_GUIDE),
  ]);

  const firstName = (req.recipient_name ?? "").split(" ")[0] || "there";
  const businessName = ws?.name ?? "Your business";

  // Look for an in-flight rework: latest submission for this request that
  // has rejected captured_media rows.
  let resubmit: ResubmitContext | undefined;
  const { data: latestSub } = await client
    .from("submissions")
    .select("id, first_pass_status, second_pass_status")
    .eq("request_id", req.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestSub?.id) {
    const { data: rejected } = await client
      .from("captured_media")
      .select("id, step_id, review_comment")
      .eq("submission_id", latestSub.id)
      .eq("status", "rejected");

    if (rejected && rejected.length > 0) {
      const { data: lastReview } = await client
        .from("submission_reviews")
        .select("summary_message")
        .eq("submission_id", latestSub.id)
        .eq("action", "rejected")
        .order("round", { ascending: false })
        .limit(1)
        .maybeSingle();

      resubmit = {
        submissionId: latestSub.id,
        summaryMessage: lastReview?.summary_message ?? undefined,
        items: rejected
          .filter((r: any) => r.step_id)
          .map((r: any) => ({
            rejectedMediaId: r.id,
            stepId: r.step_id,
            comment: r.review_comment ?? "",
          })),
      };
    }
  }

  return {
    requestId: req.id,
    workspaceId: req.workspace_id,
    recipientName: req.recipient_name ?? "",
    businessName,
    brandColor: brand?.primary_color ?? undefined,
    logoUrl: brand?.logo_url ?? undefined,
    hidePhotobriefBranding: brand?.hide_photobrief_branding ?? false,
    introBody:
      brand?.intro_message ??
      `Hi ${firstName}! ${businessName} here — I'll walk you through a few quick photos.`,
    completionBody: brand?.completion_message ?? undefined,
    guide: guide ?? DEFAULT_GUIDE,
    resubmit,
  };
}
