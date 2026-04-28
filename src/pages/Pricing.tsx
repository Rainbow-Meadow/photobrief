import { NavLink } from "react-router-dom";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { PricingCardGrid } from "@/components/pricing/PricingCardGrid";
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
      <section className="relative overflow-hidden bg-gradient-brand text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-radial-glow" />
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur">
            <Sparkles className="h-3 w-3" /> Simple, transparent pricing
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
            Pick the plan that fits your week — not your year.
          </h1>
          <p className="mt-4 text-base text-white/75 sm:text-lg">
            Start free. Upgrade once PhotoBrief is saving you real time.
            Every paid plan is 20% cheaper when paid annually.
          </p>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <PricingCardGrid />
      </section>

      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-foreground">
            Questions, answered.
          </h2>
          <Accordion type="single" collapsible className="mt-8">
            {faqs.map((f) => (
              <AccordionItem key={f.q} value={f.q}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-12 flex flex-col items-center gap-3 rounded-2xl border bg-card p-8 text-center shadow-elev-sm">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <p className="text-base font-semibold text-foreground">
              30-day money-back guarantee
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              If PhotoBrief isn't a fit in your first month, email us and we'll refund you.
            </p>
            <Button asChild className="mt-2">
              <NavLink to="/auth?mode=signup">
                Start free <ArrowRight className="ml-1 h-4 w-4" />
              </NavLink>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
