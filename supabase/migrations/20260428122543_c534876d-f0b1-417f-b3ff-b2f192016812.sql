REVOKE ALL ON FUNCTION public.current_period_usage(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.founding_pro_remaining()        FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.plan_request_cap(plan_tier)     FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.current_period_usage(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.founding_pro_remaining()         TO authenticated;
GRANT EXECUTE ON FUNCTION public.plan_request_cap(plan_tier)      TO authenticated;