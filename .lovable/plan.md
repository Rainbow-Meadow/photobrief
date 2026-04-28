# GA4 Event Tracking

The GA4 base tag (`G-GJCZPQ3WJ9`) is already in `index.html`. SPA route changes don't auto-fire pageviews, so we need a router listener plus a thin event helper used at key surfaces.

## What gets tracked

**Automatic**
- `page_view` on every React Router navigation (path + title)

**Key user events**
- `cta_click` — marketing CTAs (hero "Get started", pricing plan buttons, final CTA card, founding banner)
- `signup_started` / `signup_completed` — Auth page
- `guide_viewed` — opening a guide (Library card click + GuideDetailPage mount)
- `guide_created` — successful guide save in Builder
- `request_created` — successful request creation
- `request_sent` — request link sent to recipient
- `step_completed` — recipient finishes a capture step (PublicRecipientPage)
- `submission_completed` — recipient submits the brief
- `submission_reviewed` — internal review action
- `plan_upgrade_clicked` — UpgradePrompt / PricingCardGrid CTAs
- `checkout_started` — Stripe checkout opened

All events include relevant low-cardinality params (e.g. `guide_id`, `plan`, `step_index`) — never PII.

## Implementation

### 1. New file: `src/lib/analytics.ts`
- `GA_MEASUREMENT_ID = "G-GJCZPQ3WJ9"`
- Type-safe wrappers around `window.gtag`:
  - `trackPageView(path, title?)` → `gtag('event','page_view',{page_path,page_title,page_location})`
  - `trackEvent(name, params?)` → `gtag('event', name, params)`
- Safe no-ops if `gtag` is undefined (SSR / blocked).
- `declare global { interface Window { gtag?: (...args: any[]) => void; dataLayer?: any[] } }`

### 2. New component: `src/components/analytics/RouteTracker.tsx`
- Uses `useLocation()`; on pathname/search change, calls `trackPageView` and disables the auto `page_view` from the base config to avoid duplicates.

### 3. Update `index.html`
- Change `gtag('config', 'G-GJCZPQ3WJ9')` to `gtag('config', 'G-GJCZPQ3WJ9', { send_page_view: false })` so the SPA tracker is the single source of truth.

### 4. Mount tracker in `src/App.tsx`
- Add `<RouteTracker />` inside `<BrowserRouter>`.

### 5. Wire `trackEvent` calls at these surfaces
- `src/pages/Landing.tsx` + marketing CTA components → `cta_click` with `{location: 'hero'|'final'|'founding_banner'}`
- `src/pages/Auth.tsx` → `signup_started`, `signup_completed`, `login_completed`
- `src/features/guides/pages/GuideLibraryPage.tsx` (card open) and `GuideDetailPage.tsx` (mount) → `guide_viewed`
- `src/features/guides/pages/GuideBuilderPage.tsx` (save success) → `guide_created`
- `src/features/requests/pages/CreateRequestPage.tsx` (create success) → `request_created`; send action → `request_sent`
- `src/features/capture/pages/PublicRecipientPage.tsx` → `step_completed` per step, `submission_completed` at end
- `src/features/submissions/pages/SubmissionReviewPage.tsx` → `submission_reviewed`
- `src/components/pricing/PricingCardGrid.tsx` + `UpgradePrompt.tsx` → `plan_upgrade_clicked` with `{plan, interval}`
- `src/components/billing/StripeEmbeddedCheckout.tsx` mount → `checkout_started`

## Notes
- No PII is sent (no emails, names, raw tokens). IDs only where useful.
- Public recipient route `/r/:token` will send `page_path` as `/r/:token` (token replaced) to avoid leaking tokens into GA.
- All tracking is client-side; no edge function needed. The `GOOGLE_ANALYTICS_API_KEY` secret you added isn't required for sending events — it would only be used later if we want to *read* analytics server-side.
