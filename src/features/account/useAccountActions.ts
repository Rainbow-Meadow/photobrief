import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Shared account-level actions surfaced from the header avatar menu and
 * the mobile settings sheet. Centralised so both entry points show the
 * same toasts, redirects, and loading state.
 */
export function useAccountActions() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [resetting, setResetting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const resetPassword = useCallback(async () => {
    if (!user?.email) {
      toast.error("No email on file for this account.");
      return;
    }
    setResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Check your inbox", {
        description: `We sent a password reset link to ${user.email}.`,
      });
    } catch (err: any) {
      toast.error("Could not send reset email", {
        description: err?.message ?? "Please try again in a moment.",
      });
    } finally {
      setResetting(false);
    }
  }, [user?.email]);

  const logOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await signOut();
      toast.success("Signed out");
      navigate("/auth", { replace: true });
    } catch (err: any) {
      toast.error("Could not sign out", {
        description: err?.message ?? "Please try again.",
      });
    } finally {
      setSigningOut(false);
    }
  }, [signOut, navigate]);

  return { resetPassword, logOut, resetting, signingOut, email: user?.email ?? null };
}
