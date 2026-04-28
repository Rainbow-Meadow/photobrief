import { NavLink } from "react-router-dom";
import { Camera, Sparkles, ShieldCheck, MessageSquare, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: MessageSquare,
    title: "Chat-guided intake",
    body: "Recipients walk through a friendly chat with one photo prompt at a time. No app to install.",
  },
  {
    icon: Camera,
    title: "AI quality gate",
    body: "Blurry, dark, or wrong-angle shots get caught before they reach your inbox.",
  },
  {
    icon: Sparkles,
    title: "Clean briefs",
    body: "Every submission comes with an AI summary, readiness score, and suggested next action.",
  },
  {
    icon: ShieldCheck,
    title: "Branded & private",
    body: "Your logo, your color, your tone. Private storage, signed URLs, no recipient account required.",
  },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              <Sparkles className="h-3 w-3" /> AI-guided visual intake
            </span>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
              Send a link.{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Get a complete brief.
              </span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              PhotoBrief turns vague customer photos into business-ready briefs.
              Chat-guided capture, AI quality checks, and clean summaries — every time.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="gap-1.5">
                <NavLink to="/auth?mode=signup">
                  Start free
                  <ArrowRight className="h-4 w-4" />
                </NavLink>
              </Button>
              <Button asChild size="lg" variant="outline">
                <NavLink to="/r/demo">See a recipient flow</NavLink>
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              No credit card. 5 free requests per month.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="rounded-lg border bg-card p-6 shadow-elev-sm">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
                  <f.icon className="h-4 w-4" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-foreground">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-xl border bg-gradient-primary px-6 py-12 text-center text-primary-foreground shadow-glow sm:px-12">
          <h2 className="text-3xl font-semibold tracking-tight">Take the right photos, every time.</h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/90">
            Built for contractors, junk removal, plumbing, landscaping, property management, and resellers.
          </p>
          <ul className="mx-auto mt-6 flex max-w-lg flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-primary-foreground/90">
            {["No recipient account", "AI feedback", "Branded links", "Mobile-first"].map((x) => (
              <li key={x} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> {x}
              </li>
            ))}
          </ul>
          <Button asChild size="lg" variant="secondary" className="mt-7 bg-white text-primary hover:bg-white/90">
            <NavLink to="/auth?mode=signup">Create your workspace</NavLink>
          </Button>
        </div>
      </section>
    </>
  );
}
