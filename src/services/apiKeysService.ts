// Workspace API key management (Phase 4: public API).
// Plaintext key is shown ONCE on creation; only the hash is stored.
import { supabase } from "@/integrations/supabase/client";

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateApiKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `pb_${hex}`;
}

export const apiKeysService = {
  async list(workspaceId: string): Promise<ApiKey[]> {
    const { data, error } = await supabase
      .from("workspace_api_keys")
      .select("id, name, key_prefix, created_at, last_used_at, revoked_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(workspaceId: string, name: string): Promise<{ key: string; record: ApiKey }> {
    const rawKey = generateApiKey();
    const key_hash = await sha256Hex(rawKey);
    const key_prefix = rawKey.slice(0, 8); // "pb_xxxxx"
    const { data, error } = await supabase
      .from("workspace_api_keys")
      .insert({ workspace_id: workspaceId, name, key_prefix, key_hash })
      .select("id, name, key_prefix, created_at, last_used_at, revoked_at")
      .single();
    if (error) throw error;
    return { key: rawKey, record: data as ApiKey };
  },

  async revoke(id: string): Promise<void> {
    const { error } = await supabase
      .from("workspace_api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },
};
