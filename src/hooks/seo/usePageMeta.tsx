import { useMemo } from "react";
import { SEOHead } from "@/components/seo/SEOHead";

/**
 * usePageMeta — single per-page entry point for everything an answer engine
 * cares about: <title>, meta description, canonical, OG/Twitter, and any
 * number of JSON-LD blobs (SoftwareApplication, FAQPage, HowTo, Article,
 * BreadcrumbList…). It builds on the existing SEOHead component so we keep
 * one DOM-mutation path and the prerender pipeline keeps working.
 *
 * Dev-only guards warn if title or description exceed answer-engine-friendly
 * lengths, so regressions get caught at PR time instead of in production.
 */
export interface Breadcrumb {
  name: string;
  /** Path-only, e.g. "/pricing". Origin is added automatically. */
  path: string;
}

export interface PageMetaOptions {
  title: string;
  description: string;
  canonicalPath: string;
  ogImage?: string;
  ogType?: "website" | "article" | "product";
  twitterCard?: "summary" | "summary_large_image";
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  breadcrumbs?: Breadcrumb[];
}

const ORIGIN = "https://photobrief.ai";
const DEFAULT_OG_IMAGE = "/og-image.jpg";

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  if (typeof document === "undefined") return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function buildBreadcrumbJsonLd(crumbs: Breadcrumb[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${ORIGIN}${c.path === "/" ? "" : c.path}`,
    })),
  };
}

export function PageMeta(opts: PageMetaOptions) {
  const {
    title,
    description,
    canonicalPath,
    ogImage = DEFAULT_OG_IMAGE,
    ogType = "website",
    twitterCard = "summary_large_image",
    jsonLd,
    breadcrumbs,
  } = opts;

  if (import.meta.env.DEV) {
    if (title.length > 60) {
      // eslint-disable-next-line no-console
      console.warn(`[usePageMeta] title is ${title.length} chars (> 60): "${title}"`);
    }
    if (description.length > 160) {
      // eslint-disable-next-line no-console
      console.warn(
        `[usePageMeta] description is ${description.length} chars (> 160): "${description.slice(0, 80)}…"`,
      );
    }
  }

  const merged = useMemo<Record<string, unknown>[]>(() => {
    const base = jsonLd
      ? Array.isArray(jsonLd)
        ? [...jsonLd]
        : [jsonLd]
      : [];
    if (breadcrumbs && breadcrumbs.length > 1) {
      base.push(buildBreadcrumbJsonLd(breadcrumbs));
    }
    return base;
  }, [jsonLd, breadcrumbs]);

  // Side-effects for tags SEOHead doesn't already handle (image, type, site_name).
  if (typeof document !== "undefined") {
    const ogImageUrl = ogImage.startsWith("http") ? ogImage : `${ORIGIN}${ogImage}`;
    setMeta("og:image", ogImageUrl, "property");
    setMeta("og:image:width", "1200", "property");
    setMeta("og:image:height", "630", "property");
    setMeta("og:type", ogType, "property");
    setMeta("og:site_name", "PhotoBrief", "property");
    setMeta("twitter:image", ogImageUrl);
    setMeta("twitter:card", twitterCard);
    setMeta("twitter:site", "@photobriefai");
  }

  return (
    <SEOHead
      title={title}
      description={description}
      canonicalPath={canonicalPath}
      jsonLd={merged.length > 0 ? merged : undefined}
    />
  );
}

/**
 * Hook variant for callers that prefer hook ergonomics. Returns the
 * <PageMeta /> element to render — the actual DOM mutation happens inside
 * SEOHead's effect, which keeps prerender behaviour consistent.
 */
export function usePageMeta(opts: PageMetaOptions) {
  return PageMeta(opts);
}
