## Goal

Eliminate the ~4 second "element render delay" on the landing page by serving a fully-rendered HTML version of marketing pages from Cloudflare's edge, while the authenticated app continues to run as the existing Vite SPA on Lovable hosting.

## Why this works

Today, Lighthouse shows TTFB at 48ms but LCP at 3.6s — the H1 doesn't paint until React mounts (~4s of JS parse + execute). Pre-rendering ships the H1, hero copy, and above-the-fold HTML in the initial document so LCP fires within a few hundred ms of TTFB. The SPA then hydrates in the background with no visual change.

## Architecture

```text
                    photobrief.ai (Cloudflare proxy)
                              │
                ┌─────────────┴─────────────┐
                │ Cloudflare Worker / Pages │
                │ route-based origin pick   │
                └─────────────┬─────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
   /, /pricing, /help     /auth, /r/*    /dashboard, /requests,
   /forgot-password,      (recipient     /guides, /settings/*,
   /reset-password,       capture +      /onboarding, /invite/*
   /unsubscribe           auth pages)    (authenticated app)
            │                 │                 │
            ▼                 ▼                 ▼
   Cloudflare Pages    Lovable hosting   Lovable hosting
   (pre-rendered      (existing SPA)    (existing SPA)
    static HTML +
    hydrating SPA)
```

Marketing routes are pre-rendered at build time. Every other route stays on Lovable so nothing about the auth/app pipeline changes.

## What we build

**1. Pre-rendering in the existing Vite build**

Add `vite-plugin-prerender` (or `react-snap`) configured to crawl `/`, `/pricing`, `/help` after `vite build`. Output is regular `dist/` plus `dist/pricing/index.html`, `dist/help/index.html` with the React tree serialized into the body. The same JS bundle hydrates on load, so behavior is identical to today.

To make this safe, the prerender step runs against a "marketing-only" entry that mounts `<MarketingLayout>` + the three pages — it never touches `useAuth`, Supabase client, or any code that would fail in Node. The browser still loads the full app bundle as today.

**2. GitHub Actions → Cloudflare Pages**

Already-connected GitHub repo gets a workflow that on push to main:
- runs `npm ci && npm run build:prerender`
- publishes `dist/` to a Cloudflare Pages project named `photobrief-marketing` via `cloudflare/wrangler-action`

Pages auto-deploys on every push, gives us preview URLs per PR, and serves from Cloudflare's edge with Brotli + HTTP/3 by default.

**3. Cloudflare Worker for path routing**

A tiny Worker bound to `photobrief.ai/*` (and `www.photobrief.ai/*`) does:

```text
if path matches marketing allow-list:
    fetch from photobrief-marketing.pages.dev
else:
    fetch from photobrief.lovable.app   (current origin)
```

Allow-list: `/`, `/pricing`, `/help`, `/forgot-password`, `/reset-password`, `/unsubscribe`, plus static asset paths emitted by the prerender build (`/assets/*` for the prerendered bundle is namespaced so it can't collide).

`app.photobrief.ai` is left untouched — it always goes to Lovable.

**4. SEO assets**

While we're pre-rendering, fix three things that need server-rendered HTML to count:
- per-route `<title>` and `<meta name="description">` for `/pricing` and `/help`
- canonical link tag per route
- a real sitemap.xml listing the prerendered URLs (replaces current static one if needed)
- JSON-LD `Organization` + `SoftwareApplication` schema in the landing `<head>`

## Expected impact

| Metric | Before | After (target) |
|---|---|---|
| LCP (mobile) | 3.6s | ~0.8-1.2s |
| Speed Index | 7.0s | ~2-3s |
| FCP | 2.3s | ~0.6s |
| Element render delay | 4,021ms | ~50ms |
| Crawler-visible HTML | empty `<div id="root">` | full marketing copy |

The big win is the last row — Google currently sees an empty div until JS executes. Pre-rendered HTML means meta descriptions, headings, and copy are indexable without depending on Googlebot's JS rendering queue.

## What stays the same

- All routes under `/dashboard`, `/requests`, `/guides`, `/settings/*`, `/onboarding`, `/invite/*`, `/r/*`, `/auth` continue to be served from `photobrief.lovable.app` exactly as today.
- The Vite SPA itself is unchanged — same bundle, same routes, same auth flow.
- Lovable Cloud (Supabase) backend is untouched.
- `app.photobrief.ai` continues to point straight to Lovable.
- No publishing workflow changes — Lovable's Publish button still controls the SPA. Cloudflare Pages deploys are driven by git push.

## Risks and mitigations

- **Hydration mismatch on prerendered pages.** Mitigated by keeping the marketing pages free of `Date.now()`, `Math.random()`, and any auth-dependent rendering above the fold. They already are today.
- **Stale prerendered HTML after a content edit.** Every push to main triggers a fresh Pages build. Plus we'll set Cache-Control on the HTML to `public, max-age=0, must-revalidate` so visitors always get the latest, while `/assets/*` keeps the existing 1-year hash-based caching.
- **Worker adds a hop.** Cloudflare Workers add ~5ms; net win because both origins are Cloudflare-fronted.
- **Cost.** Cloudflare Pages free tier covers 500 builds/month and unlimited bandwidth. Workers free tier covers 100k requests/day. No expected charges.

## Steps in build order

1. Create a `prerender.config.ts` and a marketing-only Vite entry that excludes auth/Supabase code paths.
2. Add `npm run build:prerender` script that runs `vite build` then crawls the listed routes and writes static HTML.
3. Add per-route `<title>`/`<meta>`/canonical/JSON-LD via a small `<SEOHead>` component used on each marketing page.
4. Add `.github/workflows/deploy-marketing.yml` that runs the build and pushes `dist/` to Cloudflare Pages on push to main. Requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repo secrets — I'll add them via the Cloudflare API.
5. Write the routing Worker (`workers/router/index.ts` + `wrangler.toml`) and deploy it via the same workflow, bound to `photobrief.ai/*` and `www.photobrief.ai/*`.
6. Verify: hit `/`, `/pricing`, `/help` and confirm "view source" shows the rendered copy; hit `/dashboard` and confirm it still loads from Lovable; re-run Lighthouse.

Step 1-3 are code changes in this repo. Step 4-5 require GitHub repo access (already connected) and the Cloudflare API token (already available). Step 6 is verification.

## Out of scope

- Migrating the authenticated app off Lovable hosting.
- Switching to a true SSR framework (Next/Remix). Pre-rendering gives us the SEO and LCP wins without that lift.
- Image optimization beyond the WebP work already done.
