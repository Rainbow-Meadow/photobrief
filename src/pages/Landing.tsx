import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { ArrowRight, PlayCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { PageMeta } from "@/hooks/seo/usePageMeta";
import { buildHowToJsonLd } from "@/hooks/seo/buildHowToJsonLd";
import { buildFaqJsonLd } from "@/hooks/seo/buildFaqJsonLd";
import { HeroGlassStory } from "@/components/marketing/HeroGlassStory";
import { TrustLogosStrip } from "@/components/marketing/TrustLogosStrip";
import { HowItWorksSteps, howItWorksSteps } from "@/components/marketing/HowItWorksSteps";
import { StatsBand } from "@/components/marketing/StatsBand";
import { IndustryGrid } from "@/components/marketing/IndustryGrid";
import { TestimonialsRow } from "@/components/marketing/TestimonialsRow";
import { FinalCtaCard } from "@/components/marketing/FinalCtaCard";
import { FirstPassGuaranteeBand } from "@/components/marketing/FirstPassGuaranteeBand";
import { PricingCardGrid } from "@/components/pricing/PricingCardGrid";
import { faqItems } from "@/features/help/content/faq";
import { trackEvent } from "@/lib/analytics";
import { signupCtaTarget, signupCtaLabel } from "@/config/access";

const SOFTWARE_APP_JSONLD: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "PhotoBrief",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "PhotoBrief turns vague customer photos into business-ready briefs. Chat-guided capture, AI quality checks, clean summaries.",
  offers: [
    { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
    { "@type": "Offer", name: "Starter", price: "19", priceCurrency: "USD" },
    { "@type": "Offer", name: "Pro", price: "49", priceCurrency: "USD" },
    { "@type": "Offer", name: "Team", price: "99", priceCurrency: "USD" },
    { "@type": "Offer", name: "Business", price: "199", priceCurrency: "USD" },
  ],
  featureList: [
    "AI-guided photo capture",
    "Per-photo quality checks (blur, lighting, framing, distance)",
    "Missing-shot follow-up",
    "Auto-generated brief and summary",
    "Branded recipient links",
    "REST API and outbound webhooks (Business plan)",
  ],
};


export default function LandingPage() {
  const [demoOpen, setDemoOpen] = useState(false);
  const jsonLd = useMemo(
    () => [
      SOFTWARE_APP_JSONLD,
      buildHowToJsonLd("Send a PhotoBrief request", howItWorksSteps),
      buildFaqJsonLd(faqItems),
    ],
    [],
  );
  return (
    <>
      <PageMeta
        title="PhotoBrief | Send a link. Get a complete brief."
        description="PhotoBrief turns customer photos into AI-guided, business-ready submissions with quality checks, missing-shot prompts, and clean summaries."
        canonicalPath="/"
        jsonLd={jsonLd}
        breadcrumbs={[{ name: "Home", path: "/" }]}
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
              Stop chasing customers
              <br />
              for{" "}
              <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                photos
              </span>
              .
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Send one branded link. Your customer follows step-by-step prompts on their phone.
              You get a complete, AI-checked brief — photos, details, and a plain-English summary —
              ready to quote, dispatch, or file.
            </p>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground/90">
              Built for roofing, HVAC, plumbing, electrical, junk removal, claims, and property management.
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
              <Button
                size="xl"
                variant="glass"
                className="rounded-full"
                onClick={() => {
                  trackEvent("cta_click", { location: "hero", label: "watch_demo" });
                  setDemoOpen(true);
                }}
              >
                <PlayCircle className="mr-1 h-5 w-5" /> Watch 60-sec demo
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No app for your customer · Works on any phone · Invite-only beta
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

      {/* DEMO VIDEO MODAL ---------------------------------------------------- */}
      <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
        <DialogContent className="max-w-4xl border-0 bg-black p-0 sm:rounded-xl overflow-hidden">
          <VisuallyHidden>
            <DialogTitle>PhotoBrief product demo</DialogTitle>
            <DialogDescription>A short walkthrough of the PhotoBrief request flow.</DialogDescription>
          </VisuallyHidden>
          <video
            key={demoOpen ? "open" : "closed"}
            src="/marketing/photobrief-demo.mp4"
            controls
            autoPlay
            playsInline
            className="h-auto w-full"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
