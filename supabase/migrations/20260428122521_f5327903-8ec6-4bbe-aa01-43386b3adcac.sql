-- Subscription billing fields
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS billing_interval text NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly','annual')),
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz NOT NULL DEFAULT date_trunc('month', now()),
  ADD COLUMN IF NOT EXISTS current_period_end   timestamptz NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_founding_pro      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_ends_at        timestamptz;

-- Usage events metadata
ALTER TABLE public.usage_events
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

DROP POLICY IF EXISTS "usage insert by members" ON public.usage_events;
CREATE POLICY "usage insert by members"
  ON public.usage_events
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE INDEX IF NOT EXISTS idx_usage_events_ws_type_created
  ON public.usage_events (workspace_id, event_type, created_at DESC);

-- Founding Pro claims
CREATE TABLE IF NOT EXISTS public.founding_pro_claims (
  workspace_id uuid PRIMARY KEY,
  claimed_by   uuid NOT NULL,
  claimed_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.founding_pro_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "founding read by members" ON public.founding_pro_claims;
CREATE POLICY "founding read by members"
  ON public.founding_pro_claims
  FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

-- Current period usage RPC
CREATE OR REPLACE FUNCTION public.current_period_usage(_workspace_id uuid, _event_type text)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*), 0)::int
  FROM public.usage_events ue
  WHERE ue.workspace_id = _workspace_id
    AND ue.event_type = _event_type
    AND ue.created_at >= COALESCE(
      (SELECT current_period_start FROM public.subscriptions s
        WHERE s.workspace_id = _workspace_id ORDER BY s.created_at DESC LIMIT 1),
      date_trunc('month', now())
    )
    AND ue.created_at < COALESCE(
      (SELECT current_period_end FROM public.subscriptions s
        WHERE s.workspace_id = _workspace_id ORDER BY s.created_at DESC LIMIT 1),
      date_trunc('month', now()) + interval '1 month'
    );
$$;

CREATE OR REPLACE FUNCTION public.founding_pro_remaining()
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT GREATEST(0, 50 - (SELECT COUNT(*)::int FROM public.founding_pro_claims));
$$;

CREATE OR REPLACE FUNCTION public.plan_request_cap(_plan plan_tier)
RETURNS integer
LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT CASE _plan
    WHEN 'free'     THEN 3
    WHEN 'starter'  THEN 25
    WHEN 'pro'      THEN 150
    WHEN 'team'     THEN 500
    WHEN 'business' THEN 1500
  END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_request_limit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  ws_plan plan_tier;
  used    int;
  cap     int;
BEGIN
  SELECT plan_tier INTO ws_plan
  FROM public.business_workspaces
  WHERE id = NEW.workspace_id;

  IF ws_plan IS NULL THEN
    RETURN NEW;
  END IF;

  cap := public.plan_request_cap(ws_plan);
  used := public.current_period_usage(NEW.workspace_id, 'request_created');

  IF cap IS NOT NULL AND used >= cap THEN
    RAISE EXCEPTION 'PLAN_LIMIT_REACHED: monthly request cap of % reached on the % plan', cap, ws_plan
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.usage_events (workspace_id, event_type, related_id, metadata)
  VALUES (NEW.workspace_id, 'request_created', NEW.id, jsonb_build_object('guide_id', NEW.guide_id));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_request_limit ON public.photo_brief_requests;
CREATE TRIGGER trg_enforce_request_limit
  BEFORE INSERT ON public.photo_brief_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_request_limit();

UPDATE public.subscriptions
SET current_period_start = date_trunc('month', created_at),
    current_period_end   = date_trunc('month', created_at) + interval '1 month'
WHERE current_period_start = current_period_end;