
-- 1. Trigger function: fires process-email-queue immediately when an email is enqueued.
-- Uses pg_net (fire-and-forget HTTP POST) so the INSERT transaction is not blocked.
CREATE OR REPLACE FUNCTION public._trigger_process_email_queue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  service_key text;
BEGIN
  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets
  WHERE name = 'email_queue_service_role_key'
  LIMIT 1;

  IF service_key IS NULL THEN
    RAISE WARNING 'process-email-queue trigger: service role key missing from vault';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://ymuhxcdjdlwfstekkzmp.supabase.co/functions/v1/process-email-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 5000
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the enqueue; the hourly cron will pick it up.
  RAISE WARNING 'process-email-queue trigger dispatch failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- 2. Attach triggers to both queue tables.
DROP TRIGGER IF EXISTS trg_process_auth_emails ON pgmq.q_auth_emails;
CREATE TRIGGER trg_process_auth_emails
AFTER INSERT ON pgmq.q_auth_emails
FOR EACH ROW EXECUTE FUNCTION public._trigger_process_email_queue();

DROP TRIGGER IF EXISTS trg_process_transactional_emails ON pgmq.q_transactional_emails;
CREATE TRIGGER trg_process_transactional_emails
AFTER INSERT ON pgmq.q_transactional_emails
FOR EACH ROW EXECUTE FUNCTION public._trigger_process_email_queue();

-- 3. Reschedule the cron from every minute to hourly (safety net only).
SELECT cron.unschedule(167);

SELECT cron.schedule(
  'process-email-queue-safety-net',
  '0 * * * *',
  $cron$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM pgmq.q_auth_emails LIMIT 1)
      OR EXISTS (SELECT 1 FROM pgmq.q_transactional_emails LIMIT 1)
    THEN net.http_post(
      url := 'https://ymuhxcdjdlwfstekkzmp.supabase.co/functions/v1/process-email-queue',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1)
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 5000
    )
    ELSE NULL
  END;
  $cron$
);
