## Add Top-Up Request Credits

Let businesses buy extra request packs when they hit their monthly cap, instead of being forced to upgrade tiers. Top-ups are one-time purchases that add credits on top of the plan's monthly allowance and last until the end of the current billing period.

### Pricing (mobile-first cards on Billing page)

Pack pricing is set so per-request cost is roughly **2× the marginal plan rate** — cheaper than upgrading for short bursts, but a clear nudge to move up if used often.

| Pack | Requests | Price | Per-request |
|------|----------|------:|-----------:|
| Small | 25 | $15 | $0.60 |
| Medium | 100 | $45 | $0.45 |
| Large | 500 | $175 | $0.35 |

Available on every paid plan (Starter, Pro, Team, Business). Free plan users see an upgrade nudge instead — top-ups don't apply there.

### What the user sees

1. **Billing page → new "Top-up credits" section** below the plan switcher: 3 pack cards, current top-up balance, and a list of the last few purchases.
2. **At-limit moments** (Create Request, Dashboard at-cap banner, Inbox empty state): existing "PLAN_LIMIT_REACHED" toast/card gains a secondary "Buy a credit pack" button alongside "Upgrade plan".
3. **Usage meter** on Billing + Dashboard: when a top-up is active, shows `12 / 150 + 25 top-up` and the meter fills proportionally so people see the buffer.
4. **Stripe Embedded Checkout** in a Dialog (same pattern as plan upgrades) — one-time payment, no subscription.

### Technical changes

**Database (migration)**
- New table `request_credit_packs` (id, workspace_id, plan_at_purchase, pack_size, amount_cents, currency, environment, stripe_payment_intent_id, stripe_checkout_session_id, status [`pending`|`active`|`refunded`], remaining int, period_end timestamptz, created_at).
- New `usage_event_type` value `topup_request_used` — logged each time a request is created while the user is over their plan cap, decrementing `remaining` on the oldest active pack via trigger.
- Update `enforce_request_limit()`: if plan cap reached, check `SUM(remaining) FROM request_credit_packs WHERE workspace_id = ws AND status='active' AND period_end > now()`. If > 0, allow insert and consume one credit (oldest pack first). Otherwise, raise `PLAN_LIMIT_REACHED` as today.
- New SQL helper `current_topup_balance(_workspace_id uuid)` returning `{ remaining int, expires_at timestamptz }` for the UI.
- RLS: members read their workspace's packs; only service role writes (webhook + checkout function).

**Stripe products** (one-time, USD, single-purchase qty 1/1)
- `topup_25` — Top-up: 25 requests — $15
- `topup_100` — Top-up: 100 requests — $45
- `topup_500` — Top-up: 500 requests — $175

**Edge functions**
- `create-topup-checkout`: mirrors `create-checkout` but uses `mode: "payment"`, `ui_mode: "embedded"`, looks up the topup price by `lookup_keys`, stamps metadata `{ workspace_id, user_id, pack_size, kind: "topup" }`. `verify_jwt = false`.
- Extend `payments-webhook`: on `checkout.session.completed` where `metadata.kind === "topup"`, insert a row in `request_credit_packs` with `remaining = pack_size`, `period_end = subscriptions.current_period_end` (or now() + 30d if no sub), `status = "active"`.

**Frontend**
- `src/config/topupPacks.ts` — single source of truth for the 3 packs.
- `src/components/billing/TopupPackCards.tsx` — mobile-first vertical stack (3 cards), `sm:grid-cols-3`, "Buy pack" button per card.
- `src/components/billing/TopupCheckoutDialog.tsx` — wraps `StripeEmbeddedCheckout` with `priceId={topup_NN}`.
- `src/hooks/useTopupBalance.ts` — calls `current_topup_balance` RPC, exposes `{ remaining, expiresAt, refetch }`.
- Update `BillingSettingsPage`: render `<TopupPackCards />` after the plan switcher; add "Top-up balance" line to the usage card.
- Update `useUsage` to include `topupRemaining` and a derived `effectiveRequestsRemaining`. Update `requestsAtLimit` so it stays `false` while top-up balance > 0.
- Update at-limit error UI in `CreateRequestPage` and the dashboard banner: show the new "Buy a credit pack" CTA opening the topup dialog.
- Update `PaymentTestModeBanner` coverage — already global, no change.

### Out of scope (explicitly)
- Auto-renew / subscription packs (only one-time for now).
- Refunding unused top-up credits at period end (they expire silently — call this out in the card copy).
- Top-ups for AI checks or seats (request credits only).
