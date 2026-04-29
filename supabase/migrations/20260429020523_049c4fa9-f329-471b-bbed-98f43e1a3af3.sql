-- Make rejections free: refund the request quota when a reviewer rejects
-- a submission, since a rejection means our capture flow failed the user.
--
-- Approach: when a submission_reviews row is inserted with action='rejected'
-- AND it's the first rejection for the parent request, write a balancing
-- 'request_credit' usage_event. The current_period_usage() function then
-- subtracts credits from request_created counts.

CREATE OR REPLACE FUNCTION public.credit_request_on_first_rejection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req_id uuid;
  already_credited boolean;
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

  -- Only credit once per request, even across multiple rejection rounds
  -- or multiple submissions tied to the same request.
  SELECT EXISTS (
    SELECT 1 FROM public.usage_events ue
    WHERE ue.workspace_id = NEW.workspace_id
      AND ue.event_type = 'request_credit'
      AND ue.related_id = req_id
  ) INTO already_credited;

  IF already_credited THEN
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
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_credit_request_on_first_rejection
  ON public.submission_reviews;

CREATE TRIGGER trg_credit_request_on_first_rejection
AFTER INSERT ON public.submission_reviews
FOR EACH ROW
EXECUTE FUNCTION public.credit_request_on_first_rejection();

-- Net credits out of the period usage so rejected requests don't count
-- against the plan cap.
CREATE OR REPLACE FUNCTION public.current_period_usage(_workspace_id uuid, _event_type text)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  period_start timestamptz;
  period_end   timestamptz;
  used_count   int;
  credit_count int;
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR current_user IN ('service_role', 'postgres', 'supabase_admin')
  THEN
    NULL;
  ELSIF NOT public.is_workspace_member(_workspace_id) THEN
    RAISE EXCEPTION 'Not authorized for workspace %', _workspace_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT
    COALESCE((SELECT current_period_start FROM public.subscriptions s
              WHERE s.workspace_id = _workspace_id ORDER BY s.created_at DESC LIMIT 1),
             date_trunc('month', now())),
    COALESCE((SELECT current_period_end FROM public.subscriptions s
              WHERE s.workspace_id = _workspace_id ORDER BY s.created_at DESC LIMIT 1),
             date_trunc('month', now()) + interval '1 month')
  INTO period_start, period_end;

  SELECT COUNT(*)::int INTO used_count
  FROM public.usage_events ue
  WHERE ue.workspace_id = _workspace_id
    AND ue.event_type = _event_type
    AND ue.created_at >= period_start
    AND ue.created_at <  period_end;

  -- Only the request_created counter is offset by rejection credits.
  IF _event_type = 'request_created' THEN
    SELECT COUNT(*)::int INTO credit_count
    FROM public.usage_events ue
    WHERE ue.workspace_id = _workspace_id
      AND ue.event_type = 'request_credit'
      AND ue.created_at >= period_start
      AND ue.created_at <  period_end;
    RETURN GREATEST(0, used_count - credit_count);
  END IF;

  RETURN used_count;
END;
$$;