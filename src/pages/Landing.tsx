import { NavLink } from "react-router-dom";
import { ArrowRight, PlayCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/seo/SEOHead";
import { HeroProductMockup } from "@/components/marketing/HeroProductMockup";
import { TrustLogosStrip } from "@/components/marketing/TrustLogosStrip";
import { HowItWorksSteps } from "@/components/marketing/HowItWorksSteps";
import { StatsBand } from "@/components/marketing/StatsBand";
import { IndustryGrid } from "@/components/marketing/IndustryGrid";
import { TestimonialsRow } from "@/components/marketing/TestimonialsRow";
import { FinalCtaCard } from "@/components/marketing/FinalCtaCard";
import { FirstPassGuaranteeBand } from "@/components/marketing/FirstPassGuaranteeBand";
import { PricingCardGrid } from "@/components/pricing/PricingCardGrid";
import { trackEvent } from "@/lib/analytics";

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
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  },
];


export default function LandingPage() {
  return (
    <>
      <SEOHead
        title="PhotoBrief | Take the right photos, every time."
        description="PhotoBrief turns vague customer photos into business-ready briefs. Chat-guided capture, AI quality checks, clean summaries — every time."
        canonicalPath="/"
        jsonLd={LANDING_JSONLD}
      />
      {/* HERO ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-gradient-subtle">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(60%_50%_at_50%_0%,hsl(var(--primary)/0.12),transparent_70%)]"
        />

        <div className="relative mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-20 lg:px-8 lg:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-elev-sm">
              <Sparkles className="h-3 w-3 text-primary" /> AI-guided visual intake
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Send a link.
              <br />
              Get a complete{" "}
              <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                brief
              </span>
              .
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              PhotoBrief turns vague customer photos into business-ready briefs. Chat-guided
              capture, AI quality checks, and clean summaries — every time.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="rounded-full px-6">
                <NavLink
                  to="/auth?mode=signup"
                  onClick={() => trackEvent("cta_click", { location: "hero", label: "start_free" })}
                >
                  Start Free — No Credit Card <ArrowRight className="ml-1 h-4 w-4" />
                </NavLink>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="rounded-full px-5 text-foreground hover:bg-muted"
              >
                <a
                  href="#how-it-works"
                  onClick={() => trackEvent("cta_click", { location: "hero", label: "watch_demo" })}
                >
                  <PlayCircle className="mr-1 h-5 w-5" /> Watch 90-second demo
                </a>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Free plan includes 5 requests/month · No install for your customers
            </p>
            <a
              href="#first-pass-guarantee"
              onClick={() =>
                trackEvent("cta_click", { location: "hero", label: "first_pass_pill" })
              }
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary transition hover:bg-primary/10"
            >
              ✓ First-pass guarantee — rework? request refunded
            </a>
          </div>

          <div className="mt-14 sm:mt-16 lg:mt-20">
            <HeroProductMockup />
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
      <section id="pricing" className="border-t bg-gradient-subtle">
        <div className="mx-auto max-w-3xl px-4 pt-16 text-center sm:px-6 sm:pt-20 lg:px-8">
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
        <div className="px-4 pb-16 pt-12 sm:px-6 lg:px-8 lg:pb-20">
          <PricingCardGrid />
        </div>
      </section>

      {/* FINAL CTA ----------------------------------------------------------- */}
      <FinalCtaCard />
    </>
  );
}
