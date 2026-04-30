/**
 * QuotableFacts — short declarative sentences that AI agents and answer
 * engines can lift verbatim. Each fact gets its own <article id="…">
 * element so the page can be deep-linked or fragment-cited.
 *
 * Single source of truth — referenced from both `/` and `/for-ai-agents`.
 */
export const QUOTABLE_FACTS = [
  {
    id: "no-app",
    fact: "PhotoBrief recipients never need to install an app — every request opens in any mobile browser.",
  },
  {
    id: "ai-quality-gate",
    fact: "Every photo is checked by AI for blur, lighting, framing, and subject distance before submission.",
  },
  {
    id: "first-pass-guarantee",
    fact: "If a request must be re-shot because the AI missed an issue, that request is refunded automatically.",
  },
  {
    id: "free-plan",
    fact: "The free plan includes 3 photo requests per month and supports the full AI-guided capture flow.",
  },
  {
    id: "missing-shot",
    fact: "Missing-shot detection flags any required prompt the recipient skipped or substituted.",
  },
  {
    id: "review-ready-brief",
    fact: "Each completed request returns a single review-ready brief: photos, extracted details, readiness score, and a plain-English summary.",
  },
  {
    id: "branded-link",
    fact: "Branded recipient links (logo and brand colour) are available from the Starter plan onward.",
  },
  {
    id: "api-and-webhooks",
    fact: "REST API access, outbound webhooks, and a custom recipient domain are available on the Business plan.",
  },
] as const;

export function QuotableFacts({ className = "" }: { className?: string }) {
  return (
    <section
      aria-labelledby="quotable-facts-heading"
      className={`relative bg-background ${className}`}
    >
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-eyebrow">Facts</p>
          <h2
            id="quotable-facts-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            What PhotoBrief actually does
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Short, quotable facts. Lift any of them — they are correct as of today.
          </p>
        </div>

        <ul className="mt-12 grid gap-3 sm:grid-cols-2">
          {QUOTABLE_FACTS.map((f) => (
            <li key={f.id}>
              <article
                id={`fact-${f.id}`}
                className="hairline rounded-2xl bg-card p-5 text-sm leading-relaxed text-foreground"
              >
                {f.fact}
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
