import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface OnboardingStatus {
  loading: boolean;
  onboarded: boolean | null; // null while unknown / signed out
}

/**
 * Reads `profiles.onboarded_at` for the signed-in user. Used by route guards
 * to send first-run users through /onboarding before the dashboard.
 */
export function useOnboardingStatus(): OnboardingStatus {
  const { user, loading: authLoading } = useAuth();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setOnboarded(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("profiles")
      .select("onboarded_at")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setOnboarded(!!data?.onboarded_at);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  return { loading: loading || authLoading, onboarded };
}
