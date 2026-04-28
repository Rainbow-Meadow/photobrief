
# photobrief.ai — Cloudflare Optimization Plan

Token now has full **Zone: Read/Edit** access. I audited the live config for `photobrief.ai` (zone `6d712e4f9a56f8531b3cfe39c65af5d7`, Cloudflare Free plan, status: active). Below is what's currently set, what's wrong, and exactly what I'll change.

## Current state vs. issues found

| Setting | Current | Issue |
|---|---|---|
| SSL mode | `full` | Should be `strict` — origin (lovable.app) has a valid cert, no reason to allow unvalidated. |
| Always Use HTTPS | **off** | HTTP requests aren't being upgraded at the edge. (HSTS is currently coming from the origin only.) |
| Min TLS Version | **1.0** | Insecure / fails most compliance scans. Should be `1.2`. |
| TLS 1.3 | on | Good. |
| 0-RTT | off | Free perf win on TLS 1.3. |
| Early Hints | off | Free perf win (103 hints to preload critical assets). |
| Automatic HTTPS Rewrites | on | Good. |
| Brotli / HTTP/3 / WebSockets / IPv6 | on | Good. |
| HSTS | **disabled** at edge | Origin sends it, but edge HSTS is the durable place. |
| Browser Cache TTL | `0` (Respect Existing Headers) | Correct for an SPA — keep. |
| Cache Level | aggressive | Good. |
| Security Level | medium | Fine for now. |
| Universal SSL cert | active (`*.photobrief.ai`, Let's Encrypt) | Healthy. |

## DNS cleanup

Current records that look stale / worth flagging (won't change without your OK):

- `TXT photobrief.ai` → `hubspot-developer-verification=...` — keep only if HubSpot is still in use.
- `NS notify.photobrief.ai` → `ns3/ns4.lovable.cloud` (two records, mismatched TTLs 1 vs 3600) — normalize TTLs to `3600` for consistency. Subdomain is delegated to Lovable for transactional email; keep it.
- Apex + www CNAMEs → `photobrief.lovable.app`, proxied — correct.
- `_lovable-email`, `_dmarc`, Google site verification — keep.

## Changes I'll make (via Cloudflare API)

1. **SSL mode** → `strict` (Full Strict)
2. **Always Use HTTPS** → `on`
3. **Min TLS Version** → `1.2`
4. **0-RTT** → `on`
5. **Early Hints** → `on`
6. **HSTS** at edge → enabled, `max-age=31536000`, `includeSubDomains=true`, `preload=false`, `nosniff=true`
   - Preload kept off initially because subdomains (e.g. `notify.`) inherit it; we can flip to `true` and submit to hstspreload.org once you confirm.
7. **Normalize the duplicate `notify` NS TTL** to 3600.
8. **Purge cache** once at the end so changes take immediate effect.

## Verification I'll run after

- `curl -I https://photobrief.ai` → expect 200, `strict-transport-security` header present.
- `curl -I http://photobrief.ai` → expect 301 to https.
- Re-read each setting via API to confirm the new value.
- Confirm `www` still 302-redirects to apex (already working).

## Things I'm NOT touching

- The `cname.photobrief.app` reference in `CustomDomainSection.tsx` (that's a separate product feature, not this zone).
- Bot Management / WAF custom rulesets (Free plan limits these; can add a basic rate-limit ruleset later if you want).
- Page Rules (returned 400 — likely deprecated on this zone in favor of Rulesets; not needed for these changes).

## Optional follow-ups (ask if you want them)

- Add a Cache Rule to bypass cache for `/api/*` and `/auth/*` paths.
- Add a Redirect Rule for any legacy paths.
- Submit to HSTS preload list once you've verified all subdomains are HTTPS-only.
- Set up `links.photobrief.ai` for the in-app Custom Domain feature.

Approve and I'll apply all 8 changes in one go and report back with verification output.
