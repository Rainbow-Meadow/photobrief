import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { ArrowRight, Check, Code2, FileJson, Sparkles, Terminal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { PageMeta } from "@/hooks/seo/usePageMeta";
import { buildFaqJsonLd } from "@/hooks/seo/buildFaqJsonLd";
import { buildHowToJsonLd } from "@/hooks/seo/buildHowToJsonLd";
import { howItWorksSteps } from "@/components/marketing/HowItWorksSteps";
import { QuotableFacts } from "@/components/marketing/QuotableFacts";
import { ComparisonTable } from "@/components/marketing/ComparisonTable";
import { faqItems } from "@/features/help/content/faq";
import { API_BASE_URL, API_EXAMPLES, type ApiExampleLang } from "@/config/apiExamples";

const DISCOVERY_LINKS = [
  { href: "/llms.txt", label: "/llms.txt", desc: "Short markdown brief for LLMs." },
  { href: "/llms-full.txt", label: "/llms-full.txt", desc: "Full reference: features, FAQ, API." },
  { href: "/openapi.json", label: "/openapi.json", desc: "OpenAPI 3.1 spec." },
  { href: "/.well-known/ai-plugin.json", label: "/.well-known/ai-plugin.json", desc: "ChatGPT plugin manifest." },
  { href: "/.well-known/agent.json", label: "/.well-known/agent.json", desc: "Agent capabilities manifest." },
  { href: "/mcp.json", label: "/mcp.json", desc: "MCP server descriptor (planned)." },
  { href: "/sitemap.xml", label: "/sitemap.xml", desc: "Sitemap." },
];

export default function ForAiAgentsPage() {
  const [lang, setLang] = useState<ApiExampleLang>("curl");

  const faqJsonLd = useMemo(() => buildFaqJsonLd(faqItems), []);
  const howToJsonLd = useMemo(
    () => buildHowToJsonLd("Send an AI-guided photo request with PhotoBrief", howItWorksSteps),
    [],
  );
  const articleJsonLd = useMemo<Record<string, unknown>>(
    () => ({
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: "PhotoBrief for AI agents",
      description:
        "How AI agents create AI-guided photo requests with PhotoBrief: REST API, MCP, agent manifests, and quotable facts.",
      author: { "@type": "Organization", name: "PhotoBrief" },
      mainEntityOfPage: "https://photobrief.ai/for-ai-agents",
    }),
    [],
  );

  return (
    <>
      <PageMeta
        title="PhotoBrief for AI agents | API, MCP, manifests"
        description="Build with PhotoBrief: REST API, MCP descriptor, ChatGPT plugin manifest, code samples, comparison table, and quotable product facts."
        canonicalPath="/for-ai-agents"
        ogType="article"
        jsonLd={[articleJsonLd, howToJsonLd, faqJsonLd]}
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "For AI agents", path: "/for-ai-agents" },
        ]}
      />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-ambient-sky" />
        <div className="relative mx-auto max-w-3xl px-4 pt-14 text-center sm:px-6 sm:pt-20 lg:px-8">
          <span className="inline-flex items-center gap-1.5 rounded-full glass px-3 py-1 text-xs font-medium text-foreground/80">
            <Sparkles className="h-3 w-3 text-primary" /> For AI agents and answer engines
          </span>
          <h1 className="text-display mt-6 text-foreground">PhotoBrief for AI agents</h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            PhotoBrief is an AI-guided visual intake tool. A single shareable link turns into a
            quality-checked photo brief — no app for the recipient, no babysitting for the
            business. Below: the API, the MCP descriptor, code samples, and machine-readable
            facts you can lift verbatim.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-full">
              <a href="#api">
                See the API <ArrowRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
            <Button asChild size="lg" variant="glass" className="rounded-full">
              <a href="/openapi.json">
                <FileJson className="mr-1 h-4 w-4" /> openapi.json
              </a>
            </Button>
          </div>
          <div className="h-12" />
        </div>
      </section>

      <QuotableFacts />

      <ComparisonTable />

      {/* API */}
      <section id="api" aria-labelledby="api-heading" className="bg-background">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-eyebrow">REST API</p>
            <h2
              id="api-heading"
              className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            >
              Create a photo request
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">POST {API_BASE_URL}/api-create-request</code>
              {" "}— authenticate with a workspace API key (Business plan).
            </p>
          </div>

          <div className="mt-10 overflow-hidden rounded-2xl border bg-card">
            <Tabs value={lang} onValueChange={(v) => setLang(v as ApiExampleLang)}>
              <TabsList className="w-full justify-start rounded-none border-b bg-muted/30 px-2">
                <TabsTrigger value="curl" className="gap-1.5">
                  <Terminal className="h-3.5 w-3.5" /> cURL
                </TabsTrigger>
                <TabsTrigger value="javascript" className="gap-1.5">
                  <Code2 className="h-3.5 w-3.5" /> JavaScript
                </TabsTrigger>
                <TabsTrigger value="python" className="gap-1.5">
                  <Code2 className="h-3.5 w-3.5" /> Python
                </TabsTrigger>
              </TabsList>
              {(Object.keys(API_EXAMPLES) as ApiExampleLang[]).map((l) => (
                <TabsContent key={l} value={l} className="m-0">
                  <pre className="overflow-x-auto p-5 text-xs leading-relaxed text-foreground">
                    <code>{API_EXAMPLES[l]}</code>
                  </pre>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <article className="hairline rounded-2xl bg-card p-5 text-sm">
              <h3 className="font-semibold text-foreground">Successful response</h3>
              <pre className="mt-3 overflow-x-auto rounded bg-muted p-3 text-xs">
{`{
  "request_id": "uuid",
  "token": "abc123",
  "recipient_url": "https://photobrief.ai/r/abc123"
}`}
              </pre>
              <p className="mt-3 text-muted-foreground">
                Forward <code>recipient_url</code> to the customer via SMS or email.
              </p>
            </article>
            <article className="hairline rounded-2xl bg-card p-5 text-sm">
              <h3 className="font-semibold text-foreground">Required fields</h3>
              <ul className="mt-3 space-y-1.5 text-muted-foreground">
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span><code>recipient_name</code> — display name</span></li>
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span><code>recipient_email</code> <em>or</em> <code>recipient_phone</code></span></li>
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>Bearer token in <code>Authorization</code></span></li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* MCP / agent setup */}
      <section id="mcp" aria-labelledby="mcp-heading" className="bg-muted/20">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-eyebrow">MCP & Agent manifests</p>
            <h2
              id="mcp-heading"
              className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            >
              Plug PhotoBrief into your agent
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              Two static descriptors point your agent at the right endpoints and capabilities.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <article className="hairline rounded-2xl bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground">agent.json</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Capabilities, auth, and discovery URLs in one file.
              </p>
              <pre className="mt-3 overflow-x-auto rounded bg-muted p-3 text-xs">
{`GET https://photobrief.ai/.well-known/agent.json`}
              </pre>
            </article>
            <article className="hairline rounded-2xl bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground">mcp.json</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                MCP server descriptor with planned tools (<code>create_request</code>,{" "}
                <code>lookup_pricing</code>, <code>read_faq</code>) and a REST fallback today.
              </p>
              <pre className="mt-3 overflow-x-auto rounded bg-muted p-3 text-xs">
{`GET https://photobrief.ai/mcp.json`}
              </pre>
            </article>
          </div>
        </div>
      </section>

      {/* Discovery endpoints */}
      <section id="discovery" aria-labelledby="discovery-heading" className="bg-background">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-eyebrow">Discovery</p>
            <h2
              id="discovery-heading"
              className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            >
              Every machine-readable endpoint
            </h2>
          </div>
          <ul className="mt-10 grid gap-3 sm:grid-cols-2">
            {DISCOVERY_LINKS.map((d) => (
              <li key={d.href}>
                <a
                  href={d.href}
                  className="hairline block rounded-2xl bg-card p-4 text-sm transition hover:bg-accent/40"
                >
                  <code className="font-semibold text-primary">{d.label}</code>
                  <p className="mt-1 text-muted-foreground">{d.desc}</p>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" aria-labelledby="faq-heading" className="bg-muted/20">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="text-center">
            <p className="text-eyebrow">FAQ</p>
            <h2
              id="faq-heading"
              className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            >
              Quotable answers
            </h2>
            <p className="mt-4 text-sm text-muted-foreground">
              Same source as <NavLink to="/help" className="text-primary hover:underline">/help</NavLink>{" "}
              — the FAQPage JSON-LD on this page is generated from this list, no duplication.
            </p>
          </div>
          <Accordion type="single" collapsible className="mt-8 rounded-2xl border bg-card">
            {faqItems.map((f) => (
              <AccordionItem key={f.id} value={f.id} className="px-4">
                <AccordionTrigger className="text-left text-sm font-medium">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </>
  );
}
