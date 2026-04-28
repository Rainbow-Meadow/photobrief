import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineAuthCardProps {
  defaultMode?: "signin" | "signup";
  className?: string;
  /** Where to send users after a successful session. Defaults to /dashboard. */
  redirectTo?: string;
}

function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.54-5.17 3.54-8.86z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.71-4.95H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.29 14.3c-.24-.72-.38-1.49-.38-2.3s.14-1.58.38-2.3V6.61H1.29A11.99 11.99 0 0 0 0 12c0 1.94.46 3.78 1.29 5.39l4-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.61l4 3.09C6.23 6.86 8.88 4.75 12 4.75z" />
    </svg>
  );
}

export function InlineAuthCard({
  defaultMode = "signup",
  className,
  redirectTo = "/dashboard",
}: InlineAuthCardProps) {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(defaultMode);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && session) {
      navigate(redirectTo, { replace: true });
    }
  }, [authLoading, session, navigate, redirectTo]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${redirectTo}`,
            data: { name },
          },
        });
        if (error) throw error;
        toast({
          title: "Check your inbox",
          description: "Confirm your email to finish creating your workspace.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
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

  const handleGoogle = async () => {
    setSubmitting(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw new Error(result.error.message ?? "Google sign-in failed");
      if (result.redirected) return;
    } catch (err: any) {
      toast({
        title: "Google sign-in failed",
        description: err?.message ?? "Something went wrong.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        "w-full rounded-2xl border border-border/60 bg-card p-6 shadow-brand sm:p-7",
        className,
      )}
    >
      <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {mode === "signup" ? "Create your workspace" : "Welcome back"}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {mode === "signup"
                ? "Free forever for your first 5 requests."
                : "Sign in to your PhotoBrief workspace."}
            </p>
          </div>
          <TabsList className="shrink-0">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>
        </div>

        <Button
          type="button"
          variant="outline"
          className="mt-5 w-full"
          onClick={handleGoogle}
          disabled={submitting}
        >
          <GoogleIcon />
          Continue with Google
        </Button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            or with email
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <TabsContent value="signin" className="mt-0">
          <form className="space-y-3.5" onSubmit={handleEmail}>
            <div className="space-y-1.5">
              <Label htmlFor="signin-email">Email</Label>
              <Input
                id="signin-email"
                type="email"
                placeholder="you@business.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="signin-password">Password</Label>
                <a
                  href="/auth?mode=reset"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Forgot?
                </a>
              </div>
              <Input
                id="signin-password"
                type="password"
                placeholder="••••••••"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign in"}
              {!submitting && <ArrowRight className="ml-1.5 h-4 w-4" />}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="signup" className="mt-0">
          <form className="space-y-3.5" onSubmit={handleEmail}>
            <div className="space-y-1.5">
              <Label htmlFor="signup-name">Your name</Label>
              <Input
                id="signup-name"
                type="text"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-email">Work email</Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="you@business.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                type="password"
                placeholder="At least 6 characters"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creating..." : "Start free"}
              {!submitting && <ArrowRight className="ml-1.5 h-4 w-4" />}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              No credit card. By signing up you agree to our terms.
            </p>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
