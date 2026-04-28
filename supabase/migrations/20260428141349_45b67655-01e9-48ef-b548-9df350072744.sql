
-- 1. Plan seat caps helper
CREATE OR REPLACE FUNCTION public.plan_user_cap(_plan plan_tier)
RETURNS integer
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _plan
    WHEN 'free'     THEN 1
    WHEN 'starter'  THEN 1
    WHEN 'pro'      THEN 3
    WHEN 'team'     THEN 10
    WHEN 'business' THEN 25
  END;
$$;

-- 2. Workspace seat enforcement
CREATE OR REPLACE FUNCTION public.enforce_seat_cap()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ws_plan plan_tier;
  cap int;
  used int;
BEGIN
  SELECT plan_tier INTO ws_plan FROM public.business_workspaces WHERE id = NEW.workspace_id;
  IF ws_plan IS NULL THEN RETURN NEW; END IF;
  cap := public.plan_user_cap(ws_plan);
  SELECT COUNT(*)::int INTO used
  FROM public.workspace_members
  WHERE workspace_id = NEW.workspace_id AND status = 'active';
  IF cap IS NOT NULL AND used >= cap THEN
    RAISE EXCEPTION 'PLAN_SEAT_LIMIT_REACHED: % seats included on the % plan', cap, ws_plan
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_seat_cap ON public.workspace_members;
CREATE TRIGGER trg_enforce_seat_cap
  BEFORE INSERT ON public.workspace_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_seat_cap();

-- 3. Custom-guides gating (Pro+)
CREATE OR REPLACE FUNCTION public.enforce_custom_guides_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ws_plan plan_tier;
BEGIN
  IF NEW.workspace_id IS NULL OR NEW.is_global_template THEN RETURN NEW; END IF;
  SELECT plan_tier INTO ws_plan FROM public.business_workspaces WHERE id = NEW.workspace_id;
  IF ws_plan NOT IN ('pro','team','business') THEN
    RAISE EXCEPTION 'PLAN_FEATURE_LOCKED: custom_guides requires Pro or higher (current: %)', ws_plan
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_custom_guides_plan ON public.photo_guides;
CREATE TRIGGER trg_custom_guides_plan
  BEFORE INSERT ON public.photo_guides
  FOR EACH ROW EXECUTE FUNCTION public.enforce_custom_guides_plan();

-- 4. Internal-notes gating (Pro+)
CREATE OR REPLACE FUNCTION public.enforce_internal_notes_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ws_plan plan_tier;
BEGIN
  SELECT plan_tier INTO ws_plan FROM public.business_workspaces WHERE id = NEW.workspace_id;
  IF ws_plan NOT IN ('pro','team','business') THEN
    RAISE EXCEPTION 'PLAN_FEATURE_LOCKED: internal_notes requires Pro or higher (current: %)', ws_plan
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_internal_notes_plan ON public.internal_notes;
CREATE TRIGGER trg_internal_notes_plan
  BEFORE INSERT ON public.internal_notes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_internal_notes_plan();

-- 5. request_messages
CREATE TABLE IF NOT EXISTS public.request_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('initial','reminder','followup','custom')),
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email','sms')),
  to_address text,
  subject text,
  body text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  sent_by uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.request_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "request msgs read by members" ON public.request_messages
  FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
CREATE POLICY "request msgs insert by members" ON public.request_messages
  FOR INSERT TO authenticated WITH CHECK (is_workspace_member(workspace_id));
CREATE INDEX IF NOT EXISTS idx_request_messages_request ON public.request_messages(request_id);

-- 6. message_templates (Pro+)
CREATE TABLE IF NOT EXISTS public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'initial' CHECK (kind IN ('initial','reminder','followup','custom')),
  subject text,
  body text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "msg tpl read by members" ON public.message_templates
  FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
CREATE POLICY "msg tpl write by members" ON public.message_templates
  FOR ALL TO authenticated USING (is_workspace_member(workspace_id))
  WITH CHECK (is_workspace_member(workspace_id));

CREATE OR REPLACE FUNCTION public.enforce_message_templates_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ws_plan plan_tier;
BEGIN
  SELECT plan_tier INTO ws_plan FROM public.business_workspaces WHERE id = NEW.workspace_id;
  IF ws_plan NOT IN ('pro','team','business') THEN
    RAISE EXCEPTION 'PLAN_FEATURE_LOCKED: saved_templates requires Pro or higher (current: %)', ws_plan
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_message_templates_plan ON public.message_templates;
CREATE TRIGGER trg_message_templates_plan
  BEFORE INSERT ON public.message_templates
  FOR EACH ROW EXECUTE FUNCTION public.enforce_message_templates_plan();

CREATE TRIGGER trg_message_templates_updated
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. workspace_invites
CREATE TABLE IF NOT EXISTS public.workspace_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  email text NOT NULL,
  role member_role NOT NULL DEFAULT 'member',
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(18), 'hex'),
  invited_by uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE (workspace_id, email)
);
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invites read by members" ON public.workspace_invites
  FOR SELECT TO authenticated USING (is_workspace_member(workspace_id));
CREATE POLICY "invites write by admin" ON public.workspace_invites
  FOR ALL TO authenticated
  USING (has_workspace_role(workspace_id, 'admin'::member_role))
  WITH CHECK (has_workspace_role(workspace_id, 'admin'::member_role));

-- 8. Notification triggers
CREATE OR REPLACE FUNCTION public.notify_on_submission_received()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m RECORD;
BEGIN
  IF NEW.submitted_at IS NOT NULL AND (OLD.submitted_at IS NULL OR OLD.submitted_at IS DISTINCT FROM NEW.submitted_at) THEN
    FOR m IN SELECT user_id FROM public.workspace_members
             WHERE workspace_id = NEW.workspace_id AND status='active' LOOP
      INSERT INTO public.notifications (workspace_id, user_id, type, title, body)
      VALUES (NEW.workspace_id, m.user_id, 'submission_received',
              'New submission received',
              COALESCE(NEW.submitter_name,'A recipient') || ' submitted photos.');
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_submission ON public.submissions;
CREATE TRIGGER trg_notify_submission
  AFTER INSERT OR UPDATE OF submitted_at ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_submission_received();

CREATE OR REPLACE FUNCTION public.notify_on_request_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m RECORD; t text;
BEGIN
  t := CASE NEW.kind
    WHEN 'reminder' THEN 'Reminder sent'
    WHEN 'followup' THEN 'Follow-up sent'
    WHEN 'initial' THEN 'Request sent'
    ELSE 'Message sent'
  END;
  FOR m IN SELECT user_id FROM public.workspace_members
           WHERE workspace_id = NEW.workspace_id AND status='active' LOOP
    INSERT INTO public.notifications (workspace_id, user_id, type, title, body)
    VALUES (NEW.workspace_id, m.user_id, 'request_message_' || NEW.kind, t, COALESCE(NEW.subject, NEW.body));
  END LOOP;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_request_message ON public.request_messages;
CREATE TRIGGER trg_notify_request_message
  AFTER INSERT ON public.request_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_request_message();

CREATE OR REPLACE FUNCTION public.notify_on_request_opened()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m RECORD;
BEGIN
  IF NEW.status = 'opened' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    FOR m IN SELECT user_id FROM public.workspace_members
             WHERE workspace_id = NEW.workspace_id AND status='active' LOOP
      INSERT INTO public.notifications (workspace_id, user_id, type, title, body)
      VALUES (NEW.workspace_id, m.user_id, 'request_opened',
              'Recipient opened request',
              COALESCE(NEW.recipient_name,'Recipient') || ' opened the request link.');
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_request_opened ON public.photo_brief_requests;
CREATE TRIGGER trg_notify_request_opened
  AFTER UPDATE OF status ON public.photo_brief_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_request_opened();

-- 9. Data retention
CREATE OR REPLACE FUNCTION public.run_data_retention()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w RECORD; cutoff timestamptz;
BEGIN
  FOR w IN SELECT id, plan_tier FROM public.business_workspaces LOOP
    cutoff := CASE w.plan_tier
      WHEN 'free'     THEN now() - interval '7 days'
      WHEN 'starter'  THEN now() - interval '30 days'
      WHEN 'pro'      THEN now() - interval '12 months'
      WHEN 'team'     THEN now() - interval '24 months'
      ELSE NULL
    END;
    IF cutoff IS NOT NULL THEN
      DELETE FROM public.submissions
      WHERE workspace_id = w.id AND created_at < cutoff;
    END IF;
  END LOOP;
END;
$$;

-- pg_cron schedule (extension may already be enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$
BEGIN
  PERFORM cron.unschedule('photobrief-data-retention');
EXCEPTION WHEN OTHERS THEN NULL;
END$$;
SELECT cron.schedule('photobrief-data-retention', '15 3 * * *', $$SELECT public.run_data_retention();$$);
