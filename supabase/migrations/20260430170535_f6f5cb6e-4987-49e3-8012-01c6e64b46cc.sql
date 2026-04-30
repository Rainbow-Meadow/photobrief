-- citext for case-insensitive emails
CREATE EXTENSION IF NOT EXISTS citext;

-- =========================================================================
-- platform_admins (allowlist)
-- =========================================================================
CREATE TABLE public.platform_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid()
  );
$$;

CREATE POLICY "platform admins read self list"
  ON public.platform_admins FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "platform admins manage list"
  ON public.platform_admins FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Seed first admin (seed.business@photobrief.test)
INSERT INTO public.platform_admins (user_id, notes)
SELECT id, 'Initial seed admin (seed.business@photobrief.test)'
FROM auth.users
WHERE email = 'seed.business@photobrief.test'
ON CONFLICT (user_id) DO NOTHING;

-- =========================================================================
-- waitlist_entries
-- =========================================================================
CREATE TABLE public.waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  business_name text,
  email citext NOT NULL UNIQUE,
  business_type text,
  website text,
  use_case text,
  estimated_monthly_requests text,
  notes text,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','reviewed','invited','rejected','contacted')),
  source text NOT NULL DEFAULT 'web',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX waitlist_entries_status_idx ON public.waitlist_entries(status);
CREATE INDEX waitlist_entries_created_at_idx ON public.waitlist_entries(created_at DESC);

ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;

-- Inserts come from the edge function (service role); no anon insert policy needed.
CREATE POLICY "waitlist admin read"
  ON public.waitlist_entries FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "waitlist admin update"
  ON public.waitlist_entries FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "waitlist admin delete"
  ON public.waitlist_entries FOR DELETE
  TO authenticated
  USING (public.is_platform_admin());

CREATE TRIGGER waitlist_entries_updated_at
  BEFORE UPDATE ON public.waitlist_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- beta_invites
-- =========================================================================
CREATE TABLE public.beta_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL,
  business_name text,
  workspace_id uuid,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  token_hash text NOT NULL,
  token_prefix text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','expired','revoked')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX beta_invites_token_hash_idx ON public.beta_invites(token_hash);
CREATE UNIQUE INDEX beta_invites_one_pending_per_email
  ON public.beta_invites(email)
  WHERE status = 'pending';
CREATE INDEX beta_invites_status_idx ON public.beta_invites(status);

ALTER TABLE public.beta_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "beta invites admin read"
  ON public.beta_invites FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY "beta invites admin write"
  ON public.beta_invites FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE TRIGGER beta_invites_updated_at
  BEFORE UPDATE ON public.beta_invites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();