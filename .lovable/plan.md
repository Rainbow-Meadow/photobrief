# Wire up PhotoBrief pricing/billing — schema, gating, visuals

Source of truth pulled from your Drive: `01_Strategy/02_pricing_and_plan_limits.md`, `08_Config_Blueprints/planLimits.example.ts`, `10_Go_To_Market/03_founding_pro_offer.md`. The current `src/config/planLimits.ts` doesn't match the spec — wrong tier set, wrong prices, wrong quotas. Everything below realigns to the spec.

## The five tiers (from the spec)

| Tier | Monthly | Annual (~20% off) | Requests/mo | Users | Headline unlock |
|---|---:|---:|---:|---:|---|
| Free | $0 | $0 | 3 | 1 | Try the workflow |
| Starter | $19 | $182/yr ($15.20/mo) | 25 | 1 | Branded request links |
| Pro | $49 | $470/yr ($39.20/mo) | 150 | 3 | Custom guides + AI automation |
| Team | $99 | $950/yr ($79.20/mo) | 500 | 10 | Team workflows |
| Business | $199 | $1,910/yr ($159.20/mo) | 1,500+ | 25+ | White-label + integrations |

**Founding Pro**: $29/mo for life, first 50 paying businesses. Locked Pro entitlements. Tracked as a coupon-driven badge on the Pro card and in billing.

## What gets built

### 1. Spec-aligned plan config
- **Replace** `src/config/planLimits.ts`:
  - `Plan` becomes `free | starter | pro | team | business` (drop `enterprise`).
  - New quotas: `requestsPerMonth`, `users`, `historyMonths`, `aiChecksPerMonth`, `savedTemplates`.
  - Capability keys aligned to spec: `branded_links`, `custom_guides`, `ai_guide_generator`, `advanced_ai_checks`, `missing_shot_followup`, `reminders`, `internal_notes`, `assignments`, `pdf_export` (`'basic' | 'branded' | 'full_branding' | 'custom'`), `saved_templates`, `bulk_actions`, `team_inbox`, `multi_workspace`, `custom_domain`, `white_label`, `api_webhooks`, `priority_support`.
  - Add `priceMonthly`, `priceAnnualMonthly`, `stripeMonthlyPriceId?`, `stripeAnnualPriceId?` (filled in after Stripe setup).
- **Update** `src/types/photobrief.ts` `Plan` union to match.
- **Update** every existing call-site that uses removed feature keys (`white_label` already exists, `team_members` → `team_inbox`, `branding` → `branded_links`, etc.). Files affected: `RequestBuilderModeTabs.tsx`, `GuideLibraryPage.tsx`, `CreateRequestPage.tsx`, `TeamSettingsPage.tsx`, `SubmissionReviewPage.tsx`, `InternalNotesPanel.tsx`, `BrandSettingsPage.tsx`, `BillingSettingsPage.tsx`.

### 2. Database — extend `subscriptions` + add audit field on workspaces
The DB already has `subscriptions` and `usage_events`. Migration adds:

- Extend `plan_tier` enum: add `'starter'` and `'team'`. (DB already has `free`, `pro`, `business`, `enterprise` — keep `enterprise` mapped to `business` in app for safety until rows are migrated; UI will only show the five spec tiers.)
- Add columns to `subscriptions`: `billing_interval` (`'monthly' | 'annual'`), `current_period_start`, `current_period_end`, `cancel_at_period_end bool`, `is_founding_pro bool`, `trial_ends_at timestamptz`.
- Add `usage_events.metadata jsonb` so we can record `{guide_id, ai_check_type, ...}`.
- Add a SQL function `current_period_usage(_workspace_id uuid, _event_type text)` returning the count for the current billing period (defaults to calendar month when no period set). Used by the usage hook.
- Add a SQL function `enforce_request_limit()` trigger on `photo_brief_requests` insert that rejects when the workspace is at its monthly cap (raises so the client can show the upgrade prompt).
- Backfill existing free rows with `billing_interval='monthly'`, period = calendar month.
- Backfill `business_workspaces.plan_tier` is fine since the column already exists; new signups stay `free` (handled by `handle_new_user`).
- New table `founding_pro_claims (workspace_id pk, claimed_at)` so we can cap at 50.

All RLS policies follow the existing workspace-member pattern.

### 3. Real workspace + plan wiring
- **Replace** `src/services/workspaceService.ts` mock with a real implementation:
  - `current()` keeps a synchronous getter for compatibility, backed by `useCurrentWorkspace()` cache.
  - New `useCurrentWorkspace()` hook: loads `business_workspaces` + `subscriptions` + `brand_profiles` for the signed-in user via `workspace_members`.
  - Caches via React Query.
- **Update** `usePlan` to read from the real subscription row (fallback `free`).
- New `useUsage()` hook: pulls `current_period_usage` for `request_created` and `ai_check_run` and exposes `{ used, cap, pct, isOver, isNear }` per quota.

### 4. Usage event writes
Centralize in a small `usageService.ts` so call-sites stay clean:

```ts
usageService.record('request_created', { request_id })
usageService.record('ai_check_run', { check_type })
usageService.record('reminder_sent', { request_id })
```

Wire it from:
- `requestService.create(...)` → `request_created`.
- `aiService.analyzeCapturedMedia` → `ai_check_run` per check.
- `notificationService` for `reminder_sent`.

### 5. Gating + upgrade prompts
- New `useFeatureGate(feature)` hook returns `{ allowed, requiredPlan, ctaProps }`. Wraps `usePlan().can` plus the usage hook for `request_limit`.
- New `<FeatureLock feature=... fallback?>` component: renders children when allowed, else renders `<UpgradePromptCard feature=...>`.
- New `<UsageMeter quotaKey=... />` component: shared bar used on dashboard + billing.
- Refresh `<UpgradePromptCard>`:
  - Visual upgrade — keep gradient surface but use `bg-gradient-brand`, add the navy two-tone accent, and surface the *required plan name* as a chip ("Upgrade to Pro").
  - New `compact` variant for in-table CTAs.
  - When `feature='request_limit'` and `usage.pct >= 100`, button reads "You're out of requests — upgrade".
- Trigger near-cap toasts at 80% and 100% via `notificationService` (one per period, stored in `localStorage` keyed by workspace+period).

### 6. Stripe (Lovable built-in) setup
- Run `recommend_payment_provider` to confirm fit, then call `enable_stripe_payments`.
- After enable, create products via `batch_create_product`:
  - Starter, Pro, Team, Business — each with `monthly` and `annual` prices.
  - Tax handling: **automatic_tax (option 2)** by default — calculation only, since PhotoBrief sells globally and the seller likely wants flexibility. Each product gets the Stripe tax code `txcd_10103001` (Software as a Service — pre-written/non-customized).
- Founding Pro = a 100%-discount-stacking coupon `FOUNDINGPRO` applied to the Pro monthly price, capped at 50 redemptions, locked-in price by storing $29 as `discount_amount`. (Stripe doesn't natively cap to 50 globally; we enforce in `founding_pro_claims` before creating the checkout session.)
- New `supabase/functions/create-checkout/index.ts` (verify_jwt = true): takes `{ priceId, interval, foundingPro?: boolean }`, looks up the user's workspace, calls Stripe, returns hosted checkout URL.
- New `supabase/functions/customer-portal/index.ts` (verify_jwt = true): returns Stripe billing portal URL.
- New `supabase/functions/stripe-webhook/index.ts` (verify_jwt = false, signature verified): on `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` → upserts the workspace's `subscriptions` row (plan_tier, status, period dates, cancel_at_period_end, is_founding_pro).

### 7. The marketing visuals (this is the design ask)

#### A — Pricing cards: a new `<PricingCardGrid>` shared component
- Used on `/pricing`, on `/landing`, and on `/settings/billing`.
- Five cards in a single row on desktop, 2-up on tablet, stacked on mobile.
- **Card anatomy**:
  ```text
  ┌────────────────────────┐
  │  Plan name             │  Optional ribbon: "Most popular" (Pro)
  │  Tagline (1 line)      │            or "Founding offer · 27 left" (Pro variant)
  │                        │
  │  $49 /mo               │  Strikethrough $49 → $29 when foundingPro variant
  │  $39.20/mo billed yr   │  Toggle-driven secondary line
  │                        │
  │  ✓ 150 requests/month  │  Top-3 quota-style bullets in primary navy
  │  ✓ 3 users             │
  │  ✓ Custom guides + AI  │
  │  ───                   │
  │  Everything in Starter │  Inherited bullet
  │  + Internal notes      │  Plus-bullets specific to this tier
  │  + Reminders           │
  │                        │
  │ [Choose Pro →]         │  Filled for highlight, outline for others
  └────────────────────────┘
  ```
- Pro card gets:
  - `ring-2 ring-primary/40`, soft `shadow-glow`, scale 1.03 on lg+
  - "Most popular" ribbon (white text on primary).
  - Founding Pro callout *underneath* the price block — small chip "Founding deal: $29/mo for life · {N}/50 left" linking to the founding offer details. Hidden once 50/50 claimed.
- Free card gets a muted card style (no shadow, dashed border).
- Business card gets the navy `bg-gradient-brand` treatment with white text — mirrors the hero on the landing page so the highest tier visually anchors the row.
- Monthly/Annual toggle pill above the grid (`Tabs` component). Annual prices show "Save 20%" badge. Toggle state lifted via prop so the same component works on landing/pricing/billing.

#### B — Landing page integration
- Insert a new "Pricing" section between the value-prop band and the CTA band on `src/pages/Landing.tsx`.
- Eyebrow + headline pair, the toggle, then `<PricingCardGrid variant="marketing">`.
- Anchor `id="pricing"` and add a "Pricing" link in `MarketingLayout` header.

#### C — Dedicated `/pricing` page
- Rewrite `src/pages/Pricing.tsx`:
  - Page-wide hero band with `bg-gradient-brand`, headline, monthly/annual toggle.
  - `<PricingCardGrid variant="marketing">`.
  - Founding Pro spotlight section: full-width card with the founding offer copy, urgency counter, and "Claim founding Pro" button (signed-out: → /auth?mode=signup&plan=pro&founding=1; signed-in: → checkout w/ coupon).
  - Comparison table (already exists logic-wise on billing) re-skinned for marketing — sticky plan headers, alternating row tints.
  - FAQ accordion (5–7 items pulled from spec wording).

#### D — Billing page (`/settings/billing`)
- Top: "Current plan" hero card with plan name, status pill, renewal date, billing interval, "Manage billing" (→ Stripe portal) and "Change plan" buttons.
- Usage section: `<UsageMeter>` per quota (requests, AI checks, users) with cap, %, and a "near cap" warning banner.
- `<PricingCardGrid variant="billing">` — same component, "Current" badge on the active tier, plan downgrades go to portal, upgrades go to checkout.
- Invoices list: pulled from Stripe via the customer portal (link out, no inline list yet).

#### E — Upgrade prompts in-app
- Use the refreshed `<UpgradePromptCard>` on:
  - Create Request page when `request_limit` is hit (already a guard, swap to new card).
  - Guide library when `custom_guides` blocked.
  - Brand settings when `branded_links` blocked.
  - Internal Notes panel when `internal_notes` blocked.
  - Team Settings when `team_inbox` blocked.
  - Submission Review "AI guide generator" when blocked.
- Each prompt is named-feature aware so the chip says "Upgrade to Pro / Team / Business" automatically.

## Order of execution

1. Run `recommend_payment_provider` → confirm Stripe fit.
2. DB migration (new enum values, subscription columns, founding_pro_claims, RPC + trigger).
3. Rewrite `planLimits.ts` + `Plan` type + update all gate call-sites.
4. Real `workspaceService` + `useCurrentWorkspace` + updated `usePlan` + `useUsage`.
5. `usageService` + wire write points.
6. Build `PricingCardGrid`, `UsageMeter`, `FeatureLock`; refresh `UpgradePromptCard`.
7. Rewrite `Pricing.tsx`, update `Landing.tsx`, update `BillingSettingsPage.tsx`.
8. `enable_stripe_payments` (requires Pro plan — flag if not).
9. Create products + coupon + Edge Functions (`create-checkout`, `customer-portal`, `stripe-webhook`).
10. Smoke test the test-mode checkout on Pro monthly + Founding Pro.

## Files

**New**
- `src/components/pricing/PricingCardGrid.tsx`
- `src/components/pricing/PricingCard.tsx`
- `src/components/pricing/BillingIntervalToggle.tsx`
- `src/components/pricing/FoundingProBadge.tsx`
- `src/components/shared/UsageMeter.tsx`
- `src/components/shared/FeatureLock.tsx`
- `src/hooks/useCurrentWorkspace.tsx`
- `src/hooks/useUsage.ts`
- `src/hooks/useFeatureGate.ts`
- `src/services/usageService.ts`
- `src/services/billingService.ts` (calls create-checkout / customer-portal)
- `supabase/functions/create-checkout/index.ts`
- `supabase/functions/customer-portal/index.ts`
- `supabase/functions/stripe-webhook/index.ts`

**Modified**
- `src/types/photobrief.ts`
- `src/config/planLimits.ts`
- `src/services/workspaceService.ts`
- `src/hooks/usePlan.ts`
- `src/components/shared/UpgradePromptCard.tsx`
- `src/pages/Pricing.tsx`
- `src/pages/Landing.tsx`
- `src/components/layout/MarketingLayout.tsx` (add Pricing nav link)
- `src/features/billing/pages/BillingSettingsPage.tsx`
- The 8 gate call-sites listed above
- DB migration

## Out of scope
- Multi-workspace switcher UI (Business plan unlocks it; the data model already supports it).
- Per-seat billing math (Team/Business include a fixed seat count; over-cap is just a soft block on member invites).
- Coupon engine beyond Founding Pro.
- Inline invoice list (link to Stripe portal instead).

## Key design decisions to flag
- **Tax**: Stripe automatic tax (calculation only). User registers and remits per jurisdiction. Switching to "managed_payments" later requires Stripe US/EU residency.
- **Founding cap**: enforced server-side in `founding_pro_claims` before checkout creation — Stripe coupons alone can't cap globally.
- **Annual discount**: hard-coded 20% on the public side; actual Stripe annual prices are stored on the plan config so the cards never show a number Stripe doesn't have.
