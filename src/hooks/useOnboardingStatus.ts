import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { withSupabaseRetry } from "@/lib/supabaseRetry";

interface OnboardingStatus {
  loading: boolean;
  onboarded: boolean | null; // null while unknown / signed out
}

/**
 * Reads `profiles.onboarded_at` for the signed-in user. Used by route guards
 * to send first-run users through /onboarding before the dashboard.
 */
export function useOnboardingStatus(enabled = true): OnboardingStatus {
  const { user, loading: authLoading } = useAuth();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setOnboarded(null);
      setLoading(false);
      return;
    }
    if (authLoading) return;
    if (!user) {
      setOnboarded(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    withSupabaseRetry(async () =>
      await supabase
        .from("profiles")
        .select("onboarded_at")
        .eq("id", user.id)
        .maybeSingle(),
    ).then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setOnboarded(false);
          setLoading(false);
          return;
        }
        setOnboarded(!!data?.onboarded_at);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, enabled, user]);

  return { loading: loading || authLoading, onboarded };
}
