import { supabase } from "@/integrations/supabase/client";

export interface WorkspaceInvite {
  id: string;
  email: string;
  role: "owner" | "admin" | "member";
  status: "pending" | "accepted" | "revoked" | "expired";
  createdAt: string;
  expiresAt: string;
  token: string;
}

export interface WorkspaceMemberRow {
  id: string;
  userId: string;
  role: "owner" | "admin" | "member";
  status: string;
  email?: string | null;
  name?: string | null;
}

export const teamService = {
  async listMembers(workspaceId: string): Promise<WorkspaceMemberRow[]> {
    const { data, error } = await supabase
      .from("workspace_members")
      .select("id, user_id, role, status")
      .eq("workspace_id", workspaceId);
    if (error) throw error;

    const userIds = (data ?? []).map((r) => r.user_id);
    let profiles: Record<string, { email: string | null; name: string | null }> = {};
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, email, name")
        .in("id", userIds);
      profiles = Object.fromEntries(
        (profs ?? []).map((p) => [p.id, { email: p.email, name: p.name }]),
      );
    }
    return (data ?? []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      role: r.role as WorkspaceMemberRow["role"],
      status: r.status,
      email: profiles[r.user_id]?.email,
      name: profiles[r.user_id]?.name,
    }));
  },

  async listInvites(workspaceId: string): Promise<WorkspaceInvite[]> {
    const { data, error } = await supabase
      .from("workspace_invites")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      email: r.email,
      role: r.role as WorkspaceInvite["role"],
      status: r.status as WorkspaceInvite["status"],
      createdAt: r.created_at,
      expiresAt: r.expires_at,
      token: r.token,
    }));
  },

  async invite(workspaceId: string, email: string, role: "admin" | "member" = "member") {
    const { data, error } = await supabase.functions.invoke("invite-team-member", {
      body: { workspaceId, email, role },
    });
    if (error) {
      const ctx = (error as { context?: { error?: string; requiredPlan?: string } }).context;
      const err = new Error(ctx?.error ?? error.message);
      (err as Error & { requiredPlan?: string }).requiredPlan = ctx?.requiredPlan;
      throw err;
    }
    return data as { ok: true; acceptUrl: string; delivery: string };
  },

  async revoke(inviteId: string) {
    const { error } = await supabase
      .from("workspace_invites")
      .update({ status: "revoked" })
      .eq("id", inviteId);
    if (error) throw error;
  },

  async accept(token: string) {
    const { data, error } = await supabase.functions.invoke("accept-team-invite", {
      body: { token },
    });
    if (error) {
      const ctx = (error as { context?: { error?: string } }).context;
      throw new Error(ctx?.error ?? error.message);
    }
    return data as { ok: true; workspaceId: string };
  },

  async updateAssignee(requestId: string, userId: string | null) {
    const { error } = await supabase
      .from("photo_brief_requests")
      .update({ assigned_to: userId })
      .eq("id", requestId);
    if (error) throw error;
  },
};
