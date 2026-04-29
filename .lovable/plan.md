## Goal

Promote the rejection-refund rule — *"if we make you ask twice, the request is on us"* — as a top-tier trust signal. It's a rare, defensible promise (most competitors charge per send regardless of quality) and it pairs naturally with the new first-pass acceptance metric.

## Positioning

**Headline phrase (locked):** **"First-pass guarantee"**

**Promise sentence:** *"If a submission needs rework, the request is refunded. You only pay for briefs that land right the first time."*

This phrase appears verbatim in every surface so it becomes a recognizable feature name.

## Surfaces to update

### 1. Landing page hero — sub-CTA badge
Add a small inline pill directly under the existing CTA buttons, above the "Free plan includes…" line:

```text
✓ First-pass guarantee — rework? request refunded
```

Links to `#first-pass-guarantee` anchor further down the page.

### 2. New "First-pass guarantee" feature band
A dedicated section between **StatsBand** and **IndustryGrid** (id `first-pass-guarantee`). Layout:

```text
┌──────────────────────────────────────────────────────┐
│  [icon] First-pass guarantee                         │
│                                                      │
│  Most tools charge whether the photos are usable     │
│  or not. We don't. If you have to send the           │
│  customer back for a redo, that request is           │
│  refunded to your monthly allowance — automatically. │
│                                                      │
│  [How it works]      [See your acceptance rate →]    │
└──────────────────────────────────────────────────────┘
```

Three short bullets to the right (or below on mobile):
- **Auto-credited** — fires the moment a reviewer rejects
- **One credit per request** — guaranteed by a DB constraint
- **Visible on your dashboard** — tracked as first-pass acceptance %

New file: `src/components/marketing/FirstPassGuaranteeBand.tsx`. Use `bg-card` with a soft primary accent border and the `ShieldCheck` lucide icon. Track `cta_click` with `location: "guarantee_band"`.

### 3. StatsBand — replace one stat
Swap the weakest stat (`94% Submission readiness score` — duplicates the metric concept) with:

```text
100%   Refunded on rework — every time
```

### 4. Pricing page — feature row + per-card line
- Add `"First-pass guarantee — rejected requests are refunded"` to the **top** of the feature list of every plan in `src/config/planLimits.ts` (so it shows in `features.slice(0, 7)`).
- Add a small footnote below the `PricingCardGrid` grid:
  > **Included on every plan.** Reviews that need rework don't count against your monthly request allowance.

### 5. Dashboard metric card — surface the refund
The `First-pass acceptance` `MetricCard` on `DashboardPage` already exists. Add a third line under the sub-stat showing **"X requests refunded this period"**, computed from `usage_events` where `event_type = 'request_credit'` within the current billing window. Tooltip explains the guarantee.

Query approach (workspace-scoped, no new RPCs needed):
```ts
const { count } = await supabase
  .from("usage_events")
  .select("id", { count: "exact", head: true })
  .eq("workspace_id", wsId)
  .eq("event_type", "request_credit")
  .gte("created_at", periodStart);
```

### 6. Auth signup page — trust line
Append a single line to the signup-form sub-text:
> *Includes the first-pass guarantee — rework requests are always refunded.*

## Files touched
- `src/pages/Landing.tsx` — hero pill + insert new band
- `src/components/marketing/FirstPassGuaranteeBand.tsx` *(new)*
- `src/components/marketing/StatsBand.tsx` — swap one stat
- `src/components/pricing/PricingCardGrid.tsx` — footnote
- `src/config/planLimits.ts` — prepend feature line on each plan
- `src/features/workspace/pages/DashboardPage.tsx` — load refund count, pass to MetricCard
- `src/components/shared/MetricCard.tsx` — minor: support an optional third "footnote" line if not already supported
- `src/pages/Auth.tsx` — trust line under signup form

## Out of scope
- No new DB work — the refund mechanism is already live and idempotent.
- No copy variants/A-B testing harness — this is a single, confident phrasing.
- No changes to email templates (can follow up if you want it in transactional emails too).

## Approve to proceed
Once approved I'll implement all 8 file changes in one pass.