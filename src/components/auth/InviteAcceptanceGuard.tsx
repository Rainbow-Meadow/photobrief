import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * After OAuth signup with a beta invite token stashed in sessionStorage,
 * finalize the invite acceptance once the user has a live session.
 *
 * Mounted high in the tree so it runs regardless of which authenticated
 * page the OAuth provider redirects to (typically /onboarding).
 */
export function InviteAcceptanceGuard({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const ranRef = useRef(false);

  useEffect(() => {
    if (!session || ranRef.current) return;
    const token = sessionStorage.getItem("pendingBetaInviteToken");
    if (!token) return;
    ranRef.current = true;
    (async () => {
      try {
        await supabase.functions.invoke("invite-accept", { body: { token } });
      } catch (err) {
        // Non-fatal — admin can still mark accepted manually.
        console.error("invite-accept (post-OAuth) failed", err);
      } finally {
        sessionStorage.removeItem("pendingBetaInviteToken");
        sessionStorage.removeItem("pendingBetaInviteEmail");
      }
    })();
  }, [session]);

  return <>{children}</>;
}
