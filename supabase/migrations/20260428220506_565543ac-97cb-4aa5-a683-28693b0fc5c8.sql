-- Notify the notify-event edge function from DB triggers via pg_net.
-- Uses the service role key already stored in vault as 'email_queue_service_role_key'.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public._notify_event(_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  service_key text;
  project_url text;
BEGIN
  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets
  WHERE name = 'email_queue_service_role_key'
  LIMIT 1;

  IF service_key IS NULL THEN
    RAISE WARNING 'notify-event: service role key missing from vault';
    RETURN;
  END IF;

  project_url := 'https://ymuhxcdjdlwfstekkzmp.supabase.co/functions/v1/notify-event';

  PERFORM net.http_post(
    url := project_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := _payload,
    timeout_milliseconds := 5000
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify-event dispatch failed: %', SQLERRM;
END;
$$;

-- Welcome email on signup: extend handle_new_user with a notify call.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ws_id UUID;
  display_name TEXT;
BEGIN
  display_name := COALESCE(
    NEW.raw_user_meta_data ->> 'name',
    NEW.raw_user_meta_data ->> 'full_name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.business_workspaces (name, owner_id, plan_tier)
  VALUES (COALESCE(display_name, 'My workspace') || '''s workspace', NEW.id, 'free')
  RETURNING id INTO ws_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role, status)
  VALUES (ws_id, NEW.id, 'owner', 'active');

  INSERT INTO public.brand_profiles (workspace_id, intro_message, completion_message)
  VALUES (
    ws_id,
    'Hi! Help us help you — a few quick photos.',
    'Thanks! We''ve got everything we need.'
  );

  INSERT INTO public.subscriptions (workspace_id, plan_tier, status)
  VALUES (ws_id, 'free', 'active');

  INSERT INTO public.profiles (id, email, name, default_workspace_id)
  VALUES (NEW.id, NEW.email, display_name, ws_id);

  -- Fire welcome email (best-effort).
  PERFORM public._notify_event(jsonb_build_object('event', 'user_signup', 'user_id', NEW.id));

  RETURN NEW;
END;
$function$;

-- Submission received: when submitted_at transitions from null to a value.
CREATE OR REPLACE FUNCTION public.notify_submission_received_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.submitted_at IS NOT NULL
     AND (OLD.submitted_at IS NULL OR OLD.submitted_at IS DISTINCT FROM NEW.submitted_at) THEN
    PERFORM public._notify_event(jsonb_build_object('event', 'submission_received', 'submission_id', NEW.id));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS submissions_email_notify ON public.submissions;
CREATE TRIGGER submissions_email_notify
AFTER UPDATE ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION public.notify_submission_received_email();
