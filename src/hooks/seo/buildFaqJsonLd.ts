import { extractText } from "./extractText";
import type { FaqItem } from "@/features/help/content/faq";

/**
 * Build a schema.org FAQPage JSON-LD object from the same `FaqItem[]` array
 * the page renders visibly. Single source of truth — no duplicated copy.
 */
export function buildFaqJsonLd(items: FaqItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: extractText(f.a).trim(),
      },
    })),
  };
}
