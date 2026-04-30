import { useEffect, useState } from "react";
import { Navigate, NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassPanel } from "@/components/ui/glass-panel";
import { BrandMark } from "@/components/layout/BrandMark";
import { SEOHead } from "@/components/seo/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { INVITE_ONLY_BETA } from "@/config/access";

type ValidationState =
  | { kind: "loading" }
  | { kind: "invalid"; reason: string }
  | { kind: "valid"; email: string; business_name: string | null };

const reasonCopy: Record<string, { title: string; body: string }> = {
  not_found: {
    title: "We couldn't find that invite",
    body: "The link may have been mistyped. Double-check it, or join the waitlist below.",
  },
  expired: {
    title: "This invite has expired",
    body: "Beta invites are valid for 14 days. Join the waitlist and we'll send a fresh one.",
  },
  revoked: {
    title: "This invite is no longer active",
    body: "It looks like this invite was revoked. Please reach out or join the waitlist.",
  },
  accepted: {
    title: "This invite has already been used",
    body: "If that wasn't you, please contact support. Otherwise, sign in below.",
  },
};

export default function SignupPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("invite")?.trim();

  // No token + invite-only mode → bounce to waitlist.
  useEffect(() => {
    if (!token && INVITE_ONLY_BETA) {
      trackEvent("signup_blocked_no_invite");
    }
  }, [token]);

  if (!token && INVITE_ONLY_BETA) {
    return <Navigate to="/waitlist" replace />;
  }

  const [state, setState] = useState<ValidationState>({ kind: "loading" });
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!token) {
        setState({ kind: "invalid", reason: "not_found" });
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke("invite-validate", {
          body: { token },
        });
        if (cancelled) return;
        if (error) throw error;
        const r = data as {
          valid: boolean;
          email?: string;
          business_name?: string | null;
          reason?: string;
        };
        if (r.valid && r.email) {
          setState({ kind: "valid", email: r.email, business_name: r.business_name ?? null });
        } else {
          const reason = r.reason ?? "not_found";
          trackEvent("invite_invalid", { reason });
          setState({ kind: "invalid", reason });
        }
      } catch (e) {
        if (cancelled) return;
        trackEvent("invite_invalid", { reason: "network" });
        setState({ kind: "invalid", reason: "not_found" });
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function finalizeAcceptance() {
    if (!token) return;
    try {
      await supabase.functions.invoke("invite-accept", { body: { token } });
      trackEvent("invite_accepted");
    } catch (err) {
      console.error("invite-accept failed", err);
    }
  }

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind !== "valid") return;
    setSubmitting(true);
    try {
      trackEvent("signup_started", { method: "email" });
      const { error } = await supabase.auth.signUp({
        email: state.email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
          data: { name, beta_invite_token: token },
        },
      });
      if (error) throw error;
      // Mark invite accepted (works whether or not email confirm is required).
      await finalizeAcceptance();
      trackEvent("signup_completed", { method: "email" });
      toast({
        title: "Welcome to the beta",
        description: "Check your inbox to confirm your email, then sign in to finish setup.",
      });
      navigate("/auth", { replace: true });
    } catch (err) {
      toast({
        title: "Sign-up failed",
        description: (err as Error).message ?? "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOAuth(provider: "google" | "apple") {
    if (state.kind !== "valid" || !token) return;
    // Stash the token so we can finalize acceptance after the OAuth round-trip.
    sessionStorage.setItem("pendingBetaInviteToken", token);
    sessionStorage.setItem("pendingBetaInviteEmail", state.email);
    setSubmitting(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin + "/onboarding",
      });
      if (result.error) throw new Error(result.error.message ?? "OAuth failed");
    } catch (err) {
      sessionStorage.removeItem("pendingBetaInviteToken");
      sessionStorage.removeItem("pendingBetaInviteEmail");
      toast({
        title: `${provider === "google" ? "Google" : "Apple"} sign-in failed`,
        description: (err as Error).message,
        variant: "destructive",
      });
      setSubmitting(false);
    }
  }

  return (
    <div className="relative isolate overflow-hidden">
      <SEOHead
        title="Create your PhotoBrief account"
        description="Accept your beta invite and create your PhotoBrief workspace."
        canonicalPath="/signup"
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-ambient-mesh" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[60vh] bg-ambient-sky" aria-hidden />

      <div className="mx-auto flex w-full max-w-md flex-col px-4 py-16">
        <div className="mb-6 flex justify-center">
          <BrandMark variant="stacked" tone="color" size={96} eager withGlow />
        </div>

        {state.kind === "loading" && (
          <GlassPanel variant="modal" elevation="lg" className="p-8 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Checking your invite…</p>
          </GlassPanel>
        )}

        {state.kind === "invalid" && (
          <GlassPanel variant="modal" elevation="lg" className="p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-xl font-semibold">
              {reasonCopy[state.reason]?.title ?? "We couldn't verify that invite"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {reasonCopy[state.reason]?.body ??
                "Please double-check the link, or join the waitlist below."}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Button asChild>
                <NavLink to="/waitlist">Join the waitlist</NavLink>
              </Button>
              <Button asChild variant="ghost">
                <NavLink to="/auth">I already have an account — sign in</NavLink>
              </Button>
            </div>
          </GlassPanel>
        )}

        {state.kind === "valid" && (
          <GlassPanel variant="modal" elevation="lg" className="p-7">
            <div className="flex items-center gap-2 text-sm text-primary">
              <CheckCircle2 className="h-4 w-4" />
              You're invited to the beta
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              Create your workspace
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Setting up an account for{" "}
              <span className="font-medium text-foreground">{state.email}</span>.
            </p>

            <form onSubmit={handleEmailSignup} className="mt-6 grid gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={state.email} readOnly className="mt-1.5 bg-muted/40" />
                <p className="mt-1 text-xs text-muted-foreground">
                  Your invite is locked to this email.
                </p>
              </div>
              <div>
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="mt-1.5"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  className="mt-1.5"
                  required
                />
                <p className="mt-1 text-xs text-muted-foreground">At least 8 characters.</p>
              </div>
              <Button type="submit" disabled={submitting} size="lg">
                {submitting ? "Creating account…" : "Create account"}
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or continue with
              <span className="h-px flex-1 bg-border" />
            </div>

            <div className="grid gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOAuth("google")}
                disabled={submitting}
              >
                Continue with Google
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOAuth("apple")}
                disabled={submitting}
              >
                Continue with Apple
              </Button>
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <NavLink to="/auth" className="font-medium text-primary hover:underline">
                Sign in
              </NavLink>
            </p>
          </GlassPanel>
        )}
      </div>
    </div>
  );
}
