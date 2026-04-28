import { useSearchParams, NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/layout/BrandMark";

export default function AuthPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const mode = params.get("mode") === "signup" ? "signup" : "signin";
  const otherMode = mode === "signup" ? "signin" : "signup";

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 flex justify-center">
        <BrandMark />
      </div>
      <div className="rounded-lg border bg-card p-6 shadow-elev-md">
        <h1 className="text-xl font-semibold text-foreground">
          {mode === "signup" ? "Create your workspace" : "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signup"
            ? "Phase 1 placeholder — auth wiring lands in Phase 2."
            : "Phase 1 placeholder — auth wiring lands in Phase 2."}
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            navigate(mode === "signup" ? "/onboarding" : "/dashboard");
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@business.com" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="••••••••" required />
          </div>
          <Button type="submit" className="w-full">
            {mode === "signup" ? "Create account" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signup" ? "Already have an account?" : "New to PhotoBrief?"}{" "}
          <NavLink to={`/auth?mode=${otherMode}`} className="font-medium text-primary hover:underline">
            {otherMode === "signup" ? "Create one" : "Sign in"}
          </NavLink>
        </p>
      </div>
    </div>
  );
}
