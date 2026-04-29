## UX Consistency Sweep — Findings & Fix Plan

A read of every primary marketing surface, dashboard surface, settings surface, and shared component turned up a small but visible set of inconsistencies. The marketing site (Landing, pricing, hero) is internally consistent — the drift is concentrated in **in-app pages**, where settings, inbox, and dashboard each adopted slightly different spacing/typography rules over time.

Below: what's wrong, where, and the exact fix.

---

### 1. Section heading sizes drift across in-app pages

`PageHeader` standardizes the H1 (`text-2xl font-semibold`). But subordinate section headings inside pages are inconsistent:

| Surface | Section heading style |
|---|---|
| `BrandSettingsPage` (Identity, Messaging, Contact) | `text-sm font-semibold` |
| `MessageTemplatesPage` (New template, Your templates) | `text-sm font-semibold` |
| `TeamSettingsPage` (Invite, Members, Pending) | `text-sm font-semibold` |
| `DashboardPage` list cards (Ready to review, Needs action) | `text-sm font-semibold` |
| `GuideLibraryPage` category headings (Plumbers, Property…) | `text-base font-semibold` |
| `BillingSettingsPage` rows | mixed |

**Fix:** standardize all in-app section headings (H2 inside a card/section) to `text-sm font-semibold text-foreground` with `uppercase tracking-wide text-muted-foreground` reserved for "eyebrow" labels only. Bump `GuideLibraryPage` category labels from `text-base` to `text-sm font-semibold` and rely on the icon chip + blurb for visual weight, matching every other settings card.

---

### 2. Card padding drift (`p-3` / `p-4` / `p-5` / `p-6`)

The shared rule should be: **list rows = `px-5 py-3`**, **section cards = `p-5`**, **dialog/auth cards = `p-6`**. Today:

- `BrandSettingsPage` form card uses `p-6` → should be `p-5` to match every other settings card.
- `MetricCard` uses `p-5` ✓
- Templates list rows use `p-3` → should be `px-4 py-3` so the inner content lines up with the section heading on the same surface.
- Member rows in `TeamSettingsPage` use `p-3` → same correction.
- `EmptyState` uses `py-14` (very tall); inside `MessageTemplatesPage` "Your templates" section (which already has its own `p-5` card), this stacks padding awkwardly. Reduce in-card empty state to `py-10`.

**Fix:** introduce a soft convention in shared components and update the four offending pages.

---

### 3. PageHeader bottom rule is heavy on settings pages

`PageHeader` has `border-b pb-5`. On dense settings pages (Templates, Team, SMS) the rule appears immediately above another `border` card, producing two stacked horizontal lines 24px apart. Visually noisy.

**Fix:** keep the border on Dashboard / Requests / Submission Review (where the next element is a filter row or grid) and add a `bordered={false}` variant used by Templates, Team, SMS, Brand, Billing where a card with its own border follows immediately.

---

### 4. Plan-gate "Pro" tag is rendered three different ways

- Inbox bulk bar: `text-[10px] uppercase text-primary` (no background)
- Guides "Draft with AI" / "New guide": `text-[10px] uppercase tracking-wide text-primary`
- "New guide" (locked): `text-[10px] uppercase tracking-wide opacity-80` (not primary-colored)
- Dropdown menu items: `ml-auto text-[10px] uppercase tracking-wide text-primary`

**Fix:** introduce a tiny `<PlanTag plan="pro" />` (or reuse `StatusBadge` with a new `tone="plan"`) — pill background, primary text, consistent placement (`ml-auto` inside menu items, `ml-1` inline). Use it in: `RequestsInboxPage` bulk bar, dropdown actions; `GuideLibraryPage` AI/New buttons; `DashboardPage` bell button tooltip; anywhere else `text-[10px] uppercase ... text-primary` is hand-rolled.

---

### 5. "Eyebrow" capitalization styles are inconsistent

Three different uppercase tracking values are in use:

- `tracking-[0.18em]` — TrustLogosStrip, HeroProductMockup
- `tracking-wide` (≈0.025em) — Templates kind label, missing items, status
- `uppercase tracking-wide` plain — Inbox table headers

**Fix:** standardize to **two tiers**:
- Marketing eyebrow: `text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground`
- App eyebrow / table head: `text-xs font-medium uppercase tracking-wide text-muted-foreground`

Update the marketing components (`TrustLogosStrip`, `HeroProductMockup`) to share one tier, and the Inbox table header + Templates "kind" label to share the other.

---

### 6. Page container vertical rhythm

Top-level page wrappers use either `space-y-6` or `space-y-8`:

- `space-y-6`: Dashboard, Inbox, Brand, Templates, Team, Billing
- `space-y-8`: GuideLibraryPage

**Fix:** GuideLibraryPage → `space-y-6` to match the rest. The `space-y-4` between heading + grid inside each category section is enough breathing room.

---

### 7. Inbox table cell justification

The table uses `align-top` everywhere — correct for the "Missing" column with multi-line lists, but visually misaligned for single-line cells (Recipient name, Status badge, Readiness badge). The badges hug the top edge of a tall row, while the recipient name sits one line above them.

**Fix:** switch `align-top` → `align-middle` for every column except `Missing`; keep `Missing` `align-top`.

---

### 8. Dashboard list "view all" CTA pulls right but title and items align left at different inset

`DashboardList` header uses `px-5`, list rows use `px-5` — good. But the CTA button has its own internal padding so its right edge sits ~12px inside the card border, while the title sits flush at 20px on the left. Asymmetric.

**Fix:** wrap the right-side button with `-mr-2` to negate the button's intrinsic padding, or set `size="sm"` + `pr-1` so the visible text aligns with the right inset of the row content (the badges).

---

### 9. Auth page + forgot/reset pages

Auth page uses its own bespoke layout. Verify (and align if needed) that:
- Card width matches between `Auth.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`, `Unsubscribe.tsx` (all should be `max-w-md` centered).
- Heading uses `text-2xl font-semibold tracking-tight` (matching `PageHeader`).
- Submit button is full-width on all four.

---

### 10. Misc small drifts

- `MarketingLayout` header height is `h-20`; `DashboardLayout` header is `h-14`. Intentional, but the marketing footer uses `py-8` while the in-app pages have no footer — fine, just noting.
- `FoundingCustomerBanner` → confirm it appears only on the public pricing surface, not the in-app billing page (currently `PricingCardGrid` always renders it when `!onDark`).
- `FinalCtaCard` icon chip uses `rounded-2xl`; `IndustryGrid` icon chip uses `rounded-lg`; `GuideLibraryPage` category icon chip uses `rounded-md`. Pick one (`rounded-lg`) for in-app icon chips and keep the larger `rounded-2xl` for the hero/CTA marketing surfaces.

---

## Implementation order (one batch, no QA gating between items)

1. **Shared primitives** — extend `PageHeader` with `bordered?: boolean`; add `<PlanTag>` (or a `tone="plan"` to `StatusBadge`); tighten `EmptyState`'s in-card variant.
2. **In-app pages** — apply `bordered={false}` on Brand/Templates/Team/SMS/Billing; standardize section H2s; bring all card paddings to the convention; swap the hand-rolled "Pro" labels for `<PlanTag />`.
3. **Inbox** — flip cell alignment to `align-middle` (except Missing); fix the "view all" CTA inset on Dashboard list cards.
4. **Marketing/landing** — unify eyebrow tracking to `0.16em`; unify icon-chip radius for in-app vs marketing.
5. **Auth surfaces** — verify the four auth-style pages match each other (width, heading, button).

No data, RLS, or behavior changes — pure visual + spacing.

### Files touched (estimate)

- `src/components/layout/PageHeader.tsx` — add `bordered` prop
- `src/components/shared/StatusBadge.tsx` *or* new `src/components/shared/PlanTag.tsx`
- `src/components/shared/EmptyState.tsx` — accept `compact` prop
- `src/features/workspace/pages/{Brand,Team,MessageTemplates,Sms,Dashboard}Page.tsx`
- `src/features/billing/pages/BillingSettingsPage.tsx`
- `src/features/requests/pages/RequestsInboxPage.tsx`
- `src/features/guides/pages/GuideLibraryPage.tsx`
- `src/components/marketing/{TrustLogosStrip,HeroProductMockup,FinalCtaCard,IndustryGrid}.tsx`
- `src/pages/{Auth,ForgotPassword,ResetPassword,Unsubscribe}.tsx`

Approve to apply.