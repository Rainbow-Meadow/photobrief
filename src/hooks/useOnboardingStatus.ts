import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isTransientSupabaseError, withSupabaseRetry } from "@/lib/supabaseRetry";
import { onboardingDebug, supabaseErrorDebug } from "@/lib/onboardingDebug";

interface OnboardingStatus {
  loading: boolean;
  onboarded: boolean | null; // null = unknown (signed out OR backend unreachable)
  backendUnavailable: boolean;
}

/**
 * Reads `profiles.onboarded_at` for the signed-in user. Used by route guards
 * to send first-run users through /onboarding before the dashboard.
 *
 * IMPORTANT: When the lookup fails with a transient backend error
 * (PGRST001/PGRST002/503/network), we return `onboarded: null` and
 * `backendUnavailable: true` instead of `false`. Returning `false` would
 * cause `RequireAuth` to redirect every signed-in user to /onboarding during
 * a Cloud hiccup, which then triggers a flood of `ensure-workspace` calls
 * that amplify the backend problem.
 */
export function useOnboardingStatus(enabled = true): OnboardingStatus {
  const { user, loading: authLoading } = useAuth();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [backendUnavailable, setBackendUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setOnboarded(null);
      setBackendUnavailable(false);
      setLoading(false);
      return;
    }
    if (authLoading) return;
    if (!user) {
      setOnboarded(null);
      setBackendUnavailable(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    onboardingDebug("onboarding_status.profile_lookup.start", {
      sessionPresent: true,
      currentUserId: user.id,
    });
    withSupabaseRetry(async () =>
      await supabase
        .from("profiles")
        .select("onboarded_at")
        .eq("id", user.id)
        .maybeSingle(),
    ).then(({ data, error }) => {
      if (cancelled) return;
      const transient = isTransientSupabaseError(error);
      onboardingDebug("onboarding_status.profile_lookup.done", {
        sessionPresent: true,
        currentUserId: user.id,
        profileFound: !!data,
        onboardingStatus: data?.onboarded_at
          ? "complete"
          : data
            ? "incomplete"
            : transient
              ? "backend_unavailable"
              : "missing_profile",
        error: supabaseErrorDebug(error),
      });
      if (error) {
        // Transient backend failure → keep status unknown so route guards
        // don't bounce the user to /onboarding. Hard error → treat as
        // not-onboarded so the user can complete the flow.
        if (transient) {
          setBackendUnavailable(true);
          setOnboarded(null);
        } else {
          setBackendUnavailable(false);
          setOnboarded(false);
        }
        setLoading(false);
        return;
      }
      setBackendUnavailable(false);
      setOnboarded(!!data?.onboarded_at);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [authLoading, enabled, user]);

  return { loading: loading || authLoading, onboarded, backendUnavailable };
}
