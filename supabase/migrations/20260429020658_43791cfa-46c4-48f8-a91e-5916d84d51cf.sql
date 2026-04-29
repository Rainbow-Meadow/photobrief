-- Hard DB invariant: at most one 'request_credit' usage_event per request.
-- Partial unique index keeps other event types unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS usage_events_one_credit_per_request
  ON public.usage_events (related_id)
  WHERE event_type = 'request_credit' AND related_id IS NOT NULL;

-- Make the trigger idempotent: rely on the unique index instead of a
-- read-then-write check (which is racy under concurrent rejections).
CREATE OR REPLACE FUNCTION public.credit_request_on_first_rejection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req_id uuid;
BEGIN
  IF NEW.action <> 'rejected' THEN
    RETURN NEW;
  END IF;

  SELECT s.request_id INTO req_id
  FROM public.submissions s
  WHERE s.id = NEW.submission_id;

  IF req_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.usage_events (workspace_id, event_type, related_id, metadata)
  VALUES (
    NEW.workspace_id,
    'request_credit',
    req_id,
    jsonb_build_object(
      'reason', 'submission_rejected',
      'submission_id', NEW.submission_id,
      'review_id', NEW.id
    )
  )
  ON CONFLICT ON CONSTRAINT usage_events_one_credit_per_request DO NOTHING;

  RETURN NEW;
END;
$$;