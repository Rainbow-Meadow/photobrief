## Goal

Use your `CLOUDFLARE_API_TOKEN` to scan your entire Cloudflare zone (`photobrief.ai`) and produce a written audit report identifying settings, rules, and configurations that should be adjusted for performance, security, and SEO — with specific focus on issues already showing up in your Lighthouse audit (Cloudflare-injected scripts hurting LCP, render-blocking, and cache TTLs).

This is a **one-off analysis task**, not a feature to build into the app. I'll run it as a script and deliver a markdown report you can act on.

## What gets scanned

A read-only sweep of every Cloudflare API surface that affects your site:

| Area | API endpoints | What I'm looking for |
|---|---|---|
| **Zone settings** | `/zones/{id}/settings` | Brotli, HTTP/3, Early Hints, 0-RTT, minify, Rocket Loader, Auto Minify, Polish, Mirage, Email Obfuscation, Hotlink Protection, Server-side Excludes, IPv6, WebSockets, Always Use HTTPS, Auto HTTPS Rewrites, HSTS, min TLS version, opportunistic encryption, TLS 1.3, certificate transparency, ciphers |
| **Speed / Optimization** | `/zones/{id}/speed_api/...`, `/zones/{id}/argo`, `/zones/{id}/flock` | Speed Brain (`~flock.js`), Argo Smart Routing, Tiered Cache, image optimization (Polish/Mirage), Early Hints |
| **Caching** | `/zones/{id}/settings/cache_level`, `/zones/{id}/settings/browser_cache_ttl`, cache rules | Browser cache TTL (your audit flags 257 KiB savings here), Edge cache TTL, Cache Reserve, Always Online, Development Mode |
| **Page Rules + Rulesets** | `/zones/{id}/pagerules`, `/zones/{id}/rulesets` | All Page Rules, Transform Rules, Cache Rules, Configuration Rules, Origin Rules, Redirect Rules, Compression Rules — flag conflicts, deprecated patterns, missing cache rules |
| **WAF / Security** | `/zones/{id}/rulesets` (http_request_firewall_*), `/zones/{id}/firewall/rules`, `/zones/{id}/settings/security_level`, bot management, rate limiting | Managed rulesets enabled?, custom WAF rules, bot fight mode, security level, challenge passage, rate limiting rules, IP access rules |
| **SSL/TLS** | `/zones/{id}/ssl/...`, `/zones/{id}/settings/ssl` | SSL mode (Full Strict required), TLS min version (should be 1.2+), HSTS config, certificate status, edge cert vs custom |
| **DNS** | `/zones/{id}/dns_records` | Records list, proxied vs DNS-only flags, DNSSEC status, CAA records, SPF/DKIM/DMARC TXT records for email deliverability |
| **Scrape Shield** | settings | Email Obfuscation (injects `email-decode.min.js` flagged in your audit), Server-side Excludes, Hotlink Protection |
| **Network** | settings | HTTP/2, HTTP/3 (QUIC), 0-RTT, IPv6, WebSockets, gRPC, pseudo IPv4 |
| **Workers / Pages / R2** | `/zones/{id}/workers/routes`, `/accounts/{id}/workers/scripts`, pages projects | List any Workers, routes, Pages projects |
| **Analytics / Insights** | `/zones/{id}/settings/web_analytics` | Web Analytics beacon (injects `beacon.min.js` flagged in your audit) |
| **Bot Management** | `/zones/{id}/bot_management` | Super Bot Fight Mode tier and config |

## Deliverable

A single markdown report saved to `/mnt/documents/cloudflare-audit.md` with:

1. **Executive summary** — top 5 issues ranked by impact
2. **Performance findings** — directly tied to your Lighthouse failures (e.g., "Disable Email Obfuscation to remove the 1,447-byte render-blocking `email-decode.min.js`", "Increase browser cache TTL — currently 2min on Stripe, 25min on `~flock.js`", "Enable Brotli/HTTP3/Early Hints if off")
3. **Security findings** — SSL mode, HSTS, TLS version, WAF coverage gaps, missing rate limits on sensitive paths
4. **SEO/DNS findings** — DNSSEC, SPF/DKIM/DMARC, CAA, redirect rules
5. **Each finding includes**: current value → recommended value → why → exact dashboard path to change it (e.g., "Speed → Optimization → Content Optimization")
6. **Raw JSON dumps** of each section appended at the end for reference

## How it runs

A standalone Deno/Node script (in `/tmp`, not added to your codebase) that:

1. Calls `GET /user/tokens/verify` to confirm token + list permissions
2. Calls `GET /zones?name=photobrief.ai` to get zone ID + account ID
3. Fans out ~20 read-only GET requests in parallel to the endpoints above
4. Runs each response through a rule-based analyzer
5. Cross-references findings against your known Lighthouse issues
6. Writes the markdown report

**Read-only.** Nothing is changed in Cloudflare. You decide which recommendations to apply.

## Caveat about token scope

Your token may not have permission for every API surface (e.g., account-level Workers, Bot Management on lower plans). Any 403/404 responses will be listed in an "inaccessible endpoints" section of the report rather than failing the whole scan. If a critical area is blocked, I'll tell you which permission to add to the token.

## Out of scope

- Changing any Cloudflare settings (read-only audit only)
- Anything requiring account-level access if your token is zone-scoped
- Cloudflare Access / Zero Trust / Magic Transit / Magic WAN (not relevant to this site)
