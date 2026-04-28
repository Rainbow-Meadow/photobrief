CREATE OR REPLACE FUNCTION public.plan_from_price_id(_price_id text)
RETURNS TABLE(plan plan_tier, billing_interval text)
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
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

CREATE OR REPLACE FUNCTION public.founding_pro_remaining()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT GREATEST(0, 50 - (SELECT COUNT(*)::int FROM public.founding_pro_claims));
$$;