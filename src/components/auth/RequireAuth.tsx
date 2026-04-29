import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { onboardingDebug } from "@/lib/onboardingDebug";

interface RequireAuthProps {
  children: ReactNode;
  /**
   * When true, signed-in users without `profiles.onboarded_at` are routed
   * through `/onboarding` first. Defaults to true. The onboarding page
   * itself sets this to false to avoid an infinite redirect loop.
   */
  requireOnboarding?: boolean;
}

/**
 * Gate for authenticated routes. Redirects unauthenticated visitors to
 * `/auth?next=…` and (optionally) bounces first-run users to `/onboarding`.
 */
export function RequireAuth({ children, requireOnboarding = true }: RequireAuthProps) {
  const { user, loading: authLoading } = useAuth();
  const { onboarded, loading: onboardingLoading } = useOnboardingStatus(requireOnboarding);
  const location = useLocation();

  if (authLoading || (user && requireOnboarding && onboardingLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    onboardingDebug("route_guard.redirect", {
      sessionPresent: false,
      redirectDestination: `/auth?next=${next}`,
      triggeredBy: "RequireAuth.no_user",
      requireOnboarding,
    });
    return <Navigate to={`/auth?next=${next}`} replace />;
  }

  if (requireOnboarding && onboarded === false) {
    onboardingDebug("route_guard.redirect", {
      sessionPresent: true,
      currentUserId: user.id,
      currentUserEmail: user.email ?? null,
      onboardingStatus: "incomplete_or_lookup_failed",
      redirectDestination: "/onboarding",
      triggeredBy: "RequireAuth.onboarded_false",
      requireOnboarding,
    });
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
