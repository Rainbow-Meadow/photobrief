import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { onboardingDebug } from "@/lib/onboardingDebug";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

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
 *
 * If the backend is unreachable, we render a hard error screen instead of
 * silently redirecting to /onboarding (which would trigger a flood of
 * `ensure-workspace` calls and amplify the outage).
 */
export function RequireAuth({ children, requireOnboarding = true }: RequireAuthProps) {
  const { user, loading: authLoading } = useAuth();
  const { onboarded, loading: onboardingLoading, backendUnavailable } =
    useOnboardingStatus(requireOnboarding);
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
    });
    return <Navigate to={`/auth?next=${next}`} replace />;
  }

  // Hard backend-unavailable state. Do NOT redirect to /onboarding —
  // we don't actually know the user's onboarding status, and bouncing
  // them there would trigger ensure-workspace calls that amplify the
  // outage.
  if (requireOnboarding && backendUnavailable && onboarded === null) {
    onboardingDebug("route_guard.backend_unavailable", {
      sessionPresent: true,
      currentUserId: user.id,
      triggeredBy: "RequireAuth.backend_unavailable",
    });
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            We can't reach the backend right now
          </h1>
          <p className="text-sm text-muted-foreground">
            Our database is temporarily unavailable. This is a service-side
            issue — your account and data are safe. Please wait a moment and
            try again.
          </p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  if (requireOnboarding && onboarded === false) {
    onboardingDebug("route_guard.redirect", {
      sessionPresent: true,
      currentUserId: user.id,
      onboardingStatus: "incomplete",
      redirectDestination: "/onboarding",
      triggeredBy: "RequireAuth.onboarded_false",
    });
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
