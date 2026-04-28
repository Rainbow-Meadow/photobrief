REVOKE ALL ON FUNCTION public.enforce_request_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.plan_request_cap(plan_tier) FROM PUBLIC, anon, authenticated;