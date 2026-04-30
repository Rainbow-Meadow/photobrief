import { Send, Camera, Sparkles } from "lucide-react";

/**
 * Exported so structured-data hooks (HowTo JSON-LD) can read the same
 * source of truth the page renders. Do not duplicate this array.
 */
export const howItWorksSteps = [
  {
    icon: Send,
    title: "Send a branded request link",
    body: "Pick a guide template or have AI generate one. Share via SMS, email, or QR — no app install required.",
  },
  {
    icon: Camera,
    title: "Customer follows guided prompts",
    body: "Step-by-step photo prompts with framing overlays, tips, and instant AI feedback so they get it right the first time.",
  },
  {
    icon: Sparkles,
    title: "AI returns a review-ready brief",
    body: "Quality checks, missing-shot prompts, extracted details, and a clean summary land in your inbox — quote-ready.",
  },
];

const steps = howItWorksSteps;

export function HowItWorksSteps() {
  return (
    <section id="how-it-works" className="relative overflow-hidden bg-background">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-ambient-mesh opacity-50" />
      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-eyebrow">How it works</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            From request to review in minutes
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            A complete photo workflow your customers can complete from their phone — no app, no
            confusion.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-3 lg:gap-7">
          {steps.map((s, i) => (
            <article
              key={s.title}
              className="glass-strong relative rounded-3xl p-6 lift-on-hover sm:p-7"
            >
              <div className="flex items-center gap-3">
                <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
                  <s.icon className="h-5 w-5" />
                  <span aria-hidden className="lens-ring absolute -inset-1 rounded-full opacity-60" />
                </span>
                <span className="text-eyebrow tabular-nums">Step 0{i + 1}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
