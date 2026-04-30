/**
 * Build a schema.org HowTo JSON-LD object from the visible "How it works"
 * step list. Source: `steps` exported from HowItWorksSteps.tsx.
 */
export interface HowToStep {
  title: string;
  body: string;
}

export function buildHowToJsonLd(name: string, steps: HowToStep[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    step: steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.title,
      text: s.body,
    })),
  };
}
