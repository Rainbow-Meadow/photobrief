import { supabase } from "@/integrations/supabase/client";

export type RequestMessageKind = "initial" | "reminder" | "followup" | "custom";
export type RequestMessageChannel = "email" | "sms" | "both";
export type RequestMessageDirection = "outbound" | "inbound";

export interface RequestMessage {
  id: string;
  requestId: string;
  workspaceId: string;
  kind: RequestMessageKind;
  channel: RequestMessageChannel;
  direction: RequestMessageDirection;
  toAddress: string | null;
  subject: string | null;
  body: string | null;
  sentAt: string;
  sentBy: string | null;
  metadata: Record<string, unknown>;
}

export const messagingService = {
  async list(requestId: string): Promise<RequestMessage[]> {
    const { data, error } = await supabase
      .from("request_messages")
      .select("*")
      .eq("request_id", requestId)
      .order("sent_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      requestId: r.request_id,
      workspaceId: r.workspace_id,
      kind: r.kind as RequestMessageKind,
      channel: (r.channel ?? "email") as RequestMessageChannel,
      direction: (r.direction ?? "outbound") as RequestMessageDirection,
      toAddress: r.to_address,
      subject: r.subject,
      body: r.body,
      sentAt: r.sent_at,
      sentBy: r.sent_by,
      metadata: (r.metadata ?? {}) as Record<string, unknown>,
    }));
  },

  async send(input: {
    requestId: string;
    kind: RequestMessageKind;
    subject?: string;
    body?: string;
    missingItems?: string[];
    channel?: "email" | "sms" | "both";
  }) {
    const { data, error } = await supabase.functions.invoke("send-recipient-message", {
      body: input,
    });
    if (error) {
      // surface plan-locked + other errors with payload
      const ctx = (error as { context?: { error?: string; requiredPlan?: string } }).context;
      const err = new Error(ctx?.error ?? error.message);
      (err as Error & { requiredPlan?: string }).requiredPlan = ctx?.requiredPlan;
      throw err;
    }
    return data as { ok: true; delivery: "sent" | "logged_only" | "skipped" };
  },
};
