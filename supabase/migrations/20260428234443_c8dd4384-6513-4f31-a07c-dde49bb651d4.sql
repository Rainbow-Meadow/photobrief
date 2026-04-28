
-- The previous version was marked STABLE but performs a write on cache miss,
-- which Postgres rejects ("SELECT FOR UPDATE is not allowed in a non-volatile function").
-- Mark VOLATILE and drop the SKIP LOCKED probe (the UPDATE itself is atomic; the
-- 60-second TTL check is enough to prevent a thundering herd in practice because
-- only one tx wins the row lock and subsequent callers see the fresh refreshed_at).
CREATE OR REPLACE FUNCTION public.founding_pro_remaining()
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining integer;
  v_age_secs  numeric;
BEGIN
  SELECT remaining, EXTRACT(EPOCH FROM (now() - refreshed_at))
    INTO v_remaining, v_age_secs
  FROM public.founding_pro_cache
  WHERE id = true;

  IF v_remaining IS NULL OR v_age_secs > 60 THEN
    UPDATE public.founding_pro_cache
      SET remaining = GREATEST(0, 50 - (SELECT COUNT(*)::int FROM public.founding_pro_claims)),
          refreshed_at = now()
      WHERE id = true
        AND (refreshed_at < now() - interval '60 seconds' OR remaining IS NULL)
      RETURNING remaining INTO v_remaining;

    IF v_remaining IS NULL THEN
      -- Another tx just refreshed; re-read.
      SELECT remaining INTO v_remaining FROM public.founding_pro_cache WHERE id = true;
    END IF;
  END IF;

  RETURN COALESCE(v_remaining, 50);
END;
$$;

GRANT EXECUTE ON FUNCTION public.founding_pro_remaining() TO anon, authenticated, service_role;
