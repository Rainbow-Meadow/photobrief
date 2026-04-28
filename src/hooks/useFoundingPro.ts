// Reads the live count of remaining Founding Pro seats from the
// `founding_pro_remaining()` RPC. Falls back to 50 if the call fails so the
// landing page never shows an empty state.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const FOUNDING_PRO_TOTAL = 50;

export function useFoundingPro() {
  const [remaining, setRemaining] = useState<number>(FOUNDING_PRO_TOTAL);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("founding_pro_remaining");
      if (cancelled) return;
      if (!error && typeof data === "number") setRemaining(data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    remaining,
    total: FOUNDING_PRO_TOTAL,
    claimed: FOUNDING_PRO_TOTAL - remaining,
    loading,
    available: remaining > 0,
  };
}
