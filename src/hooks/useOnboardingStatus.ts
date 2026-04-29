import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { withSupabaseRetry } from "@/lib/supabaseRetry";
import { onboardingDebug, supabaseErrorDebug } from "@/lib/onboardingDebug";

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
      onboardingDebug("onboarding_status.disabled", { sessionPresent: !!user, currentUserId: user?.id ?? null, currentUserEmail: user?.email ?? null });
      setOnboarded(null);
      setLoading(false);
      return;
    }
    if (authLoading) {
      onboardingDebug("onboarding_status.wait_auth", { sessionPresent: !!user });
      return;
    }
    if (!user) {
      onboardingDebug("onboarding_status.no_user", { sessionPresent: false });
      setOnboarded(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    onboardingDebug("onboarding_status.profile_lookup.start", {
      sessionPresent: true,
      currentUserId: user.id,
      currentUserEmail: user.email ?? null,
      requestName: "profiles.onboarded_at",
      urlPath: "public.profiles",
      method: "select",
    });
    withSupabaseRetry(async () =>
      await supabase
        .from("profiles")
        .select("onboarded_at")
        .eq("id", user.id)
        .maybeSingle(),
    ).then(({ data, error }) => {
        if (cancelled) return;
        onboardingDebug("onboarding_status.profile_lookup.done", {
          sessionPresent: true,
          currentUserId: user.id,
          currentUserEmail: user.email ?? null,
          requestName: "profiles.onboarded_at",
          urlPath: "public.profiles",
          method: "select",
          profileFound: !!data,
          onboardingStatus: data?.onboarded_at ? "complete" : data ? "incomplete" : "missing_profile",
          error: supabaseErrorDebug(error),
        });
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
