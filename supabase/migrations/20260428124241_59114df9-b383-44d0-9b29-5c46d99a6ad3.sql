ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'sandbox',
  ADD COLUMN IF NOT EXISTS price_id text;

CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace_env
  ON public.subscriptions(workspace_id, environment);

CREATE OR REPLACE FUNCTION public.plan_from_price_id(_price_id text)
RETURNS TABLE(plan plan_tier, billing_interval text)
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT
    CASE
      WHEN _price_id LIKE 'starter_%'  THEN 'starter'::plan_tier
      WHEN _price_id LIKE 'pro_%'      THEN 'pro'::plan_tier
      WHEN _price_id LIKE 'team_%'     THEN 'team'::plan_tier
      WHEN _price_id LIKE 'business_%' THEN 'business'::plan_tier
      ELSE 'free'::plan_tier
    END AS plan,
    CASE
      WHEN _price_id LIKE '%_annual' THEN 'annual'
      WHEN _price_id LIKE '%_yearly' THEN 'annual'
      ELSE 'monthly'
    END AS billing_interval;
$$;