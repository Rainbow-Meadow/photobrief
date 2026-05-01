## What changes (visually)

The generated mockups show a tighter, more product-shot-friendly look than the current UI:

1. **Navy sidebar** (charcoal `#0F172A`-ish) with white text on a light app body, instead of today's all-light sidebar.
2. **Teal/emerald primary** (`#14b8a6`) for primary buttons, progress, focus rings, score ring — replacing the current electric blue `#0A6BFF`.
3. **Flatter, simpler cards**: white surface, hairline border, soft shadow only, no glass/blur on internal app surfaces. (Glass stays on marketing pages.)
4. **Smaller, calmer status pills**: compact green/amber/red/blue pills instead of larger badges with icons.
5. **Tighter spacing + slightly smaller card radius** (`rounded-xl` ≈ 12px) on dashboard/inbox/review surfaces.

## Surfaces in scope

```text
Dashboard            → src/features/workspace/pages/DashboardPage.tsx
Requests inbox       → src/features/requests/pages/RequestsInboxPage.tsx
New request          → src/features/requests/pages/CreateRequestPage.tsx
                       + TemplatePicker, RequestDraftPreview, RequestBuilderModeTabs
Recipient capture    → src/features/capture/pages/PublicRecipientPage.tsx
                       + ChatBubble / capture tile / AI feedback components
Submission review    → src/features/submissions/pages/SubmissionReviewPage.tsx
                       + ShotCard, ReviewProgressSummary, AskForMorePhotosDialog
Guide builder        → src/features/guides/pages/GuideBuilderPage.tsx
Billing              → src/features/billing/pages/BillingSettingsPage.tsx
                       + TopupPackCards
Brand + Team         → src/features/workspace/pages/BrandSettingsPage.tsx
                       + TeamSettingsPage.tsx
App chrome           → src/components/layout/AppSidebar.tsx, DashboardLayout.tsx,
                       PageHeader.tsx, BrandMark.tsx
```

Marketing pages (Landing, Pricing, ForAiAgents) and the Remotion video are **not** changed — they keep the current blue/glass identity.

## Design token changes (`src/index.css`)

Add a second app palette so the brand stays blue on marketing but the dashboard switches to navy + teal. New tokens (light theme):

```text
--app-bg:            220 20% 98%   /* page background behind cards */
--app-sidebar-bg:    222 47% 11%   /* navy sidebar */
--app-sidebar-fg:    0 0% 96%
--app-sidebar-muted: 220 14% 70%
--app-sidebar-active-bg: 222 47% 16%
--app-sidebar-active-fg: 168 76% 55%   /* teal text on active row */

--app-primary:       168 76% 42%   /* teal #14b8a6 */
--app-primary-glow:  168 76% 52%
--app-primary-fg:    0 0% 100%

--app-pill-pass-bg:  152 70% 92%   --app-pill-pass-fg:  152 60% 28%
--app-pill-warn-bg:   38 95% 92%   --app-pill-warn-fg:   30 80% 32%
--app-pill-fail-bg:    0 80% 95%   --app-pill-fail-fg:    0 65% 42%
--app-pill-info-bg:  217 95% 95%   --app-pill-info-fg:  217 80% 38%
```

Dark-mode equivalents added in `.dark { … }`. Existing `--primary` (blue) is left alone so marketing/landing keeps its identity. The sidebar + primary buttons inside `DashboardLayout` will read from the new `--app-*` tokens via a wrapper class `app-shell` that scopes overrides:

```css
.app-shell {
  --primary: var(--app-primary);
  --primary-glow: var(--app-primary-glow);
  --primary-foreground: var(--app-primary-fg);
  --ring: var(--app-primary);
  --background: var(--app-bg);
  --sidebar-background: var(--app-sidebar-bg);
  --sidebar-foreground: var(--app-sidebar-fg);
  --sidebar-accent: var(--app-sidebar-active-bg);
  --sidebar-accent-foreground: var(--app-sidebar-active-fg);
  --sidebar-border: 222 30% 18%;
}
```

`DashboardLayout` gets `className="app-shell …"` on its root. This single switch repaints every authed surface to teal + navy without changing marketing.

A small `<StatusPill variant="pass|warn|fail|info" />` component is added in `src/components/shared/StatusPill.tsx` and replaces the current `StatusBadge`/`<Badge>` usage on the in-scope surfaces (it reads the `--app-pill-*` tokens).

## Per-surface adjustments

- **AppSidebar**: switch text colors, active row uses `bg-sidebar-accent` (now navy-tinted) with teal text and a 2px teal left bar; PhotoBrief wordmark stays white. Settings row pinned to bottom.
- **DashboardPage**: 4-up metric cards become flatter (`surface-card` already exists — tighten padding, smaller icon chip, larger numeric, label below). Recent requests becomes a clean table with hairline rows and small status pills.
- **RequestsInboxPage**: same table treatment as Recent requests; status filter chips on top use the new pill style.
- **CreateRequestPage / TemplatePicker / RequestDraftPreview**: 3-column template grid on desktop, selected card uses teal ring + teal `Ready` chip; right-hand draft preview becomes a single white card with sectioned hairlines and a teal "Create request" CTA.
- **PublicRecipientPage**: header gets the customer-brand color (unchanged), but the progress bar, capture tile dashed border, and AI-feedback "sparkles" chip switch to teal. Bubble styles use the existing `.bubble-assistant` / `.bubble-user` but the user bubble swaps to teal gradient inside `.app-shell` (recipient page is outside `.app-shell`, so it gets a one-off `.recipient-shell` wrapper that applies the same primary override — keeps the customer-side teal feel from the mockups).
- **SubmissionReviewPage**: header gets a 64px circular score ring (teal stroke) on the right; below it the existing `ReviewProgressSummary` is restyled into a single hairline strip with small pills `5 pass · 1 warn · 0 fail · 0 missing`. ShotCards become smaller (3-up grid), photo on top, title row with right-aligned status pill, one-line AI summary, and a small "Suggested: Mark ready" chip.
- **AskForMorePhotosDialog**: dialog body becomes a tight checklist with inline comment inputs only on checked rows + the "First-pass guarantee: this rework is on us." footer line.
- **GuideBuilderPage**: two-column layout — left is the steps list with drag handles and tiny thumbnails, right is the step detail editor with required/AI-quality toggles in teal.
- **BillingSettingsPage / TopupPackCards**: current plan card gets the wide usage bar + "Change plan" button; top-up cards become a clean 3-up grid with the middle card highlighted by a teal border + "Most popular" chip.
- **BrandSettingsPage + TeamSettingsPage**: aligned to be readable side-by-side: logo upload tile, color swatches (teal selected by default), live preview on the brand side; team list with avatar + role pill + top-right "Invite teammate" teal CTA.

## Things deliberately NOT touched

- Marketing pages, Pricing, Landing hero, Remotion video, ForAiAgents — they keep the current blue identity.
- Auth pages (`/auth`, `/signup`, `/forgot-password`) — they sit outside `DashboardLayout` and stay blue, matching the marketing brand.
- DB schema, edge functions, business logic, routing.

## Risks / call-outs

- Scoping primary to `.app-shell` means any third-party component that hard-codes `text-primary` inside the dashboard will also turn teal — that's the intent, but worth noting.
- The recipient page currently inherits the workspace's brand color when set; the teal-by-default look only applies when no brand color is configured, so existing customers keep their custom color.

If this looks right, approve and I'll implement it in one pass.