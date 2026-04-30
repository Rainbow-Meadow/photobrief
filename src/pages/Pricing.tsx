import { NavLink } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { PricingCardGrid } from "@/components/pricing/PricingCardGrid";
import { SEOHead } from "@/components/seo/SEOHead";

import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Can I switch plans later?",
    a: "Yes. Upgrade or downgrade any time — we prorate the difference automatically.",
  },
  {
    q: "What happens if I hit my monthly request limit?",
    a: "We'll let you know before you hit it. You can upgrade in one click or wait for the next billing cycle.",
  },
  {
    q: "Do recipients need an account?",
    a: "Never. They open a link, follow the chat, and submit. PhotoBrief handles the rest.",
  },
  {
    q: "Is annual really 20% off?",
    a: "Yes — pay yearly and the effective monthly price drops by 20%, on every paid plan.",
  },
  {
    q: "What is Founding Pro?",
    a: "The first 50 customers on the Pro plan lock in a discounted rate forever and get early access to new features.",
  },
];

export default function PricingPage() {
  return (
    <>
      <SEOHead
        title="Pricing | PhotoBrief"
        description="Simple, transparent PhotoBrief pricing. Start free, automate intake with Pro, coordinate your team with Business, scale with Enterprise."
        canonicalPath="/pricing"
      />
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-ambient-sky" />
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-ambient-mesh opacity-60" />
        <div className="relative mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8 animate-lift-in">
          <p className="text-eyebrow">Pricing</p>
          <h1 className="text-display mt-3 text-foreground">Simple, transparent pricing</h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            Start free. Automate intake with Pro. Coordinate your team with Business. Scale with Enterprise.
          </p>
          <p className="mt-2 text-sm text-primary">
            Backed by our 30-day money-back guarantee. Cancel anytime.
          </p>
        </div>
      </section>

      <section className="relative px-4 pb-16 pt-4 sm:px-6 lg:px-8 lg:pb-20">
        <PricingCardGrid />
      </section>

      <section className="relative overflow-hidden bg-background">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-ambient-mesh opacity-50" />
        <div className="relative mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-foreground">
            Questions, answered.
          </h2>
          <Accordion type="single" collapsible className="mt-8 glass-strong rounded-2xl px-4 sm:px-6">
            {faqs.map((f) => (
              <AccordionItem key={f.q} value={f.q}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="glass-strong mt-12 flex flex-col items-center gap-3 rounded-3xl p-8 text-center shadow-glass-lg">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <p className="text-base font-semibold text-foreground">
              30-day money-back guarantee
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              If PhotoBrief isn't a fit in your first month, email us and we'll refund you.
            </p>
            <Button asChild size="xl" className="mt-2 rounded-full">
              <NavLink to={signupCtaTarget()}>
                {signupCtaLabel()} <ArrowRight className="ml-1 h-4 w-4" />
              </NavLink>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
