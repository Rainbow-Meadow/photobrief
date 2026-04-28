// Requests service — thin Supabase wrapper.
// Authenticated workspace queries use the global `supabase` client (RLS by
// workspace membership). The public recipient flow uses a token-scoped
// client (see tokenClient.ts) so RLS can validate via x-request-token.

import { supabase } from "@/integrations/supabase/client";
import { getTokenClient } from "@/integrations/supabase/tokenClient";
import type { PhotoBriefRequest, RequestStatus } from "@/types/photobrief";

type Row = {
  id: string;
  workspace_id: string;
  guide_id: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  token: string;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
  assigned_to: string | null;
  custom_message: string | null;
  due_date: string | null;
};

function toDomain(
  row: Row,
  guideName: string | null,
  assigneeName: string | null,
  readinessScore?: number,
  missingItems?: string[],
  lastActivityAt?: string,
): PhotoBriefRequest {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    guideId: row.guide_id ?? "",
    guideName: guideName ?? "",
    recipientName: row.recipient_name ?? "",
    recipientContact: row.recipient_email ?? row.recipient_phone ?? "",
    token: row.token,
    status: row.status,
    createdAt: row.created_at,
    readinessScore,
    missingItems,
    lastActivityAt: lastActivityAt ?? row.updated_at,
    assigneeId: row.assigned_to ?? undefined,
    assigneeName: assigneeName ?? undefined,
  };
}

export interface CreateRequestInput {
  workspaceId: string;
  guideId: string | null;
  recipientName: string;
  recipientEmail?: string;
  recipientPhone?: string;
  customMessage?: string;
  status?: RequestStatus;
}

export const requestsService = {
  async list(workspaceId: string): Promise<PhotoBriefRequest[]> {
    const { data, error } = await supabase
      .from("photo_brief_requests")
      .select("*, photo_guides(name)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    // Fetch readiness from latest submissions per request (single query).
    const ids = (data ?? []).map((r) => r.id);
    let subsByReq = new Map<string, { readiness: number | null; updated_at: string }>();
    if (ids.length > 0) {
      const { data: subs } = await supabase
        .from("submissions")
        .select("request_id, readiness_score, updated_at")
        .in("request_id", ids);
      for (const s of subs ?? []) {
        const prev = subsByReq.get(s.request_id);
        if (!prev || (s.updated_at ?? "") > prev.updated_at) {
          subsByReq.set(s.request_id, {
            readiness: s.readiness_score,
            updated_at: s.updated_at ?? "",
          });
        }
      }
    }

    return (data ?? []).map((row: any) => {
      const sub = subsByReq.get(row.id);
      return toDomain(
        row,
        row.photo_guides?.name ?? null,
        null,
        sub?.readiness ?? undefined,
        undefined,
        sub?.updated_at || row.updated_at,
      );
    });
  },

  async getById(id: string): Promise<PhotoBriefRequest | null> {
    const { data, error } = await supabase
      .from("photo_brief_requests")
      .select("*, photo_guides(name)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return toDomain(data as any, (data as any).photo_guides?.name ?? null, null);
  },

  async getByToken(token: string): Promise<PhotoBriefRequest | null> {
    const client = getTokenClient(token);
    const { data, error } = await client
      .from("photo_brief_requests")
      .select("*, photo_guides(name)")
      .eq("token", token)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return toDomain(data as any, (data as any).photo_guides?.name ?? null, null);
  },

  async create(input: CreateRequestInput): Promise<PhotoBriefRequest> {
    const { data: user } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("photo_brief_requests")
      .insert({
        workspace_id: input.workspaceId,
        guide_id: input.guideId,
        recipient_name: input.recipientName,
        recipient_email: input.recipientEmail ?? null,
        recipient_phone: input.recipientPhone ?? null,
        custom_message: input.customMessage ?? null,
        status: input.status ?? "sent",
        created_by: user.user?.id ?? null,
      })
      .select("*, photo_guides(name)")
      .single();
    if (error) throw error;
    return toDomain(data as any, (data as any).photo_guides?.name ?? null, null);
  },

  async updateStatus(id: string, status: RequestStatus) {
    const { error } = await supabase
      .from("photo_brief_requests")
      .update({ status })
      .eq("id", id);
    if (error) throw error;
  },
};
