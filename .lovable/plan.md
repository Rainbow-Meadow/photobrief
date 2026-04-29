## Mobile-first UI overhaul

Goal: every screen feels native-quality on a phone (≤640px) while preserving the existing desktop experience pixel-for-pixel above `lg`. Same components, same design tokens — just reflowed and density-tuned per breakpoint.

We are **not** packaging this as Capacitor yet. This pass makes the web app look and feel like a mobile app inside the browser so a future Capacitor wrapper "just works". I'll flag the install/native step as a separate follow-up.

### Design principles applied everywhere

- **Mobile-first defaults** — base classes target phones; `sm:` / `lg:` layer on tablet/desktop refinements. No `hidden lg:block` content that disappears on mobile without a mobile equivalent.
- **Tap targets ≥ 44px** — icon buttons get `h-11 w-11` on mobile, shrink to `h-9 w-9` from `sm:` up.
- **Thumb-zone primary actions** — sticky bottom action bars on long forms (Create Request, Brand Settings, Submission Review).
- **Safe areas** — root layouts add `pb-[env(safe-area-inset-bottom)]` and `pt-[env(safe-area-inset-top)]` so the UI doesn't sit under iOS home indicator / notch when wrapped natively later.
- **No horizontal scroll** — replace tables on mobile with stacked cards; tables stay on `md:` and up.
- **Single source of truth** — semantic tokens from `index.css` only; no new colors, no per-screen overrides.

### Navigation

Replace the always-on left sidebar on mobile with a **bottom tab bar** (the canonical mobile pattern), and keep the sidebar exactly as-is on `lg:` and up.

```text
phone (< lg)               desktop (>= lg)
+--------------------+     +-------+-----------------+
| top app bar (56px) |     | side  |  top bar        |
|                    |     | bar   +-----------------+
|     content        |     |       |                 |
|                    |     |       |   content       |
+--------------------+     |       |                 |
| ⌂  📥  📚  ⚙  + |     +-------+-----------------+
+--------------------+
```

Bottom bar items: **Dashboard · Requests · Guides · Settings**, plus a centered raised **+ New request** FAB. Settings opens a full-screen sheet listing the current sidebar settings group (Brand / Team / Templates / SMS / Billing). Workspace switcher and notifications move into a top-bar overflow menu on mobile.

`DashboardLayout` changes:
- Hide `<AppSidebar />` below `lg` (`hidden lg:flex`).
- Render new `<MobileTabBar />` only below `lg` (`lg:hidden`), fixed bottom, with `safe-area-inset-bottom`.
- Main `<main>` gets `pb-20 lg:pb-0` so content clears the tab bar.
- Top bar: keep "+ New request" only on `sm:` and up (the FAB covers mobile); always show notifications + avatar.

Marketing nav: turn the `hidden sm:flex` desktop nav into a hamburger sheet on mobile (Use cases / How it works / Pricing / Sign in / Try Free).

### Page-level mobile patterns

**Dashboard** (`DashboardPage.tsx`)
- Metric grid: keep `grid gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-5`. Tighten `MetricCard` padding on mobile (`p-3 sm:p-4`) and let value text stay readable (`text-xl sm:text-2xl`).
- Two list cards stack 1-col by default and become 2-col at `lg:` (already partly true). Make each list row a full-width tappable card on mobile with the status badge wrapping under the title rather than crowding the right edge.
- Assistant panel: on mobile, open as a bottom sheet (Drawer) instead of a side column.
- "Assistant" / "New request" actions in the page header collapse into the FAB + a single Assistant icon button on mobile.

**Requests Inbox** (`RequestsInboxPage.tsx`)
- Below `md:`, replace the table with a stacked card list (one card per request: name, guide, status pill, readiness, last activity, kebab menu). Filter chips become a horizontally scrollable row (`overflow-x-auto snap-x`).
- Search input becomes full-width and sticky just under the top bar.
- From `md:` up, the existing table layout is unchanged.

**Create Request** (`CreateRequestPage.tsx`)
- Stack the two-column layout vertically on mobile (already is — verify gap). Move the "Send request" CTA to a sticky bottom bar (`fixed bottom-16 lg:static`) so it's always reachable above the tab bar.
- Template picker grid → 1-col on mobile, 2-col `sm:`.

**Submission Review** (`SubmissionReviewPage.tsx`)
- Header summary card collapses to a single column with shot thumbnails in a horizontally snapping row.
- Approve / Request resubmission actions become a sticky bottom bar on mobile (with their existing styling).
- Right-rail metadata moves below the shot grid on mobile (`order-last lg:order-none`).

**Settings pages** (Brand / Team / Templates / SMS / Billing)
- Collapse the right-rail preview/help cards under the form on mobile.
- Form rows: full-width inputs, labels stacked above (already mostly true).
- Sticky "Save changes" footer bar on mobile for any page with unsaved-changes state.

**Guides Library**
- Card grid already responsive; ensure cards have `min-h` consistency and "New guide" CTA appears in the FAB / sticky header on mobile.

**Public recipient page** (`/r/:token`)
- Already chat-first, so it's mostly mobile-correct. Audit for: keyboard-safe input bar (`pb-[env(safe-area-inset-bottom)]`), prevent body scroll behind the keyboard, ensure single-column.

**Landing / Pricing / Auth**
- Landing hero font sizes already scale (`text-4xl sm:text-5xl lg:text-6xl`) — keep.
- `PricingCardGrid` should stack to 1-col with horizontal snap-scroll on mobile so users can swipe between plans.
- Auth form: ensure inputs are `text-base` (prevents iOS zoom-on-focus), button is full-width on mobile.

### New / changed files

- **New** `src/components/layout/MobileTabBar.tsx` — bottom nav with NavLinks + central FAB.
- **New** `src/components/layout/MobileSettingsSheet.tsx` — full-screen sheet listing settings sub-pages (used from the Settings tab).
- **New** `src/components/layout/MobileTopBar.tsx` (optional split) or fold into `DashboardLayout`.
- **Edit** `src/components/layout/DashboardLayout.tsx` — gate sidebar behind `lg:`, mount `<MobileTabBar />`, add safe-area padding.
- **Edit** `src/components/layout/MarketingLayout.tsx` — hamburger sheet for nav links on mobile.
- **Edit** `src/components/layout/PageHeader.tsx` — allow actions to wrap below the title on mobile cleanly; expose `compact` prop for icon-only action variants.
- **Edit** `src/components/shared/MetricCard.tsx` — denser mobile padding/typography variant.
- **Edit** `src/features/requests/pages/RequestsInboxPage.tsx` — render mobile card list below `md:`, table at `md:` and above.
- **Edit** `src/features/requests/pages/CreateRequestPage.tsx` — sticky mobile submit bar.
- **Edit** `src/features/submissions/pages/SubmissionReviewPage.tsx` — sticky review actions, reordered sections on mobile.
- **Edit** `src/features/workspace/pages/DashboardPage.tsx` — Assistant as Drawer on mobile, condensed header actions.
- **Edit** `src/features/workspace/pages/BrandSettingsPage.tsx`, `TeamSettingsPage.tsx`, `MessageTemplatesPage.tsx`, `BillingSettingsPage.tsx` — sticky save bars, single-column reflow.
- **Edit** `src/components/pricing/PricingCardGrid.tsx` — snap scroll on mobile.
- **Edit** `src/index.css` — add safe-area utility helpers (only if not already in Tailwind config).
- **Edit** `index.html` — add `viewport-fit=cover` to the viewport meta and `theme-color` matching `--background`, so when this is later wrapped in Capacitor the status bar matches.

### What stays the same

- All design tokens, colors, gradients, shadows.
- Desktop layouts at `lg:` and above are visually unchanged.
- All routes, data flow, plan gating (`usePlan().can()`), Supabase calls.
- No new dependencies (we use existing shadcn `Sheet`, `Drawer`, `Sidebar`).

### Out of scope (explicit)

- Capacitor packaging, native plugins, App Store assets — we'll do this as a follow-up once the mobile-web feel is locked.
- PWA / service worker — skipped per project guidance unless you ask.
- Rewriting the design system or component library.

### Validation checklist

After implementation I'll spot-check at 360×800 (Android baseline), 390×844 (iPhone 14), 768×1024 (iPad), and 1440×900 (desktop) to confirm:
- No horizontal scroll on any page below `md:`.
- Bottom tab bar never overlaps content; FAB is always reachable.
- Sticky action bars don't double-stack with the tab bar.
- Tap targets ≥ 44px on all interactive icons.
- Desktop layouts identical to current.
