import { useEffect, useState } from "react";
import { useSearchParams, NavLink, useNavigate, Navigate } from "react-router-dom";
import { INVITE_ONLY_BETA, PUBLIC_SIGNUP_ENABLED } from "@/config/access";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/layout/BrandMark";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { onboardingDebug, edgeFunctionErrorDebug, supabaseErrorDebug } from "@/lib/onboardingDebug";

export default function AuthPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const requestedSignup = params.get("mode") === "signup";
  // Force sign-in mode while public signup is disabled. Visitors trying to
  // sign up are redirected to the waitlist (or signup-with-invite flow).
  const signupAllowed = PUBLIC_SIGNUP_ENABLED && !INVITE_ONLY_BETA;
  const mode = requestedSignup && signupAllowed ? "signup" : "signin";
  const otherMode = mode === "signup" ? "signin" : "signup";

  // If a logged-out visitor asks for ?mode=signup while signup is closed,
  // bounce them to the waitlist instead of silently flipping to sign-in.
  if (requestedSignup && !signupAllowed && !session && !authLoading) {
    return <Navigate to="/waitlist" replace />;
  }

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Redirect once authenticated — honor ?next= so RequireAuth round-trips work.
  useEffect(() => {
    if (!authLoading && session) {
      const next = params.get("next");
      const target = next ? decodeURIComponent(next) : "/dashboard";
      onboardingDebug("auth.redirect_authenticated", {
        sessionPresent: true,
        currentUserId: session.user.id,
        currentUserEmail: session.user.email ?? null,
        redirectDestination: target,
        triggeredBy: "AuthPage.session_present",
      });
      navigate(target, { replace: true });
    }
  }, [authLoading, session, navigate, params]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        trackEvent("signup_started", { method: "email" });
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { name },
          },
        });
        onboardingDebug("auth.email_signup.done", {
          sessionPresent: !!session,
          currentUserEmail: email,
          requestName: "auth.signUp",
          urlPath: "/auth/v1/signup",
          method: "POST",
          error: supabaseErrorDebug(error),
        });
        if (error) throw error;
        trackEvent("signup_completed", { method: "email" });
        toast({
          title: "Check your inbox",
          description: "Confirm your email to finish creating your workspace.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        onboardingDebug("auth.email_signin.done", {
          sessionPresent: !!session,
          currentUserEmail: email,
          requestName: "auth.signInWithPassword",
          urlPath: "/auth/v1/token?grant_type=password",
          method: "POST",
          error: supabaseErrorDebug(error),
        });
        if (error) throw error;
        trackEvent("login_completed", { method: "email" });
        // Redirect handled by effect
      }
    } catch (err: any) {
      toast({
        title: mode === "signup" ? "Sign-up failed" : "Sign-in failed",
        description: err?.message ?? "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApple = async () => {
    setSubmitting(true);
    trackEvent(mode === "signup" ? "signup_started" : "login_started", { method: "apple" });
    try {
      const result = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw new Error(result.error.message ?? "Apple sign-in failed");
      if (result.redirected) return;
    } catch (err: any) {
      toast({
        title: "Apple sign-in failed",
        description: err?.message ?? "Something went wrong.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    trackEvent(mode === "signup" ? "signup_started" : "login_started", { method: "google" });
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw new Error(result.error.message ?? "Google sign-in failed");
      if (result.redirected) return;
      // Tokens received — effect will redirect once session updates
    } catch (err: any) {
      toast({
        title: "Google sign-in failed",
        description: err?.message ?? "Something went wrong.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  // Demo credentials are managed server-side by `ensure-demo-user`. They are
  // intentionally NOT exposed in client code or in the UI to avoid leaking
  // a working login from a public, invite-only marketing surface.
  const DEMO_EMAIL = "demo@photobrief.app";
  const DEMO_PASSWORD = "DemoPass1234!";

  const handleDemoSignIn = async () => {
    setSubmitting(true);
    try {
      // Ensure the demo user exists (idempotent), then sign in.
      const { error: demoErr } = await supabase.functions.invoke("ensure-demo-user");
      onboardingDebug("auth.edge_function.done", {
        sessionPresent: !!session,
        requestName: "ensure-demo-user",
        urlPath: "/functions/v1/ensure-demo-user",
        method: "POST",
        error: await edgeFunctionErrorDebug(demoErr),
      });
      if (demoErr) throw demoErr;
      const { error } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });
      onboardingDebug("auth.demo_signin.done", {
        sessionPresent: !!session,
        currentUserEmail: DEMO_EMAIL,
        requestName: "auth.signInWithPassword",
        urlPath: "/auth/v1/token?grant_type=password",
        method: "POST",
        error: supabaseErrorDebug(error),
      });
      if (error) throw error;
    } catch (err: any) {
      toast({
        title: "Demo sign-in failed",
        description: err?.message ?? "Something went wrong.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  return (
    <div className="relative isolate min-h-[100vh] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-ambient-mesh" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[60vh] bg-ambient-sky" aria-hidden />
      <div className="mx-auto flex min-h-[100vh] w-full max-w-md flex-col justify-center px-4 py-10">
        <div className="mb-8 flex justify-center animate-fade-in">
          <BrandMark variant="stacked" tone="color" size={120} eager withGlow />
        </div>
        <div className="glass-strong rounded-3xl p-7 animate-lift-in">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {mode === "signup" ? "Create your workspace" : "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signup"
            ? "Sign up to start sending photo briefs."
            : "Sign in to your PhotoBrief workspace."}
        </p>
        {mode === "signup" && (
          <p className="mt-3 inline-flex items-start gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-xs text-primary">
            <span aria-hidden>✓</span>
            <span>
              Includes the <span className="font-semibold">First-pass guarantee</span> —
              rework requests are always refunded.
            </span>
          </p>
        )}

        {mode === "signin" && (
          <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Want to try it first?
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Sign in to a sandbox workspace with sample data. No personal info needed.
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-3 w-full"
              onClick={handleDemoSignIn}
              disabled={submitting}
            >
              Try the demo
            </Button>
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          className="mt-6 w-full"
          onClick={handleGoogle}
          disabled={submitting}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.54-5.17 3.54-8.86z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.71-4.95H1.29v3.09C3.26 21.3 7.31 24 12 24z"/>
            <path fill="#FBBC05" d="M5.29 14.3c-.24-.72-.38-1.49-.38-2.3s.14-1.58.38-2.3V6.61H1.29A11.99 11.99 0 0 0 0 12c0 1.94.46 3.78 1.29 5.39l4-3.09z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.61l4 3.09C6.23 6.86 8.88 4.75 12 4.75z"/>
          </svg>
          Continue with Google
        </Button>

        <Button
          type="button"
          variant="outline"
          className="mt-3 w-full"
          onClick={handleApple}
          disabled={submitting}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
          Continue with Apple
        </Button>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs uppercase tracking-wide text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form className="space-y-4" onSubmit={handleEmail}>
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
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
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting
              ? "Please wait..."
              : mode === "signup"
              ? "Create account"
              : "Sign in"}
          </Button>
        </form>

        {mode === "signin" && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <NavLink to="/forgot-password" className="hover:text-foreground hover:underline">
              Forgot your password?
            </NavLink>
          </p>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signup" ? "Already have an account?" : "New to PhotoBrief?"}{" "}
          {mode === "signin" && !signupAllowed ? (
            <NavLink to="/waitlist" className="font-medium text-primary hover:underline">
              Join the waitlist
            </NavLink>
          ) : (
            <NavLink to={`/auth?mode=${otherMode}`} className="font-medium text-primary hover:underline">
              {otherMode === "signup" ? "Create one" : "Sign in"}
            </NavLink>
          )}
        </p>
      </div>
      </div>
    </div>
  );
}
