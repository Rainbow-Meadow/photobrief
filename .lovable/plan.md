
# PhotoBrief — Beta-Launch Audit & Prioritized Action Plan

This is a read-only audit. No files were changed.

---

## A. Executive Summary

**Current readiness: 7 / 10**

PhotoBrief is genuinely close to beta-ready. The product loop (request → recipient capture → AI checks → review brief) is wired end-to-end with sound architecture: chat-first capture, plan-gated features, retry-aware Supabase reads, structured AI service, branded transactional emails, RLS-backed token client for public capture, and a thoughtful invite-only / waitlist split. Visual identity is cohesive (Apple-style glass, ambient sky, brand color #0A6BFF, BrandMark, MetricCard, ScoreRing, StatusPill, ThemeToggle).

What's holding it back from a confident 9/10:

1. **Hero clarity.** The hero is beautiful but abstract — a 5-second visitor sees "guided capture / brief" but not *what business problem this solves* or *who it's for*. Conversion will leak here.
2. **Trust signals are placeholders.** `TrustLogosStrip` and `TestimonialsRow` look like real social proof but for a true beta they should either be removed or honestly framed ("Built with feedback from these beta partners").
3. **Submission Review page is 934 lines** — the "money screen" is functional but architecturally the most fragile, hardest-to-iterate surface in the app.
4. **Recipient flow has no offline / slow-network resilience** — uploads happen serially via `uploadCapture`; if a customer loses signal mid-flow, there's no resume.
5. **`/auth` page exposes a demo account on a public, invite-only beta marketing site** — this contradicts "invite-only" positioning and looks unprofessional.
6. **Pricing CTAs link to `mailto:hello@photobrief.app`** (a different domain than `photobrief.ai`), and `/app/settings/billing` (the in-app route is `/settings/billing`) — broken-link risk.
7. **Submission Review readiness/value density** is high but the "why this is worth $49/mo" payoff isn't framed at the top of the screen.

---

## B. Top 10 Improvements, Ranked

### 1. Sharpen the hero in 5 seconds  *(Conversion · Quick win)*
- **Why:** "Send a link. Get a complete brief." is poetic but vague. A roofer landing here doesn't immediately know this replaces "texting customers for photos." Add a concrete subhead + a one-line "for whom" + a real business outcome.
- **Impact:** Likely the single biggest landing → waitlist conversion lever.
- **Effort:** Small · **Risk:** Low · **Deps:** none
- **Files:** `src/pages/Landing.tsx` (hero block), `src/components/marketing/HeroGlassStory.tsx`
- **Prompt:** *"Rewrite the landing hero to communicate the value in 5 seconds: tagline, one-sentence subhead naming the buyer (home-services, claims, property mgmt) and outcome (no more chasing customers for photos), a `Built for roofing, HVAC, plumbing, junk removal, claims` micro-line under the CTAs, and tighten the CTA copy. Keep the existing glass story panel."*

### 2. Replace placeholder social proof with honest beta framing  *(Trust · Quick win)*
- **Why:** Fake-looking logos and testimonials destroy trust faster than no proof at all. You're invite-only beta — own it.
- **Impact:** Higher trust, lower bounce; protects brand on launch.
- **Effort:** Small · **Risk:** Low · **Deps:** none
- **Files:** `src/components/marketing/TrustLogosStrip.tsx`, `src/components/marketing/TestimonialsRow.tsx`, `src/pages/Landing.tsx`
- **Prompt:** *"Audit `TrustLogosStrip` and `TestimonialsRow`. If logos/quotes aren't real beta partners, replace the section with an honest 'In private beta with N home-services teams' band, founder photo + one-line note, and a 'See live demo' link. Keep the visual rhythm of the page."*

### 3. Fix broken pricing/admin links and remove demo account from public auth  *(Stability + Trust · Quick win)*
- **Why:** `PricingCardGrid.tsx` uses `mailto:hello@photobrief.app` (wrong TLD) and `/app/settings/billing` (route is `/settings/billing`). `/auth` shows a hard-coded `demo@photobrief.app / DemoPass1234!` block to every visitor — embarrassing for an invite-only beta.
- **Impact:** Removes credibility-killing bugs; tightens beta posture.
- **Effort:** Small · **Risk:** Low · **Deps:** none
- **Files:** `src/components/pricing/PricingCardGrid.tsx`, `src/pages/Auth.tsx`, `src/config/access.ts`
- **Prompt:** *"Fix three things: (1) in `PricingCardGrid.tsx` change the Business mailto to `hello@photobrief.ai` and the in-app billing path to `/settings/billing`; (2) in `Auth.tsx` remove the public demo-account credentials block — only show a 'Try the demo' button that calls `ensure-demo-user` without exposing the password; (3) verify all CTAs in `signupCtaTarget` / `planCtaTarget` resolve to real routes."*

### 4. Reframe the Submission Review page as the "money screen"  *(Pro upgrade driver · Medium win)*
- **Why:** Today the page opens with status/PageHeader, then dives into shots. The AI summary, readiness score, extracted details, and "next action" are buried. A small business should see *value* in the first viewport.
- **Impact:** Strongest single driver of perceived Pro value; improves Free→Pro upgrades.
- **Effort:** Medium · **Risk:** Medium (large file) · **Deps:** none
- **Files:** `src/features/submissions/pages/SubmissionReviewPage.tsx`, `src/components/shared/ScoreRing.tsx`, `src/components/shared/MetricCard.tsx`
- **Prompt:** *"Refactor the top of `SubmissionReviewPage.tsx` into a 'BriefHeader' component: large readiness ring, AI summary in a glass card, extracted-details chips, suggested next action as a primary button, copy-summary + PDF buttons inline. Push the per-shot grid below. Don't change data flow or RLS — only reorder + extract a presentational component."*

### 5. Make the recipient capture flow resilient on bad mobile networks  *(Core loop reliability · Medium)*
- **Why:** `uploadCapture` runs synchronously inside the chat flow. A flaky 3G connection mid-submission leaves orphan submissions and a bad first impression with the customer who reflects on the *business*, not on PhotoBrief.
- **Impact:** Protects business reputation; reduces support load.
- **Effort:** Medium · **Risk:** Medium · **Deps:** none
- **Files:** `src/features/capture/pages/PublicRecipientPage.tsx`, `src/hooks/useChatFlow.ts`, `src/services/submissionsService.ts`
- **Prompt:** *"Add upload resilience to the recipient capture flow: per-photo retry with exponential backoff (max 3), a visible 'Reconnecting…' state in the chat thread, persistence of pending uploads in `sessionStorage` keyed by token+stepId so a tab refresh resumes, and a final 'X of Y uploaded' confirmation before navigating to /done. Keep RLS via `getTokenClient`."*

### 6. Strengthen invite security: single-use enforcement + admin link surface  *(Security · Medium)*
- **Why:** Verify `beta_invites` tokens are SHA-256 hashed at rest, single-use (consumed_at set on accept), expire, and that revoke/resend rotates tokens. Confirm `AdminInvites.tsx` shows status, expiry, last-sent timestamp clearly so the team doesn't double-invite.
- **Impact:** Avoids invite-leakage incident in beta; admin sanity.
- **Effort:** Medium · **Risk:** Medium · **Deps:** DB schema verification
- **Files:** `supabase/functions/admin-invites/index.ts`, `supabase/functions/invite-accept/index.ts`, `supabase/functions/invite-validate/index.ts`, `src/pages/AdminInvites.tsx`, `src/pages/BetaInvite.tsx`
- **Prompt:** *"Audit invite security end-to-end and write a short report: are tokens hashed at rest, single-use (with a unique partial index on consumed_at IS NULL), and time-bounded? Then patch any gaps and improve `AdminInvites.tsx` to show status (pending/accepted/revoked/expired), days-until-expiry, and a copy-link button per row. Don't expose raw tokens after creation."*

### 7. Recipient flow: progress clarity + completion reassurance  *(Conversion of submissions · Quick win)*
- **Why:** Mobile users abandon when uncertain. The progress bar is there but the "1 of 6 · 5 left · ~3 min" framing, plus a celebratory completion screen with "We've sent your photos to {Business}" reassurance, is missing or thin.
- **Impact:** Higher submission completion rate (the biggest hidden funnel).
- **Effort:** Small · **Risk:** Low · **Deps:** none
- **Files:** `src/features/capture/pages/PublicRecipientPage.tsx`, `src/features/capture/pages/RecipientConfirmationPage.tsx`, `src/components/shared/ReadinessProgress.tsx`
- **Prompt:** *"Improve recipient progress + completion: above the chat thread show 'Step N of M · ~T min left' using average step time, on completion show a branded confirmation page with business logo, 'Photos delivered to {Business}', what happens next in plain language, and a 'Take more photos' link if the request supports resubmit."*

### 8. Dashboard: clearer empty state + 'do this next' for new beta users  *(Activation · Quick win)*
- **Why:** A brand-new workspace lands on the dashboard with empty metrics and two empty list cards. There's no "Send your first request" hero card with a one-click template.
- **Impact:** Activation rate of brand-new beta workspaces.
- **Effort:** Small · **Risk:** Low · **Deps:** none
- **Files:** `src/features/workspace/pages/DashboardPage.tsx`, `src/components/shared/EmptyState.tsx`
- **Prompt:** *"When `requests.length === 0`, replace the metric grid + lists with a single 'Send your first request' hero card: 3 example templates as buttons (Roof inspection, Junk removal, Damage claim) that route to `/requests/new` with the template preselected, plus a small 'Watch 60-sec demo' link."*

### 9. SEO: expand sitemap + per-page meta hygiene  *(Discoverability · Quick win)*
- **Why:** Sitemap only lists 5 URLs; `/auth`, `/signup`, `/forgot-password`, `/help` (already there), help sub-routes are missing. Confirm every public route uses `PageMeta` / `SEOHead` with unique titles + canonical and that JSON-LD on Landing is being emitted server-side or pre-rendered (you have `scripts/prerender.mjs`).
- **Impact:** AI-engine + Google discovery; matches your investment in `llms.txt` and `for-ai-agents`.
- **Effort:** Small · **Risk:** Low · **Deps:** none
- **Files:** `public/sitemap.xml`, `public/robots.txt`, `src/pages/*`, `scripts/prerender.mjs`, `src/hooks/seo/usePageMeta.tsx`
- **Prompt:** *"Audit every public route for unique title/description/canonical via `PageMeta`/`SEOHead`. Expand `sitemap.xml` to include all crawlable public routes. Verify `scripts/prerender.mjs` snapshots all of them so JSON-LD ships in static HTML."*

### 10. Centralize plan/feature gates and remove ad-hoc strings  *(Maintainability · Medium)*
- **Why:** Plan-gate copy ("Reminders are on Pro", "Custom guides are on Pro", "Available on Pro and above") is scattered across `DashboardPage.tsx`, `CreateRequestPage.tsx`, `SubmissionReviewPage.tsx`. A single `lockedFeatureMessage(feature)` helper + reusable `LockedFeatureToast` removes drift and makes upgrade copy consistent.
- **Impact:** Less bug surface, consistent upgrade voice.
- **Effort:** Medium · **Risk:** Low · **Deps:** none
- **Files:** `src/hooks/usePlan.ts`, `src/config/planLimits.ts`, `src/components/pricing/UpgradePrompt.tsx`, callers above
- **Prompt:** *"Add `lockedFeatureCopy(feature)` to `planLimits.ts` returning `{title, description, plan}`. Replace inline 'Reminders are on Pro / Custom guides are on Pro' strings across Dashboard, CreateRequest, SubmissionReview with a shared `showFeatureLockedToast(feature)` helper that calls `toast.error` with consistent copy + 'See plans' action."*

---

## C. Quick wins you can ship today

1. **#3** — Fix pricing/admin link bugs and remove demo-creds from public auth (~20 min).
2. **#1** — Tighten hero copy (~30 min).
3. **#2** — Replace placeholder testimonials/logos (~30 min).
4. **#7** — Recipient progress + completion polish (~45 min).
5. **#8** — Dashboard zero-state hero card (~45 min).
6. **#9** — Expand sitemap + per-page meta sweep (~30 min).

Order: 3 → 1 → 2 → 8 → 7 → 9.

---

## D. Deeper fixes — wait until backend stability is confirmed

- **#4 Submission Review refactor** — touches your most valuable, most-used screen; do it after a clean week on Cloud.
- **#5 Recipient upload resilience** — touches the public, RLS-token write path; needs careful testing across actual flaky mobile networks.
- **#6 Invite security audit + schema tightening** — DB migrations should land in a quiet window.
- **#10 Plan-gate centralization** — wide-touch refactor; safer once the surfaces are otherwise stable.

---

## E. Things you should NOT build yet

- **More AI features** (per-shot retake suggestions beyond current, multi-language capture, voice prompts). Beta loop is enough.
- **Native mobile apps** — your mobile-web flow is the differentiator.
- **A second public marketing page** (case studies, blog) until you have one real customer story.
- **In-app analytics dashboards for businesses** — wait for explicit Pro user demand.
- **Webhook UI polish, custom domains, REST API marketing surface** — Business-tier; defer until Pro is converting.
- **Slack/Zapier integrations** — feature creep before retention is proven.
- **A "Free trial of Pro"** — your invite-only beta + first-pass guarantee already lowers risk.

---

## F. Auth/onboarding stability — confirmed status

Reviewed `RequireAuth.tsx`, `useOnboardingStatus.ts`, `supabaseRetry.ts`, and `OnboardingPage.tsx`:

- ✅ Backend-unavailable does **not** redirect to `/onboarding` — `RequireAuth` renders a hard error screen when `onboarded === null && backendUnavailable`.
- ✅ `useOnboardingStatus` correctly returns `null` (not `false`) on transient errors so the guard doesn't bounce users.
- ✅ Retries are bounded — `withSupabaseRetry` is capped at **2 attempts** with exponential backoff + jitter.
- ✅ `ensure-workspace` is only invoked from the `OnboardingPage` itself (one-shot `autoRepairTried` ref + manual button), not from route guards during outages.
- ⚠️ **Remaining fragility:** `OnboardingPage` is 805 lines and owns repair, validation, multi-step state, and edge-function calls in one file. Not urgent, but worth a future split.

---

## G. Recommended next single prompt

> *"Ship a 'launch credibility' pass: (1) in `src/components/pricing/PricingCardGrid.tsx`, change the Business mailto to `hello@photobrief.ai` and the in-app path to `/settings/billing`; (2) in `src/pages/Auth.tsx`, remove the public demo-account credentials block — keep a single 'Try the demo' button that triggers `ensure-demo-user` without exposing the password; (3) in `src/pages/Landing.tsx`, rewrite the hero subhead to name the buyer ('For roofing, HVAC, plumbing, junk removal, and claims teams') and the outcome ('Stop chasing customers for photos — get a complete, AI-checked brief in one link'); (4) in `src/components/marketing/TrustLogosStrip.tsx` and `TestimonialsRow.tsx`, replace any placeholder logos/quotes with an honest 'In private beta with home-services teams' band. Keep all existing glass styling and animations."*

This single prompt closes the three highest-leverage credibility gaps before any deeper refactor.
