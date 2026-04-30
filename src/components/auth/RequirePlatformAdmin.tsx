import { ReactNode } from "react";
import NotFound from "@/pages/NotFound";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";

/**
 * Wraps an admin-only page. Renders the standard 404 for non-admins (and
 * unauthenticated visitors) so the existence of admin tooling is not
 * leaked.
 *
 * Must be combined with <RequireAuth> when you need to guarantee the
 * user is signed in first; a typical usage is:
 *   <RequireAuth><RequirePlatformAdmin>...</RequirePlatformAdmin></RequireAuth>
 */
export function RequirePlatformAdmin({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = usePlatformAdmin();
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!isAdmin) return <NotFound />;
  return <>{children}</>;
}
