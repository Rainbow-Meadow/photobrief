
-- 1. Top-up credit packs table
CREATE TABLE IF NOT EXISTS public.request_credit_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  pack_size integer NOT NULL CHECK (pack_size > 0),
  remaining integer NOT NULL CHECK (remaining >= 0),
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  environment text NOT NULL DEFAULT 'sandbox',
  status text NOT NULL DEFAULT 'active', -- active | exhausted | refunded | expired
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text,
  plan_at_purchase plan_tier,
  period_end timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_topup_packs_ws_active
  ON public.request_credit_packs (workspace_id, status, period_end)
  WHERE status = 'active';

ALTER TABLE public.request_credit_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "topup packs read by members" ON public.request_credit_packs;
CREATE POLICY "topup packs read by members"
  ON public.request_credit_packs
  FOR SELECT
  TO authenticated
  USING (public.is_workspace_member(workspace_id));

-- (No insert/update/delete policies — service role only via webhook.)

-- 2. Helper: current top-up balance
CREATE OR REPLACE FUNCTION public.current_topup_balance(_workspace_id uuid)
RETURNS TABLE(remaining integer, expires_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR current_user IN ('service_role', 'postgres', 'supabase_admin')
  THEN
    NULL;
  ELSIF NOT public.is_workspace_member(_workspace_id) THEN
    RAISE EXCEPTION 'Not authorized for workspace %', _workspace_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(p.remaining), 0)::int AS remaining,
    MIN(p.period_end)                  AS expires_at
  FROM public.request_credit_packs p
  WHERE p.workspace_id = _workspace_id
    AND p.status = 'active'
    AND p.period_end > now()
    AND p.remaining > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.current_topup_balance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_topup_balance(uuid) TO authenticated, service_role;

-- 3. Updated enforce_request_limit: consume top-ups when over plan cap
CREATE OR REPLACE FUNCTION public.enforce_request_limit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ws_plan       plan_tier;
  used          int;
  cap           int;
  pack_id       uuid;
  total_topup   int;
BEGIN
  SELECT plan_tier INTO ws_plan
  FROM public.business_workspaces
  WHERE id = NEW.workspace_id;

  IF ws_plan IS NULL THEN
    RETURN NEW;
  END IF;

  cap  := public.plan_request_cap(ws_plan);
  used := public.current_period_usage(NEW.workspace_id, 'request_created');

  IF cap IS NOT NULL AND used >= cap THEN
    -- Try to consume one credit from the oldest active top-up pack.
    SELECT id INTO pack_id
    FROM public.request_credit_packs
    WHERE workspace_id = NEW.workspace_id
      AND status = 'active'
      AND period_end > now()
      AND remaining > 0
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF pack_id IS NULL THEN
      RAISE EXCEPTION 'PLAN_LIMIT_REACHED: monthly request cap of % reached on the % plan', cap, ws_plan
        USING ERRCODE = 'check_violation';
    END IF;

    UPDATE public.request_credit_packs
    SET remaining = remaining - 1,
        status = CASE WHEN remaining - 1 <= 0 THEN 'exhausted' ELSE status END
    WHERE id = pack_id;

    INSERT INTO public.usage_events (workspace_id, event_type, related_id, metadata)
    VALUES (
      NEW.workspace_id,
      'topup_request_used',
      NEW.id,
      jsonb_build_object('pack_id', pack_id, 'guide_id', NEW.guide_id)
    );

    -- Still log the request_created so totals add up correctly.
    INSERT INTO public.usage_events (workspace_id, event_type, related_id, metadata)
    VALUES (
      NEW.workspace_id,
      'request_created',
      NEW.id,
      jsonb_build_object('guide_id', NEW.guide_id, 'paid_by_topup', true, 'pack_id', pack_id)
    );

    RETURN NEW;
  END IF;

  INSERT INTO public.usage_events (workspace_id, event_type, related_id, metadata)
  VALUES (NEW.workspace_id, 'request_created', NEW.id, jsonb_build_object('guide_id', NEW.guide_id));

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_request_limit() FROM PUBLIC, anon, authenticated;
