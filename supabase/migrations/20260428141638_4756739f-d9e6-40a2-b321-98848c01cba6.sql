
ALTER TABLE public.photo_brief_requests
  ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz;

CREATE OR REPLACE FUNCTION public.flag_stale_requests()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Mark sent/opened requests with no submission as needing action after 48h
  UPDATE public.photo_brief_requests r
  SET status = 'needs_customer_action'
  WHERE r.status IN ('sent','opened')
    AND r.created_at < now() - interval '48 hours'
    AND NOT EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.request_id = r.id AND s.submitted_at IS NOT NULL
    );
END;
$$;

DO $$
BEGIN
  PERFORM cron.unschedule('photobrief-flag-stale-requests');
EXCEPTION WHEN OTHERS THEN NULL;
END$$;
SELECT cron.schedule('photobrief-flag-stale-requests', '0 * * * *', $$SELECT public.flag_stale_requests();$$);
