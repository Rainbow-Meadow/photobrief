import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";

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
  const { onboarded, loading: onboardingLoading } = useOnboardingStatus();
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
    return <Navigate to={`/auth?next=${next}`} replace />;
  }

  if (requireOnboarding && onboarded === false) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
