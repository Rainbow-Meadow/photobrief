/**
 * photobrief-router — Cloudflare Worker bound to photobrief.ai/* and
 * www.photobrief.ai/*.
 *
 * Splits incoming requests between two origins based on the path:
 *
 *   - Marketing routes (/, /pricing, /help and their static assets) →
 *     Cloudflare Pages, which serves prerendered HTML built from this repo.
 *
 *   - Everything else (/auth, /dashboard, /requests, /r/*, /onboarding,
 *     /settings/*, /guides, …) → Lovable hosting (photobrief.lovable.app),
 *     which continues to serve the SPA exactly as it does today.
 *
 * The allow-list MUST stay in sync with scripts/prerender.mjs ROUTES.
 *
 * Asset routing strategy
 * ----------------------
 * Vite emits hashed filenames into /assets/*. Both the Pages build and
 * the Lovable build produce the SAME bundle (same source repo), so a
 * request for /assets/index-CM16Y4DE.js can be served by either origin.
 * We route /assets/* to Pages because:
 *   1. Pages caches at the edge with a 1y TTL out of the box.
 *   2. Pages → Lovable would add an extra hop with no benefit.
 * If Pages 404s on an asset (because the Lovable build is one commit
 * ahead, say), we fall back to Lovable transparently.
 */

interface Env {
  PAGES_HOST: string; // e.g. "photobrief-marketing.pages.dev"
  LOVABLE_HOST: string; // e.g. "photobrief.lovable.app"
}

// Exact paths served from Pages (everything else, including /auth, falls
// through to Lovable).
const MARKETING_PATHS = new Set<string>([
  "/",
  "/pricing",
  "/help",
  "/for-ai-agents",
]);

// Path prefixes for static files emitted by the Pages build, including
// the AI / answer-engine discovery files.
const STATIC_PREFIXES = [
  "/assets/",
  "/og-image",
  "/favicon",
  "/apple-touch-icon",
  "/robots.txt",
  "/sitemap.xml",
  "/llms.txt",
  "/llms-full.txt",
  "/openapi.json",
  "/mcp.json",
  "/.well-known/",
  "/marketing/",
];

function isMarketingPath(pathname: string): boolean {
  if (MARKETING_PATHS.has(pathname)) return true;
  // Allow trailing slash variants (Pages serves /pricing and /pricing/).
  if (pathname.endsWith("/") && MARKETING_PATHS.has(pathname.slice(0, -1))) return true;
  return false;
}

function isStaticAsset(pathname: string): boolean {
  return STATIC_PREFIXES.some((p) => pathname.startsWith(p));
}

async function proxyTo(host: string, request: Request): Promise<Response> {
  const url = new URL(request.url);
  url.hostname = host;
  url.protocol = "https:";
  url.port = "";

  // Preserve method, headers, body. Set Host so the origin sees its own name.
  const headers = new Headers(request.headers);
  headers.set("host", host);
  // Strip CF-* internal headers the origin shouldn't see.
  headers.delete("cf-connecting-ip");
  headers.delete("cf-ray");

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };
  if (!["GET", "HEAD"].includes(request.method)) {
    init.body = request.body;
  }

  return fetch(url.toString(), init);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    const goPages = isMarketingPath(path) || isStaticAsset(path);

    if (goPages) {
      const res = await proxyTo(env.PAGES_HOST, request);
      // Transparent fallback: if Pages doesn't have the asset (e.g. build
      // skew), let Lovable try. Only fall back for static assets — for
      // marketing paths a 404 from Pages should surface, otherwise we'd
      // mask configuration drift.
      if (res.status === 404 && isStaticAsset(path)) {
        return proxyTo(env.LOVABLE_HOST, request);
      }
      return res;
    }

    return proxyTo(env.LOVABLE_HOST, request);
  },
};
