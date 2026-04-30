import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Building2, HelpCircle, Rocket, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { GuideStep } from "@/features/help/components/GuideStep";
import { GuideTOC, type TocItem } from "@/features/help/components/GuideTOC";
import { QuickChecklist } from "@/features/help/components/QuickChecklist";
import { Callout } from "@/features/help/components/Callout";
import { PageMeta } from "@/hooks/seo/usePageMeta";
import { buildFaqJsonLd } from "@/hooks/seo/buildFaqJsonLd";

import { quickStartSteps, quickStartChecklist } from "@/features/help/content/quickStart";
import { businessSteps, businessChecklist } from "@/features/help/content/business";
import { recipientSteps } from "@/features/help/content/recipient";
import { faqItems } from "@/features/help/content/faq";

const tocItems: TocItem[] = [
  { id: "quick-start", label: "Quick start" },
  { id: "business", label: "For businesses" },
  { id: "recipient", label: "For your customers" },
  { id: "faq", label: "FAQ & troubleshooting" },
];

type TabValue = "quick" | "business" | "recipient" | "faq";

const hashToTab: Record<string, TabValue> = {
  "#quick-start": "quick",
  "#business": "business",
  "#recipient": "recipient",
  "#faq": "faq",
};

const tabToHash: Record<TabValue, string> = {
  quick: "#quick-start",
  business: "#business",
  recipient: "#recipient",
  faq: "#faq",
};

export default function BetaGuidePage() {
  const [tab, setTab] = useState<TabValue>("quick");

  // Sync tab with the URL hash so deep links work.
  useEffect(() => {
    const apply = () => {
      const next = hashToTab[window.location.hash];
      if (next) setTab(next);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const handleTabChange = (v: string) => {
    const next = v as TabValue;
    setTab(next);
    if (window.location.hash !== tabToHash[next]) {
      // Use replaceState to avoid clobbering history on every click.
      history.replaceState(null, "", tabToHash[next]);
    }
  };

  const businessFaqs = useMemo(() => faqItems.filter((f) => f.audience === "business"), []);
  const recipientFaqs = useMemo(() => faqItems.filter((f) => f.audience === "recipient"), []);

  return (
    <div className="space-y-8">
      <PageMeta
        title="Help & beta guide | PhotoBrief"
        description="Get started with PhotoBrief in 5 minutes. Step-by-step guides for sending photo requests, receiving them, and getting the most out of every brief."
        canonicalPath="/help"
        ogType="article"
        jsonLd={[buildFaqJsonLd(faqItems)]}
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Help", path: "/help" },
        ]}
      />
      {/* Hero */}
      <header className="rounded-3xl border bg-gradient-to-br from-primary/10 via-background to-accent/30 p-6 sm:p-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              <Rocket className="h-3.5 w-3.5" /> Beta user guide
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Welcome to PhotoBrief
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
              Get up and running in 5 minutes. Whether you’re sending requests or receiving one,
              this guide walks you through the real screens — step by step.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" className="rounded-full">
              <a href="#quick-start" onClick={() => handleTabChange("quick")}>
                Start with Quick start <ArrowRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <a href="#recipient" onClick={() => handleTabChange("recipient")}>
                I’m a customer
              </a>
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Sticky TOC on desktop */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <GuideTOC items={tocItems} activeId={tabToHash[tab].slice(1)} />
          </div>
        </aside>

        <div className="min-w-0">
          <Tabs value={tab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="flex w-full flex-wrap gap-1">
              <TabsTrigger value="quick" className="gap-1.5">
                <Rocket className="h-3.5 w-3.5" /> Quick start
              </TabsTrigger>
              <TabsTrigger value="business" className="gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Businesses
              </TabsTrigger>
              <TabsTrigger value="recipient" className="gap-1.5">
                <Smartphone className="h-3.5 w-3.5" /> Customers
              </TabsTrigger>
              <TabsTrigger value="faq" className="gap-1.5">
                <HelpCircle className="h-3.5 w-3.5" /> FAQ
              </TabsTrigger>
            </TabsList>

            {/* Quick start */}
            <TabsContent value="quick" id="quick-start" className="space-y-4 scroll-mt-24">
              <SectionIntro
                icon={<Rocket className="h-4 w-4" />}
                title="The fastest path to your first request"
                body="Five steps to send a request and review the result. If you only read one section, read this one."
              />
              <QuickChecklist
                storageKey="pb.help.quickStart"
                items={quickStartChecklist}
                title="Tick these off as you go"
              />
              <div className="space-y-4">
                {quickStartSteps.map((step) => (
                  <GuideStep key={step.number} {...step} />
                ))}
              </div>
              <Callout variant="success" title="That’s it">
                You’ve sent your first request. Jump into{" "}
                <a className="font-medium text-primary underline-offset-4 hover:underline" href="#business" onClick={() => handleTabChange("business")}>
                  For businesses
                </a>{" "}
                for the full tour.
              </Callout>
            </TabsContent>

            {/* Business */}
            <TabsContent value="business" id="business" className="space-y-4 scroll-mt-24">
              <SectionIntro
                icon={<Building2 className="h-4 w-4" />}
                title="For businesses"
                body="Everything you need to create requests, review submissions, and configure your workspace."
              />
              <QuickChecklist
                storageKey="pb.help.business"
                items={businessChecklist}
                title="Recommended setup checklist"
              />
              <div className="space-y-4">
                {businessSteps.map((step) => (
                  <GuideStep key={step.number} {...step} />
                ))}
              </div>
            </TabsContent>

            {/* Recipient */}
            <TabsContent value="recipient" id="recipient" className="space-y-4 scroll-mt-24">
              <SectionIntro
                icon={<Smartphone className="h-4 w-4" />}
                title="For your customers"
                body="A short, friendly walkthrough you can forward to anyone receiving a PhotoBrief link. No app or sign-in needed."
              />
              <Callout variant="tip" title="Share this section">
                The link to this guide works without an account — copy it and send it to a
                customer who’s nervous about the chat flow.
              </Callout>
              <div className="space-y-4">
                {recipientSteps.map((step) => (
                  <GuideStep key={step.number} {...step} />
                ))}
              </div>
            </TabsContent>

            {/* FAQ */}
            <TabsContent value="faq" id="faq" className="space-y-6 scroll-mt-24">
              <SectionIntro
                icon={<HelpCircle className="h-4 w-4" />}
                title="FAQ & troubleshooting"
                body="Quick answers to the things beta users ask most often."
              />

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">For businesses</h3>
                <Accordion type="single" collapsible className="rounded-xl border bg-card">
                  {businessFaqs.map((f) => (
                    <AccordionItem key={f.id} value={f.id} className="px-4">
                      <AccordionTrigger className="text-left text-sm font-medium">
                        {f.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                        {f.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">For customers</h3>
                <Accordion type="single" collapsible className="rounded-xl border bg-card">
                  {recipientFaqs.map((f) => (
                    <AccordionItem key={f.id} value={f.id} className="px-4">
                      <AccordionTrigger className="text-left text-sm font-medium">
                        {f.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                        {f.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>

              <Callout variant="tip" title="Still stuck?">
                We read every piece of beta feedback. Email{" "}
                <a className="font-medium text-primary underline-offset-4 hover:underline" href="mailto:hello@photobrief.ai">
                  hello@photobrief.ai
                </a>{" "}
                and we’ll get back fast.
              </Callout>
            </TabsContent>
          </Tabs>

          <div className="mt-10 rounded-2xl border bg-card p-5 text-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-foreground">
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="font-medium">Ready to send a request?</span>
              </div>
              <Button asChild size="sm">
                <Link to="/requests/new">Open New request</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionIntro({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="space-y-1">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
        {icon} {title}
      </span>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
