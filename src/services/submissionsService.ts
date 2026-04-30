// Submissions service — thin Supabase wrapper.
// Combines submissions + captured_media + extracted_details + internal_notes
// into the legacy Submission shape so existing UI keeps working.

import { supabase } from "@/integrations/supabase/client";
import { getTokenClient } from "@/integrations/supabase/tokenClient";
import type {
  Submission,
  SubmissionShot,
  SubmissionStatus,
  ExtractedDetail,
  InternalNote,
} from "@/types/photobrief";

function publicUrl(path: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  const { data } = supabase.storage.from("submission-media").getPublicUrl(path);
  return data.publicUrl;
}

async function hydrate(
  row: any,
  shotsRows: any[],
  detailsRows: any[],
  notesRows: any[],
): Promise<Submission> {
  const shots: SubmissionShot[] = (shotsRows ?? []).map((m) => ({
    id: m.id,
    stepId: m.step_id ?? undefined,
    orderIndex: 0,
    title: m.note ?? "Photo",
    shotType: "wide",
    imageUrl: publicUrl(m.file_url),
    capturedAt: m.created_at,
    feedback: m.ai_feedback ?? undefined,
    reviewStatus: (m.status === "approved" || m.status === "rejected" || m.status === "resubmitted")
      ? m.status
      : "pending",
    reviewComment: m.review_comment ?? undefined,
    reviewedAt: m.reviewed_at ?? undefined,
  }));
  const extractedDetails: ExtractedDetail[] = (detailsRows ?? []).map((d) => ({
    label: d.label,
    value: d.value ?? "",
    confidence: d.confidence ?? undefined,
  }));
  const internalNotes: InternalNote[] = (notesRows ?? []).map((n) => ({
    id: n.id,
    authorName: "Team member",
    authorInitials: "TM",
    body: n.note,
    createdAt: n.created_at,
  }));

  return {
    id: row.id,
    requestId: row.request_id,
    recipientName: row.submitter_name ?? "Recipient",
    recipientContact: row.submitter_contact ?? undefined,
    guideName: row.guide_name ?? "",
    requestType: row.guide_name ?? undefined,
    status: row.status as SubmissionStatus,
    readinessScore: row.readiness_score ?? 0,
    aiSummary: row.ai_summary ?? "",
    suggestedNextAction: row.next_action ?? "",
    submittedAt: row.submitted_at ?? row.created_at,
    missingItems: Array.isArray(row.missing_items) ? (row.missing_items as string[]) : [],
    shots,
    extractedDetails,
    internalNotes,
    activity: [],
    customerAnswers: [],
  };
}

export const submissionsService = {
  async list(workspaceId: string): Promise<Submission[]> {
    const { data, error } = await supabase
      .from("submissions")
      .select("*, photo_brief_requests!inner(guide_id, photo_guides(name))")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const rows = (data ?? []).map((r: any) => ({
      ...r,
      guide_name: r.photo_brief_requests?.photo_guides?.name ?? "",
    }));

    // Hydrate without per-row queries for the list view (shots/details lazy).
    return Promise.all(rows.map((r: any) => hydrate(r, [], [], [])));
  },

  async getById(id: string): Promise<Submission | null> {
    const { data, error } = await supabase
      .from("submissions")
      .select("*, photo_brief_requests!inner(guide_id, photo_guides(name))")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const [shotsRes, detailsRes, notesRes] = await Promise.all([
      supabase.from("captured_media").select("*").eq("submission_id", id),
      supabase.from("extracted_details").select("*").eq("submission_id", id),
      supabase.from("internal_notes").select("*").eq("submission_id", id),
    ]);

    return hydrate(
      { ...data, guide_name: (data as any).photo_brief_requests?.photo_guides?.name ?? "" },
      shotsRes.data ?? [],
      detailsRes.data ?? [],
      notesRes.data ?? [],
    );
  },

  async countByStatus(workspaceId: string, status: SubmissionStatus): Promise<number> {
    const { count, error } = await supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", status);
    if (error) throw error;
    return count ?? 0;
  },

  async updateStatus(id: string, status: SubmissionStatus): Promise<void> {
    const patch: { status: SubmissionStatus; reviewed_at?: string } = { status };
    if (status === "reviewed") patch.reviewed_at = new Date().toISOString();
    const { error } = await supabase.from("submissions").update(patch).eq("id", id);
    if (error) throw error;
  },

  async assignViaRequest(requestId: string, userId: string | null): Promise<void> {
    const { error } = await supabase
      .from("photo_brief_requests")
      .update({ assigned_to: userId })
      .eq("id", requestId);
    if (error) throw error;
  },

  async addInternalNote(args: {
    submissionId: string;
    workspaceId: string;
    body: string;
  }): Promise<InternalNote> {
    const { data: user } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("internal_notes")
      .insert({
        submission_id: args.submissionId,
        workspace_id: args.workspaceId,
        user_id: user.user?.id ?? null,
        note: args.body,
      })
      .select()
      .single();
    if (error) throw error;
    const meta = (user.user?.user_metadata ?? {}) as Record<string, unknown>;
    const profileName =
      (typeof meta.name === "string" && meta.name) ||
      (typeof meta.full_name === "string" && meta.full_name) ||
      user.user?.email ||
      "You";
    const initials = String(profileName)
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toUpperCase();
    return {
      id: data.id,
      authorName: String(profileName),
      authorInitials: initials || "YO",
      body: data.note,
      createdAt: data.created_at,
    };
  },

  /**
   * Reviewer-side: reject one or more captured shots, append per-shot
   * comments, push the submission back to "needs_more", and record an
   * audit entry that powers first/second-pass acceptance metrics.
   */
  async rejectShots(args: {
    submissionId: string;
    workspaceId: string;
    items: { mediaId: string; comment: string }[];
    summaryMessage: string;
  }): Promise<void> {
    if (args.items.length === 0) return;
    const reviewedAt = new Date().toISOString();

    // 1. Update each rejected captured_media row.
    for (const item of args.items) {
      const { error: medErr } = await supabase
        .from("captured_media")
        .update({
          status: "rejected",
          review_comment: item.comment || null,
          reviewed_at: reviewedAt,
        })
        .eq("id", item.mediaId);
      if (medErr) throw medErr;
    }

    // 2. Compute the next round number for this submission.
    const { data: prior, error: roundErr } = await supabase
      .from("submission_reviews")
      .select("round")
      .eq("submission_id", args.submissionId)
      .order("round", { ascending: false })
      .limit(1);
    if (roundErr) throw roundErr;
    const nextRound = (prior?.[0]?.round ?? 0) + 1;

    // 3. Insert the audit row (trigger updates first/second_pass_status).
    const { data: user } = await supabase.auth.getUser();
    const { error: revErr } = await supabase.from("submission_reviews").insert({
      submission_id: args.submissionId,
      workspace_id: args.workspaceId,
      reviewer_id: user.user?.id ?? null,
      action: "rejected",
      round: nextRound,
      summary_message: args.summaryMessage,
      rejected_media_ids: args.items.map((i) => i.mediaId),
    });
    if (revErr) throw revErr;

    // 4. Move submission to needs_more.
    const { error: statusErr } = await supabase
      .from("submissions")
      .update({ status: "needs_more" })
      .eq("id", args.submissionId);
    if (statusErr) throw statusErr;
  },

  /**
   * Reviewer-side: edit the AI-generated wording on a single shot's feedback
   * (business summary and/or suggested next action). Merges into the existing
   * `ai_feedback` jsonb so we don't lose severity, headline, checks, etc.
   * Pass `null` or "" for a field to clear it.
   */
  async updateShotFeedbackText(args: {
    mediaId: string;
    businessSummary?: string | null;
    suggestedNextAction?: string | null;
  }): Promise<void> {
    const { data: row, error: readErr } = await supabase
      .from("captured_media")
      .select("ai_feedback")
      .eq("id", args.mediaId)
      .maybeSingle();
    if (readErr) throw readErr;

    const current = (row?.ai_feedback ?? {}) as Record<string, unknown>;
    const next: Record<string, unknown> = { ...current };
    if (args.businessSummary !== undefined) {
      next.businessSummary = args.businessSummary === "" ? null : args.businessSummary;
    }
    if (args.suggestedNextAction !== undefined) {
      next.suggestedNextAction =
        args.suggestedNextAction === "" ? null : args.suggestedNextAction;
    }
    // Mark this row as human-edited so admin diff tooling can distinguish
    // raw model output from reviewer-corrected wording.
    next.editedAt = new Date().toISOString();

    const { error } = await supabase
      .from("captured_media")
      .update({ ai_feedback: next as any })
      .eq("id", args.mediaId);
    if (error) throw error;
  },

  /**
   * Recipient-side: create a submission row + upload media + insert captured_media.
   */
  async submitFromRecipient(args: {
    token: string;
    requestId: string;
    workspaceId: string;
    recipientName?: string;
    recipientContact?: string;
    /**
     * If a submission row was already created (e.g. lazily during the
     * chat capture flow so that captured_media inserts had a parent),
     * pass its id here. Otherwise a new row is created.
     */
    existingSubmissionId?: string;
    /** Photos that still need to be uploaded (most are already uploaded during capture). */
    photos: { stepId?: string; blob: Blob; ext: string; note?: string }[];
    answers: { questionId?: string; prompt: string; answer: string }[];
  }) {
    const client = getTokenClient(args.token);

    // 1. Create or finalize the submission.
    let submissionId = args.existingSubmissionId ?? null;
    if (submissionId) {
      const { error: updErr } = await client
        .from("submissions")
        .update({
          submitter_name: args.recipientName ?? null,
          submitter_contact: args.recipientContact ?? null,
          submitted_at: new Date().toISOString(),
        })
        .eq("id", submissionId);
      if (updErr) throw updErr;
    } else {
      const { data: subRow, error: subErr } = await client
        .from("submissions")
        .insert({
          request_id: args.requestId,
          workspace_id: args.workspaceId,
          submitter_name: args.recipientName ?? null,
          submitter_contact: args.recipientContact ?? null,
          status: "new",
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (subErr) throw subErr;
      submissionId = subRow.id;
    }

    // 2. Upload each remaining media file.
    for (const p of args.photos) {
      const filename = `${crypto.randomUUID()}.${p.ext}`;
      const path = `${args.workspaceId}/${args.requestId}/${filename}`;
      const { error: upErr } = await client.storage
        .from("submission-media")
        .upload(path, p.blob, { contentType: p.blob.type, upsert: false });
      if (upErr) throw upErr;

      const { error: medErr } = await client.from("captured_media").insert({
        submission_id: submissionId,
        step_id: p.stepId ?? null,
        file_url: path,
        status: "captured",
        note: p.note ?? null,
      });
      if (medErr) throw medErr;
    }

    // 3. Mark the request submitted.
    await client
      .from("photo_brief_requests")
      .update({ status: "submitted" })
      .eq("id", args.requestId);

    // 4. Fire-and-forget AI summary (server reads from DB and persists results).
    supabase.functions
      .invoke("ai-summarize-submission", { body: { submissionId } })
      .catch((e) => console.warn("summary trigger failed", e));

    return { id: submissionId };
  },
};
