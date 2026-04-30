import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/layout/BrandMark";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      toast({
        title: "Could not send reset email",
        description: err?.message ?? "Something went wrong.",
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
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reset your password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your email and we'll send you a link to choose a new password.
          </p>

        {sent ? (
          <div className="mt-6 rounded-md border border-success/30 bg-success/10 p-4 text-sm text-foreground">
            If an account exists for <span className="font-medium">{email}</span>, a password
            reset link is on its way. Check your inbox.
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@business.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Sending..." : "Send reset link"}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <NavLink to="/auth" className="font-medium text-primary hover:underline">
            Back to sign in
          </NavLink>
        </p>
      </div>
      </div>
    </div>
  );
}
