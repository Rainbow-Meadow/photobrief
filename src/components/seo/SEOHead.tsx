import { useEffect } from "react";

/**
 * SEOHead — sets per-route <title>, <meta name="description">, canonical
 * link, and (optionally) a JSON-LD blob without pulling in react-helmet.
 *
 * Two consumers care about this:
 *   1. Search engine crawlers reading the prerendered HTML produced by
 *      scripts/prerender.mjs at build time. The prerender pass runs the
 *      mount effect in headless Chromium, so by the time the snapshot is
 *      taken the document head already reflects the values below.
 *   2. Real visitors after client-side route changes — useEffect re-runs,
 *      keeping the head in sync as users navigate within the SPA.
 *
 * Why not react-helmet-async? It's ~7KB gz and an extra provider; this
 * direct DOM approach is ~30 lines and does the same job for our 3 marketing
 * routes.
 */
interface SEOHeadProps {
  title: string;
  description: string;
  /** Path-only canonical, e.g. "/pricing". Origin is added automatically. */
  canonicalPath: string;
  /** Optional JSON-LD object — serialized into a single <script> tag. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const ORIGIN = "https://photobrief.ai";

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLinkCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = href;
}

function setJsonLd(id: string, payload: SEOHeadProps["jsonLd"]) {
  // Remove any prior tag with this id so navigation between marketing
  // routes doesn't accumulate stale schema blobs.
  document.head.querySelector(`script[data-seo-jsonld="${id}"]`)?.remove();
  if (!payload) return;
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.dataset.seoJsonld = id;
  script.textContent = JSON.stringify(payload);
  document.head.appendChild(script);
}

export function SEOHead({ title, description, canonicalPath, jsonLd }: SEOHeadProps) {
  useEffect(() => {
    const canonical = `${ORIGIN}${canonicalPath === "/" ? "" : canonicalPath}`;

    document.title = title;
    setMeta("description", description);
    setLinkCanonical(canonical);

    // Open Graph + Twitter — keep titles/descs in sync with the page.
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    setMeta("og:url", canonical, "property");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);

    setJsonLd(canonicalPath, jsonLd);
  }, [title, description, canonicalPath, jsonLd]);

  return null;
}
