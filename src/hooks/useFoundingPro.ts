// Reads the live count of remaining Founding Pro seats from the
// `founding_pro_remaining()` RPC. Backed by:
//   1. A 60-second DB-side cache (see `founding_pro_cache` table) so the RPC
//      never recomputes COUNT(*) on every visitor.
//   2. A 5-minute sessionStorage cache so repeat navigations skip the RPC.
//   3. Retry-with-backoff so transient PostgREST 503s don't surface to users.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const FOUNDING_PRO_TOTAL = 50;
const SESSION_CACHE_KEY = "founding_pro_remaining_v1";
const SESSION_TTL_MS = 5 * 60 * 1000;

type Cached = { value: number; ts: number };

function readSessionCache(): number | null {
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (Date.now() - parsed.ts > SESSION_TTL_MS) return null;
    return typeof parsed.value === "number" ? parsed.value : null;
  } catch {
    return null;
  }
}

function writeSessionCache(value: number) {
  try {
    sessionStorage.setItem(
      SESSION_CACHE_KEY,
      JSON.stringify({ value, ts: Date.now() } satisfies Cached),
    );
  } catch {
    /* storage may be unavailable; ignore */
  }
}

async function fetchWithRetry(maxAttempts = 3): Promise<number | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data, error } = await supabase.rpc("founding_pro_remaining");
    if (!error && typeof data === "number") return data;
    // Exponential backoff: 250ms, 750ms
    await new Promise((r) => setTimeout(r, 250 * Math.pow(3, attempt)));
  }
  return null;
}

export function useFoundingPro() {
  const initial = readSessionCache();
  const [remaining, setRemaining] = useState<number>(initial ?? FOUNDING_PRO_TOTAL);
  const [loading, setLoading] = useState(initial === null);

  useEffect(() => {
    let cancelled = false;
    // Already had a fresh session value — skip the network round-trip.
    if (initial !== null) return;
    (async () => {
      const value = await fetchWithRetry();
      if (cancelled) return;
      if (value !== null) {
        setRemaining(value);
        writeSessionCache(value);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    remaining,
    total: FOUNDING_PRO_TOTAL,
    claimed: FOUNDING_PRO_TOTAL - remaining,
    loading,
    available: remaining > 0,
  };
}
