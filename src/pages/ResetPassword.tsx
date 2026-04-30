import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/layout/BrandMark";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Password reset landing page. Supabase delivers the user here from the
 * password recovery email with a recovery session already established.
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when the recovery link establishes a session.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    // Also handle case where the session is already present on mount.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Use at least 8 characters.",
        variant: "destructive",
      });
      return;
    }
    if (password !== confirm) {
      toast({
        title: "Passwords don't match",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "Password updated", description: "You're signed in." });
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast({
        title: "Could not update password",
        description: err?.message ?? "The reset link may have expired — request a new one.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative isolate min-h-[100vh] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-ambient-mesh" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[60vh] bg-ambient-sky" aria-hidden />
      <div className="mx-auto flex min-h-[100vh] w-full max-w-md flex-col justify-center px-4 py-10">
        <div className="mb-8 flex justify-center">
          <BrandMark variant="stacked" tone="color" size={120} eager withGlow />
        </div>
        <div className="glass-strong rounded-3xl p-7 animate-lift-in">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Choose a new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ready
              ? "Enter a new password for your account."
              : "Verifying your reset link…"}
          </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!ready}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={!ready}
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting || !ready}>
            {submitting ? "Updating..." : "Update password"}
          </Button>
        </form>
      </div>
      </div>
    </div>
  );
}
