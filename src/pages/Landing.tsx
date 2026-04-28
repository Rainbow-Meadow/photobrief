import { NavLink } from "react-router-dom";
import {
  Sparkles,
  ShieldCheck,
  MessageSquare,
  Camera,
  ArrowRight,
  CheckCircle2,
  Wand2,
  Send,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineAuthCard } from "@/features/auth/components/InlineAuthCard";
import { PricingCardGrid } from "@/components/pricing/PricingCardGrid";
import primaryMark from "@/assets/brand/photobrief-primary.png";
import markLight from "@/assets/brand/photobrief-mark-light.png";

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

const steps = [
  {
    icon: Wand2,
    title: "Describe what you need",
    body: "Pick a guide or type a sentence. PhotoBrief drafts the chat-flow for you.",
  },
  {
    icon: Send,
    title: "Send a single link",
    body: "Your recipient opens it on their phone — no app, no account, no friction.",
  },
  {
    icon: ClipboardCheck,
    title: "Review the brief",
    body: "Get the photos, an AI summary, a readiness score, and a recommended next step.",
  },
];

const industries = ["Plumbing", "Junk removal", "Property mgmt", "Resale", "Field service"];

export default function LandingPage() {
  return (
    <>
      {/* HERO ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-gradient-brand text-white">
        {/* decorative glow + grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-radial-glow"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Brand watermark — large, blurred, decorative */}
        <img
          src={primaryMark}
          alt=""
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-16 hidden h-[520px] w-auto opacity-[0.08] blur-[2px] lg:block"
        />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 lg:px-8 lg:py-24">
          {/* Left: pitch */}
          <div className="flex-col text-center flex items-center justify-center">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur">
              <Sparkles className="h-3 w-3" /> AI-guided visual intake
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Send a link.
              <br />
              Get a complete brief
              <span className="bg-gradient-to-r from-white to-primary-glow bg-clip-text text-transparent">
                ​
              </span>
              .
            </h1>
            <p className="mt-5 max-w-xl text-base text-white/75 sm:text-lg text-center">
              PhotoBrief turns vague customer photos into business-ready briefs.
              Chat-guided capture, AI quality checks, and clean summaries — every time.
            </p>

            <ul className="mt-7 flex-wrap gap-x-6 gap-y-2 text-sm text-white/85 text-center flex items-center justify-center">
              {["No recipient account", "AI feedback loop", "Branded links", "Mobile-first"].map((x) => (
                <li key={x} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary-glow" /> {x}
                </li>
              ))}
            </ul>

            <div className="mt-9 hidden flex-col gap-3 sm:mt-10 lg:flex">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
                Built for
              </p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/70">
                {industries.map((i, idx) => (
                  <span key={i} className="inline-flex items-center gap-3">
                    <span>{i}</span>
                    {idx < industries.length - 1 && (
                      <span className="text-white/25">•</span>
                    )}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3 lg:hidden">
              <Button asChild size="lg" className="gap-1.5">
                <a href="#start">
                  Start free <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/25 bg-white/5 text-white hover:bg-white/15 hover:text-white"
              >
                <NavLink to="/r/demo">See a recipient flow</NavLink>
              </Button>
            </div>
          </div>

          {/* Right: inline auth card */}
          <div id="start" className="flex items-center justify-center lg:justify-end">
            <div className="w-full max-w-md">
              <InlineAuthCard defaultMode="signup" />
              <p className="mt-3 text-center text-xs text-white/60">
                Try the{" "}
                <NavLink
                  to="/r/demo"
                  className="font-medium text-white underline-offset-4 hover:underline"
                >
                  recipient demo
                </NavLink>{" "}
                first — no signup required.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS -------------------------------------------------------- */}
      <section className="border-b bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              From a single link to a graded brief in minutes.
            </h2>
          </div>

          <div className="relative mt-12 grid gap-6 lg:grid-cols-3 lg:gap-10">
            {steps.map((s, idx) => (
              <div
                key={s.title}
                className="relative rounded-2xl border bg-card p-6 shadow-elev-sm transition hover:shadow-elev-md"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <s.icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                    0{idx + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-foreground">
                  {s.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VALUE PROPS --------------------------------------------------------- */}
      <section className="bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                Why teams switch
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Stop chasing photos. Start reviewing briefs.
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                Replace messy text-message threads and missed angles with a guided
                intake your customer actually finishes — and an AI layer that
                catches problems before you do.
              </p>
              <img
                src={primaryMark}
                alt=""
                aria-hidden
                loading="lazy"
                className="mt-8 hidden h-40 w-auto drop-shadow-[0_18px_40px_hsl(var(--brand-navy)/0.25)] lg:block"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="rounded-xl border bg-card p-5 shadow-elev-sm"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
                    <f.icon className="h-4 w-4" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-foreground">
                    {f.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PRICING ------------------------------------------------------------- */}
      <section
        id="pricing"
        className="relative overflow-hidden border-y bg-gradient-brand py-16 text-white sm:py-20"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-radial-glow" />
        <div className="relative px-4 sm:px-6 lg:px-8">
          <PricingCardGrid
            variant="onDark"
            heading="Pricing built for small teams."
            subheading="Start free. Upgrade when PhotoBrief is saving you real time. Annual saves 20%."
          />
        </div>
      </section>

      {/* CTA BAND ------------------------------------------------------------ */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-brand px-6 py-12 text-center text-white shadow-brand sm:px-12 sm:py-14">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-radial-glow"
          />
          <div className="relative">
            <img
              src={markLight}
              alt=""
              aria-hidden
              loading="lazy"
              className="mx-auto mb-5 h-12 w-auto opacity-90"
            />
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Take the right photos, every time.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-white/80">
              Built for contractors, junk removal, plumbing, landscaping,
              property management, and resellers.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="bg-white text-brand-navy hover:bg-white/90"
                style={{ color: "hsl(var(--brand-navy))" }}
              >
                <a href="#start">
                  Create your workspace <ArrowRight className="ml-1 h-4 w-4" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/25 bg-white/5 text-white hover:bg-white/15 hover:text-white"
              >
                <NavLink to="/r/demo">See a recipient flow</NavLink>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
