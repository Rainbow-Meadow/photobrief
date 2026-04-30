## Goal

Upgrade the 22 beta business accounts that signed up on 2026-04-29 from Free to **comped Pro with the Founding Pro flag** — no Stripe charge, no trial expiry — and clean up their auto-generated workspace names (currently "info's workspace", "contact's workspace", etc.) to the real business name derived from their email domain.

Note: you said 21, but there are actually **22** real beta business profiles in the DB (the count excludes `demo@photobrief.app` and all `seed.*@photobrief.test` accounts). I'll confirm this count before running anything destructive.

## The 22 accounts

All created 2026-04-29 14:34–14:58 UTC, currently `plan_tier=free` / `subscription.plan_tier=free` / `is_founding_pro=false`.

| Email | Current workspace name | Proposed workspace name |
|---|---|---|
| hello@rainbow-meadow.org | Patrick Berthiaume's workspace | Rainbow Meadow |
| info@eliteappliancehvac.com | info's workspace | Elite Appliance HVAC |
| info@apexappliancema.com | info's workspace | Apex Appliance MA |
| info@smartfixappliancema.com | info's workspace | SmartFix Appliance MA |
| contact@applianceprocare.com | contact's workspace | Appliance Pro Care |
| info@brightappliancerepair.com | info's workspace | Bright Appliance Repair |
| info@worcestermaplumber.com | info's workspace | Worcester MA Plumber |
| info@fresoloplumbing.com | info's workspace | Fresolo Plumbing |
| cnunes@pipeandplumber.com | cnunes's workspace | Pipe and Plumber |
| matt@plumbing-solutions-inc.com | matt's workspace | Plumbing Solutions Inc |
| info@bigbluebug.com | info's workspace | Big Blue Bug |
| info@fordshometown.com | info's workspace | Ford's Hometown |
| info@johnslandscape.com | info's workspace | John's Landscape |
| service@mottalandscaping.com | service's workspace | Motta Landscaping |
| info@nlcinc.net | info's workspace | NLC Inc |
| info@masslandscapinginc.com | info's workspace | Mass Landscaping Inc |
| ken@junkremovalinc.com | ken's workspace | Junk Removal Inc |
| greenteamops@gmail.com | greenteamops's workspace | Green Team Ops |
| info@trashloversjunkremoval.com | info's workspace | Trash Lovers Junk Removal |
| contact@junkunderjunk.com | contact's workspace | Junk Under Junk |
| info@yardsmartlawncare.com | info's workspace | Yard Smart Lawn Care |
| junkpireremoval@gmail.com | junkpireremoval's workspace | Junkpire Removal |

I'll derive each workspace name from the email domain (or local part for gmail) using simple title-casing. **You can edit any name post-run** from Settings → Workspace, or tell me before I run if you'd rather provide an exact list.

## Changes

For each of the 22 workspaces, in a single migration:

1. **Workspace** — `business_workspaces`
   - `plan_tier = 'pro'`
   - `name = '<derived business name>'`
   - leave `industry` alone (already null; can be set later in Settings)

2. **Subscription** — `subscriptions` (one row already exists per workspace)
   - `plan_tier = 'pro'`
   - `is_founding_pro = true`
   - `status = 'active'`
   - `billing_interval = 'monthly'`
   - `stripe_customer_id = NULL`, `stripe_subscription_id = NULL`, `price_id = NULL` (comped, no Stripe link)
   - `current_period_start = now()`, `current_period_end = now() + interval '100 years'` (effectively non-expiring; webhook can override later if they ever attach a card)
   - `cancel_at_period_end = false`

3. **Founding Pro claim** — `founding_pro_claims`
   - Insert `(workspace_id, claimed_by=owner_id, claimed_at=now())` for each.
   - This drains the public 50-slot Founding Pro counter by 22, so the landing-page banner reflects ~28 remaining. Confirm that's intended (alternative: bypass the claim row and just set the flag on the subscription, leaving the public counter untouched).

## Out of scope (can be follow-ups)

- No Stripe customers are created — these are internal/beta comps. If a beta user later self-subscribes, the existing webhook will create their Stripe customer and overwrite the row.
- No emails are sent. If you want a welcome / "you've been upgraded" email, say the word and I'll trigger `notify-event` per workspace.
- Workspace logos, brand colors, and seeded guides are left untouched.

## Verification after migration

I'll run a single SELECT showing all 22 rows with their new `ws.name`, `ws.plan_tier`, `sub.plan_tier`, `sub.is_founding_pro`, `sub.current_period_end`, and a count check on `founding_pro_claims` to confirm 22 new rows. Result will be pasted in chat.

## Open questions before I run

1. **Count**: confirmed 22 (not 21) — OK to proceed with all 22?
2. **Workspace names**: OK to auto-derive from email domain as listed above, or do you want to provide an exact mapping?
3. **Founding Pro claim row**: insert into `founding_pro_claims` (decrements the public 50 counter to 28) — yes/no?
