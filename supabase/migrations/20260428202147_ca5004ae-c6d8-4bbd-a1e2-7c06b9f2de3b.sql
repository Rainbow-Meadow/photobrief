-- =========================================================
-- workspace_sms_config: per-workspace Twilio credentials
-- =========================================================
CREATE TABLE public.workspace_sms_config (
  workspace_id UUID PRIMARY KEY REFERENCES public.business_workspaces(id) ON DELETE CASCADE,
  account_sid TEXT NOT NULL,
  api_key_sid TEXT NOT NULL,
  api_key_secret TEXT NOT NULL,                 -- service-role-only readable
  api_key_secret_last4 TEXT NOT NULL,           -- safe-to-display hint
  from_number TEXT,                             -- E.164
  from_number_friendly TEXT,
  default_channel TEXT NOT NULL DEFAULT 'email' CHECK (default_channel IN ('email','sms','both')),
  enabled BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  last_error TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_sms_config ENABLE ROW LEVEL SECURITY;

-- Members can read everything EXCEPT api_key_secret. We enforce this with
-- column privileges: revoke SELECT on the secret column from authenticated.
REVOKE ALL ON public.workspace_sms_config FROM authenticated;
GRANT SELECT (
  workspace_id, account_sid, api_key_sid, api_key_secret_last4,
  from_number, from_number_friendly, default_channel, enabled,
  verified_at, last_error, created_by, created_at, updated_at
) ON public.workspace_sms_config TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.workspace_sms_config TO authenticated;

-- Service role retains full access (default).

CREATE POLICY "sms config read by members"
  ON public.workspace_sms_config FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "sms config write by admins"
  ON public.workspace_sms_config FOR ALL
  TO authenticated
  USING (public.has_workspace_role(workspace_id, 'admin'::member_role))
  WITH CHECK (public.has_workspace_role(workspace_id, 'admin'::member_role));

CREATE TRIGGER trg_workspace_sms_config_updated
  BEFORE UPDATE ON public.workspace_sms_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- sms_send_log
-- =========================================================
CREATE TABLE public.sms_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.business_workspaces(id) ON DELETE CASCADE,
  request_id UUID,
  to_number TEXT NOT NULL,
  from_number TEXT NOT NULL,
  body TEXT NOT NULL,
  twilio_message_sid TEXT,
  status TEXT NOT NULL DEFAULT 'queued',        -- queued|sent|delivered|failed|undelivered
  error_code TEXT,
  error_message TEXT,
  cost_amount NUMERIC,
  cost_currency TEXT,
  sent_by UUID,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.sms_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms log read by members"
  ON public.sms_send_log FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

-- Only service role writes (edge functions). No authenticated insert/update.

CREATE INDEX idx_sms_log_workspace_sent_at
  ON public.sms_send_log (workspace_id, sent_at DESC);
CREATE INDEX idx_sms_log_request
  ON public.sms_send_log (request_id) WHERE request_id IS NOT NULL;

-- =========================================================
-- sms_suppressions
-- =========================================================
CREATE TABLE public.sms_suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.business_workspaces(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT 'stop',          -- stop|invalid|complaint|manual
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB,
  UNIQUE (workspace_id, phone_number)
);

ALTER TABLE public.sms_suppressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms suppressions read by members"
  ON public.sms_suppressions FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "sms suppressions manual add by admin"
  ON public.sms_suppressions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_workspace_role(workspace_id, 'admin'::member_role));

CREATE POLICY "sms suppressions delete by admin"
  ON public.sms_suppressions FOR DELETE
  TO authenticated
  USING (public.has_workspace_role(workspace_id, 'admin'::member_role));

-- =========================================================
-- request_messages: add direction column for inbound SMS
-- =========================================================
ALTER TABLE public.request_messages
  ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'outbound'
  CHECK (direction IN ('outbound','inbound'));

-- =========================================================
-- Notification trigger for SMS messages
-- =========================================================
DROP TRIGGER IF EXISTS trg_notify_request_message ON public.request_messages;

CREATE TRIGGER trg_notify_request_message
  AFTER INSERT ON public.request_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_request_message();
