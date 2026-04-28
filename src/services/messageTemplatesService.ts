import { supabase } from "@/integrations/supabase/client";

export interface MessageTemplate {
  id: string;
  workspaceId: string;
  name: string;
  kind: "initial" | "reminder" | "followup" | "custom";
  subject: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export const messageTemplatesService = {
  async list(workspaceId: string): Promise<MessageTemplate[]> {
    const { data, error } = await supabase
      .from("message_templates")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("name");
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      workspaceId: r.workspace_id,
      name: r.name,
      kind: r.kind as MessageTemplate["kind"],
      subject: r.subject,
      body: r.body,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  },

  async create(input: Omit<MessageTemplate, "id" | "createdAt" | "updatedAt">) {
    const { data, error } = await supabase
      .from("message_templates")
      .insert({
        workspace_id: input.workspaceId,
        name: input.name,
        kind: input.kind,
        subject: input.subject,
        body: input.body,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id: string) {
    const { error } = await supabase.from("message_templates").delete().eq("id", id);
    if (error) throw error;
  },
};
