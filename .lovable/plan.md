## Phase 2: Per-tier live audit + marketing screenshots

Walk through each seeded account in the live preview (signed in as the owner), exercise the workflows that define that tier, capture polished screenshots along the way, and produce a single audit report mapping marketing claims → actual behavior.

### Accounts (already seeded)

| Tier | Workspace | Login | Data on file |
|---|---|---|---|
| Free | Hartley Handyman | seed.free@photobrief.test | 2 requests, 1 submission, 3 media |
| Starter | Bright Spark Plumbing | seed.starter@photobrief.test | 8 requests, 5 submissions, 15 media |
| Pro | Northwind HVAC | seed.pro@photobrief.test | 3 guides, 20 reqs, 12 subs, 5 templates, 6 notes, 3 seats |
| Team | Cascade Junk Removal | seed.team@photobrief.test | 4 guides, 35 reqs, 22 subs, 7 templates, 22 notes, 6 seats |
| Business | Apex Roofing Group | seed.business@photobrief.test | 3 guides, 50 reqs, 32 subs, 8 templates, 32 notes, 12 seats, 1 API key, 2 webhooks |

Common password: `Seed!{Tier}2026` (recorded in `/mnt/documents/seed-users.json`; will also persist to `mem://seed-users`).

### What gets verified per tier

For every tier I walk these surfaces in order, recording pass/fail + a screenshot for each:

```text
1. Auth + landing      → confirm tier resolves correctly in usePlan()
2. Dashboard           → KPIs, recent activity, populated state
3. Requests list       → filters, statuses, due dates render
4. Single request      → recipient view + submission detail
5. Submission detail   → media grid, AI checks, extracted details
6. Templates page      → gated for free/starter, populated for pro+
7. Internal notes      → gated for free/starter, populated for pro+
8. Custom guides       → gated for free/starter, populated for pro+
9. Team / seats        → seat cap surfaces correctly per plan
10. API keys + webhooks → business-only; verify lock UI elsewhere
11. Billing / plan     → plan badge, usage meter, upgrade CTAs
```

Plan-gate checks specifically attempt the gated action where it's locked (e.g., "Save template" on starter) to confirm we surface a clean upgrade prompt instead of a 500.

### Marketing-quality screenshots

For each tier, I capture 3 hero shots + 2 supporting shots, run them through the product-shot skill (macOS frame + mesh-gradient background) so they're drop-in for landing pages:

| Tier | Preset | Hero shots |
|---|---|---|
| Free | `fog` | Dashboard, single request, upgrade CTA |
| Starter | `arctic` | Requests list, recipient capture flow, billing |
| Pro | `aurora` | Custom guides editor, templates library, AI checks on a submission |
| Team | `peach` | Team/seats page, multi-assignee request, notes thread |
| Business | `midnight` | API keys page, webhooks, branded recipient view (custom domain), Apex submission gallery |

Outputs land in `/mnt/documents/marketing/<tier>/<shot>.png` plus raw screenshots at 1366×768 in `/mnt/documents/marketing/<tier>/raw/`.

### Deliverables

1. `/mnt/documents/marketing/` — folder per tier, raw + framed PNGs
2. `/mnt/documents/tier-audit.md` — verification matrix (claim, expected, actual, screenshot link, pass/fail)
3. `mem://seed-users` — credentials + workspace IDs persisted (currently only in `seed-users.json`)
4. In-chat summary highlighting any failed gates, broken UIs, or marketing claims not actually delivered, with concrete fixes proposed

### Technical notes

- Browser session shares the preview's Supabase session, so I sign in as each owner via the Auth page (no admin impersonation needed).
- Between tiers I sign out, then sign in as the next owner to reset session/`useCurrentWorkspace`.
- Viewport: 1366×768 for desktop product shots; one extra mobile shot per tier at 390×844 for the recipient capture flow (which is mobile-first).
- I will NOT trigger destructive actions (delete request, revoke API key, remove member, cancel subscription). If a "destructive but reversible" action is needed to complete a flow (e.g., create then delete a draft request) I'll call it out before doing it.
- If the browser tool is unavailable I'll fall back to a code+DB-only audit and flag which tiers couldn't be visually verified.

### Approval

Approve and I'll switch to default mode and run the audit tier-by-tier (Free → Business), posting a per-tier mini-report with screenshots before moving on, then deliver the consolidated matrix at the end.