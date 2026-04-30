import { NavLink } from "react-router-dom";
import { ArrowRight, PlayCircle, Sparkles, Send, Camera, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/seo/SEOHead";
import { HeroGlassStory } from "@/components/marketing/HeroGlassStory";
import { TrustLogosStrip } from "@/components/marketing/TrustLogosStrip";
import { HowItWorksSteps } from "@/components/marketing/HowItWorksSteps";
import { StatsBand } from "@/components/marketing/StatsBand";
import { IndustryGrid } from "@/components/marketing/IndustryGrid";
import { TestimonialsRow } from "@/components/marketing/TestimonialsRow";
import { FinalCtaCard } from "@/components/marketing/FinalCtaCard";
import { FirstPassGuaranteeBand } from "@/components/marketing/FirstPassGuaranteeBand";
import { PricingCardGrid } from "@/components/pricing/PricingCardGrid";
import { trackEvent } from "@/lib/analytics";
import { signupCtaTarget, signupCtaLabel } from "@/config/access";

const LANDING_JSONLD = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "PhotoBrief",
    url: "https://photobrief.ai",
    logo: "https://photobrief.ai/og-image.png",
    sameAs: [],
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "PhotoBrief",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "PhotoBrief turns vague customer photos into business-ready briefs. Chat-guided capture, AI quality checks, clean summaries.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  },
];

const VALUE_STEPS = [
  {
    icon: Send,
    title: "Send a branded request link",
    body: "SMS, email, or QR. No app for your customer to install.",
  },
  {
    icon: Camera,
    title: "Customer follows guided prompts",
    body: "Step-by-step photo prompts with framing tips and live AI feedback.",
  },
  {
    icon: FileText,
    title: "AI returns a review-ready brief",
    body: "Quality checks, missing-shot prompts, summary, and extracted details.",
  },
];

export default function LandingPage() {
  return (
    <>
      <SEOHead
        title="PhotoBrief | Send a link. Get a complete brief."
        description="PhotoBrief turns customer photos into AI-guided, business-ready submissions with quality checks, missing-shot prompts, and clean summaries."
        canonicalPath="/"
        jsonLd={LANDING_JSONLD}
      />

      {/* HERO ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[640px] bg-ambient-sky" />
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-ambient-mesh opacity-70" />

        <div className="relative mx-auto max-w-7xl px-4 pt-14 sm:px-6 sm:pt-20 lg:px-8 lg:pt-24">
          <div className="mx-auto max-w-3xl text-center animate-lift-in">
            <span className="inline-flex items-center gap-1.5 rounded-full glass px-3 py-1 text-xs font-medium text-foreground/80">
              <Sparkles className="h-3 w-3 text-primary" /> AI-guided visual intake
            </span>
            <h1 className="text-display mt-6 text-foreground">
              Send a link.
              <br />
              Get a complete{" "}
              <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                brief
              </span>
              .
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              PhotoBrief turns customer photos into AI-guided, business-ready submissions with
              quality checks, missing-shot prompts, and clean summaries.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="xl" className="rounded-full">
                <NavLink
                  to={signupCtaTarget()}
                  onClick={() => trackEvent("cta_click", { location: "hero", label: "primary" })}
                >
                  {signupCtaLabel()} <ArrowRight className="ml-1 h-4 w-4" />
                </NavLink>
              </Button>
              <Button asChild size="xl" variant="glass" className="rounded-full">
                <a
                  href="#how-it-works"
                  onClick={() => trackEvent("cta_click", { location: "hero", label: "watch_demo" })}
                >
                  <PlayCircle className="mr-1 h-5 w-5" /> Watch Demo
                </a>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Free plan includes 5 requests/month · No install for your customers
            </p>
            <a
              href="#first-pass-guarantee"
              onClick={() => trackEvent("cta_click", { location: "hero", label: "first_pass_pill" })}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full glass px-3 py-1 text-xs font-medium text-primary transition hover:bg-primary/10"
            >
              ✓ First-pass guarantee — rework? request refunded
            </a>
          </div>

          <div className="mt-14 sm:mt-16 lg:mt-20">
            <HeroGlassStory />
          </div>

          <div className="h-16 sm:h-20" />
        </div>
      </section>

      {/* TRUST STRIP --------------------------------------------------------- */}
      <TrustLogosStrip />

      {/* HOW IT WORKS -------------------------------------------------------- */}
      <HowItWorksSteps />

      {/* STATS BAND ---------------------------------------------------------- */}
      <StatsBand />

      {/* FIRST-PASS GUARANTEE ----------------------------------------------- */}
      <FirstPassGuaranteeBand />

      {/* INDUSTRIES ---------------------------------------------------------- */}
      <IndustryGrid />

      {/* TESTIMONIALS -------------------------------------------------------- */}
      <TestimonialsRow />

      {/* PRICING ------------------------------------------------------------- */}
      <section id="pricing" className="relative overflow-hidden border-t bg-background">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-ambient-sky opacity-70" />
        <div className="relative mx-auto max-w-3xl px-4 pt-16 text-center sm:px-6 sm:pt-20 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Start free. Automate intake with Pro. Coordinate your team with Business. Scale with Enterprise.
          </p>
          <p className="mt-2 text-sm text-primary">
            Backed by our 30-day money-back guarantee. Cancel anytime.
          </p>
        </div>
        <div className="relative px-4 pb-16 pt-12 sm:px-6 lg:px-8 lg:pb-20">
          <PricingCardGrid />
        </div>
      </section>

      {/* FINAL CTA ----------------------------------------------------------- */}
      <FinalCtaCard />
    </>
  );
}
