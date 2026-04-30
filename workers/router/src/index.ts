/**
 * photobrief-router — Cloudflare Worker bound to photobrief.ai/* and
 * www.photobrief.ai/*.
 *
 * Splits incoming requests between two origins:
 *
 *   - Static assets (/assets/*, /og-image, /robots.txt, /sitemap.xml,
 *     /llms*.txt, /.well-known/*, etc.) → Cloudflare Pages, edge-cached.
 *
 *   - Marketing HTML routes (/, /pricing, /help, /for-ai-agents, /waitlist):
 *       • Bots / crawlers / LLM fetchers → Pages (prerendered static HTML
 *         optimized for SEO and answer-engine citation).
 *       • Real users → Lovable hosting (live SPA with the latest dynamic
 *         behavior, no prerender hydration delay).
 *
 *   - Everything else (/auth, /dashboard, /requests, /r/*, /onboarding,
 *     /settings/*, …) → Lovable hosting, regardless of client.
 *
 * The marketing allow-list MUST stay in sync with scripts/prerender.mjs,
 * which reads its routes from public/sitemap.xml.
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
  "/waitlist",
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

// Known bot / crawler / answer-engine user agents. Matched case-insensitively
// as substrings against the UA string. Covers traditional search crawlers,
// social previewers, SEO tools, and LLM/answer-engine fetchers.
const BOT_UA_PATTERNS = [
  // Search engines
  "googlebot", "google-inspectiontool", "bingbot", "slurp", "duckduckbot",
  "baiduspider", "yandex", "sogou", "exabot", "facebot", "ia_archiver",
  "applebot",
  // Social / link unfurlers
  "facebookexternalhit", "twitterbot", "linkedinbot", "slackbot",
  "discordbot", "telegrambot", "whatsapp", "skypeuripreview", "pinterest",
  "redditbot", "embedly", "quora link preview",
  // SEO / monitoring
  "ahrefsbot", "semrushbot", "mj12bot", "dotbot", "rogerbot", "screaming frog",
  "lighthouse", "pagespeed", "gtmetrix", "pingdom", "uptimerobot",
  // LLMs / answer engines
  "gptbot", "oai-searchbot", "chatgpt-user", "chatgpt", "openai",
  "claudebot", "claude-web", "anthropic-ai", "anthropic",
  "perplexitybot", "perplexity-user", "perplexity",
  "google-extended", "googleother",
  "ccbot", "cohere-ai", "cohere",
  "youbot", "phindbot", "amazonbot", "bytespider", "diffbot",
  "meta-externalagent", "meta-externalfetcher",
  "mistralai-user", "mistral",
  "duckassistbot", "kagibot",
  // Generic crawler hints
  "bot/", " bot ", "spider", "crawler", "crawl", "headlesschrome",
];

function isBot(request: Request): boolean {
  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  if (!ua) return true; // No UA → treat as bot, safer for SEO.
  return BOT_UA_PATTERNS.some((p) => ua.includes(p));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Static assets always come from Pages (edge-cached, hashed filenames).
    if (isStaticAsset(path)) {
      const res = await proxyTo(env.PAGES_HOST, request);
      // Transparent fallback for build skew (Lovable build one commit ahead).
      if (res.status === 404) {
        return proxyTo(env.LOVABLE_HOST, request);
      }
      return res;
    }

    // HTML navigations: split by client.
    //   - Bots/crawlers/LLMs → Pages (prerendered static HTML for SEO/citation).
    //   - Real users → Lovable (live SPA with the latest dynamic behavior).
    //
    // Marketing paths are guaranteed to have a prerendered file on Pages;
    // other paths will fall through to Lovable since Pages only knows the
    // marketing allow-list.
    if (isMarketingPath(path)) {
      if (isBot(request)) {
        const res = await proxyTo(env.PAGES_HOST, request);
        // Belt-and-suspenders: if Pages somehow 404s, serve the live SPA so
        // the bot still gets a usable response instead of an error.
        if (res.status === 404) return proxyTo(env.LOVABLE_HOST, request);
        return res;
      }
      return proxyTo(env.LOVABLE_HOST, request);
    }

    // Non-marketing paths (auth, app, recipient links, etc.) always go to
    // the live SPA on Lovable.
    return proxyTo(env.LOVABLE_HOST, request);
  },
};
