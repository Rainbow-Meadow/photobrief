#!/usr/bin/env node
/**
 * Prerender marketing routes to static HTML.
 *
 * After `vite build`, this script:
 *   1. Boots a tiny static server pointed at `dist/`.
 *   2. Spawns headless Chromium via Puppeteer.
 *   3. Visits each marketing route, waits for the React tree to mount + the
 *      hero LCP element to render.
 *   4. Snapshots the final DOM and writes it back to disk as
 *      `dist/<route>/index.html` — the SPA bundle still hydrates on top.
 *
 * The output is consumed by Cloudflare Pages, which serves the prerendered
 * HTML at the edge while the JS bundle continues to handle in-app navigation.
 *
 * Marketing routes ONLY. Authenticated/app/recipient routes are served by
 * Lovable as today; the Cloudflare router Worker decides which origin to hit.
 */

import { createServer } from "http";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { extname, join, dirname } from "path";
import { fileURLToPath } from "url";

import puppeteer from "puppeteer";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, "..", "dist");

// Routes to prerender are derived from public/sitemap.xml so the sitemap is
// the single source of truth. Anything listed there MUST also be in the
// Cloudflare Worker allow-list (workers/router/src/index.ts) so requests
// reach Pages instead of falling through to the Lovable app origin.
async function loadRoutesFromSitemap() {
  const sitemapPath = join(DIST_DIR, "sitemap.xml");
  const xml = await readFile(sitemapPath, "utf8");
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
    // Decode entities (&amp; etc.) and trim whitespace/newlines.
    m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim(),
  );

  const routes = locs
    .map((loc) => {
      // Accept absolute URLs (https://photobrief.ai/pricing) or bare paths
      // (/pricing). Fall back to a base so the URL constructor works for both.
      let pathname;
      try {
        pathname = new URL(loc, "https://placeholder.local").pathname;
      } catch {
        pathname = loc;
      }

      // Ensure leading slash.
      if (!pathname.startsWith("/")) pathname = `/${pathname}`;

      // Collapse duplicate slashes (//foo → /foo).
      pathname = pathname.replace(/\/{2,}/g, "/");

      // Normalize trailing slash: keep "/" as-is, strip from everything else
      // so "/pricing/" and "/pricing" produce the same dist/pricing/index.html.
      if (pathname.length > 1 && pathname.endsWith("/")) {
        pathname = pathname.slice(0, -1);
      }

      return pathname;
    })
    // Drop empty entries defensively.
    .filter(Boolean);

  // De-dupe while preserving order.
  return [...new Set(routes)];
}

// Origin the Cloudflare-hosted prerender will be served from in production.
// Used for canonical link tags injected during prerender.
const CANONICAL_ORIGIN = "https://photobrief.ai";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

function startStaticServer(root, port) {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        const url = new URL(req.url, `http://localhost:${port}`);
        let filePath = join(root, decodeURIComponent(url.pathname));
        if (!extname(filePath)) {
          // SPA fallback — every non-asset path returns index.html.
          filePath = join(root, "index.html");
        }
        if (!existsSync(filePath)) {
          res.statusCode = 404;
          res.end("not found");
          return;
        }
        const body = await readFile(filePath);
        res.setHeader("content-type", MIME[extname(filePath)] || "application/octet-stream");
        res.end(body);
      } catch (err) {
        res.statusCode = 500;
        res.end(String(err));
      }
    });
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

/**
 * Inject canonical link + per-route title/meta into the rendered HTML.
 * The page's <SEOHead> already sets these via react-helmet-style mutations
 * on mount; this is a belt-and-suspenders pass that runs at build time so
 * the values are present even before any JS executes.
 */
function injectSeoTags(html, route) {
  const canonical = `${CANONICAL_ORIGIN}${route === "/" ? "" : route}`;
  const canonicalTag = `<link rel="canonical" href="${canonical}" />`;
  // Avoid duplicate canonical if Helmet already wrote one.
  if (html.includes('rel="canonical"')) return html;
  return html.replace("</head>", `  ${canonicalTag}\n  </head>`);
}

async function main() {
  if (!existsSync(DIST_DIR)) {
    console.error("dist/ not found — run `vite build` first.");
    process.exit(1);
  }

  const port = 4173;
  const server = await startStaticServer(DIST_DIR, port);
  console.log(`[prerender] serving dist/ on http://127.0.0.1:${port}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const routes = await loadRoutesFromSitemap();
  console.log(`[prerender] routes from sitemap: ${routes.join(", ")}`);

  try {
    for (const route of routes) {
      const url = `http://127.0.0.1:${port}${route}`;
      console.log(`[prerender] rendering ${route}`);
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });

      // Speed up: block third-party trackers during prerender. They'll still
      // load at runtime in the user's browser; we just don't want them
      // running headless during the build.
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        const u = req.url();
        if (
          u.includes("googletagmanager.com") ||
          u.includes("google-analytics.com") ||
          u.includes("cloudflareinsights.com") ||
          u.includes("supabase.co")
        ) {
          req.abort();
        } else {
          req.continue();
        }
      });

      await page.goto(url, { waitUntil: "networkidle0", timeout: 30_000 });
      // Wait for React to mount + the hero/header to be in the DOM.
      await page.waitForSelector("#root > div", { timeout: 10_000 });

      let html = await page.content();
      html = injectSeoTags(html, route);

      const outDir =
        route === "/" ? DIST_DIR : join(DIST_DIR, route.replace(/^\//, ""));
      await mkdir(outDir, { recursive: true });
      await writeFile(join(outDir, "index.html"), html, "utf8");
      console.log(`[prerender]   wrote ${join(outDir, "index.html")}`);
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log("[prerender] done.");
}

main().catch((err) => {
  console.error("[prerender] failed:", err);
  process.exit(1);
});
