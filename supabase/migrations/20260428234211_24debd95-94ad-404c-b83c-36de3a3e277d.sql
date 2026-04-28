
-- Cache table for founding_pro_remaining to eliminate per-visitor COUNT(*) load.
CREATE TABLE IF NOT EXISTS public.founding_pro_cache (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  remaining integer NOT NULL,
  refreshed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.founding_pro_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read founding pro cache" ON public.founding_pro_cache;
CREATE POLICY "Anyone can read founding pro cache"
  ON public.founding_pro_cache FOR SELECT
  USING (true);

-- Seed the row
INSERT INTO public.founding_pro_cache (id, remaining, refreshed_at)
VALUES (true, GREATEST(0, 50 - (SELECT COUNT(*)::int FROM public.founding_pro_claims)), now())
ON CONFLICT (id) DO NOTHING;

-- Replace the RPC: serve from cache; refresh lazily if older than 60s.
CREATE OR REPLACE FUNCTION public.founding_pro_remaining()
RETURNS integer
LANGUAGE plpgsql
STABLE
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
    -- Refresh; SKIP LOCKED prevents thundering-herd recompute.
    PERFORM 1 FROM public.founding_pro_cache WHERE id = true FOR UPDATE SKIP LOCKED;
    IF FOUND THEN
      UPDATE public.founding_pro_cache
        SET remaining = GREATEST(0, 50 - (SELECT COUNT(*)::int FROM public.founding_pro_claims)),
            refreshed_at = now()
        WHERE id = true
        RETURNING remaining INTO v_remaining;
    END IF;
  END IF;

  RETURN COALESCE(v_remaining, 50);
END;
$$;

GRANT EXECUTE ON FUNCTION public.founding_pro_remaining() TO anon, authenticated, service_role;

-- Auto-invalidate the cache when a claim is added/removed.
CREATE OR REPLACE FUNCTION public.invalidate_founding_pro_cache()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.founding_pro_cache
    SET remaining = GREATEST(0, 50 - (SELECT COUNT(*)::int FROM public.founding_pro_claims)),
        refreshed_at = now()
    WHERE id = true;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS founding_pro_claims_cache_refresh ON public.founding_pro_claims;
CREATE TRIGGER founding_pro_claims_cache_refresh
AFTER INSERT OR DELETE ON public.founding_pro_claims
FOR EACH STATEMENT EXECUTE FUNCTION public.invalidate_founding_pro_cache();
