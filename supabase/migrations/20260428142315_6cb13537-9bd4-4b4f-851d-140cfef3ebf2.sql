CREATE TABLE IF NOT EXISTS public.workspace_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.business_workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS workspace_api_keys_ws_idx ON public.workspace_api_keys(workspace_id);
CREATE INDEX IF NOT EXISTS workspace_api_keys_hash_idx ON public.workspace_api_keys(key_hash);

ALTER TABLE public.workspace_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api keys read by members" ON public.workspace_api_keys
  FOR SELECT TO authenticated USING (public.is_workspace_member(workspace_id));

CREATE POLICY "api keys write by admin" ON public.workspace_api_keys
  FOR ALL TO authenticated
  USING (public.has_workspace_role(workspace_id, 'admin'::member_role))
  WITH CHECK (public.has_workspace_role(workspace_id, 'admin'::member_role));