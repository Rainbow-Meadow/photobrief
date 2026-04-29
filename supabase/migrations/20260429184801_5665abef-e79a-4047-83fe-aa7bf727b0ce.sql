-- Replace the 5-second email queue poll with a 30-second one. The queues
-- sit empty almost all the time, but the old schedule was hitting the
-- vault and pgmq tables ~17k times a day, contributing to PostgREST
-- schema-cache churn and 503s on user reads.
SELECT cron.unschedule(133);

SELECT cron.schedule(
  'process-email-queue',
  '30 seconds',
  $$
  SELECT CASE
    WHEN (SELECT retry_after_until FROM public.email_send_state WHERE id = 1) > now()
      THEN NULL
    WHEN EXISTS (SELECT 1 FROM pgmq.q_auth_emails LIMIT 1)
      OR EXISTS (SELECT 1 FROM pgmq.q_transactional_emails LIMIT 1)
      THEN net.http_post(
        url := 'https://ymuhxcdjdlwfstekkzmp.supabase.co/functions/v1/process-email-queue',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            SELECT decrypted_secret FROM vault.decrypted_secrets
            WHERE name = 'email_queue_service_role_key'
          )
        ),
        body := '{}'::jsonb
      )
    ELSE NULL
  END;
  $$
);