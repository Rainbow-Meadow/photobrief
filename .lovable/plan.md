# End-to-end QA across all plan tiers

Goal: exercise every non-SMS feature of PhotoBrief from a fresh mock account on each plan tier (`free`, `starter`, `pro`, `team`, `business`), and produce a single test report listing PASS/FAIL/BLOCKED per scenario with evidence.

## Approach

1. **Five mock accounts**, one per tier, created via the normal signup flow so the `handle_new_user` trigger seeds workspace + brand + subscription rows naturally.
   - Emails: `qa+free@photobrief.test`, `qa+starter@…`, `qa+pro@…`, `qa+team@…`, `qa+business@…`
   - After signup, a SQL migration upgrades each workspace's `business_workspaces.plan_tier` and matching `subscriptions.plan_tier` to the target tier. (Stripe checkout is not exercised — going through real Stripe would require live cards. Tier gating logic is what we're verifying, and that keys off `plan_tier`, not Stripe state.)
   - Email confirmation: I'll temporarily auto-confirm these test users via `cloud--configure_auth` only if signup blocks on email verification; otherwise insert `email_confirmed_at` directly.

2. **Drive the UI with the browser tool** (`navigate_to_sandbox`, `observe`, `act`) for each account, walking the flows below. Where the browser tool has known gaps (file upload widgets, canvas, real email delivery), fall back to direct DB / edge-function calls and note it as "verified via API" rather than "verified via UI".

3. **Submit a recipient response** for each tier by visiting `/r/:token` in a logged-out browser context, answering context questions, and uploading a sample image (a small PNG generated in `/tmp`). If the upload widget resists automation, POST directly to storage + `captured_media` using the request token header and note the substitution.

4. **Produce `/mnt/documents/qa-report.md`** with one section per tier and a final cross-tier matrix showing which gates fired correctly (request cap, seat cap, internal notes, custom guides, message templates).

## Scenarios per tier

For each account:

```text
Auth & onboarding
  - Signup -> trigger seeds workspace, brand_profile, subscription, profile
  - Onboarding page completes and sets profiles.onboarded_at
  - Login / logout / password reset request

Workspace settings
  - /settings/brand: edit name, color, intro/completion msg, save, reload, persisted
  - /settings/templates: create + edit + delete (Pro+); on Free/Starter expect PLAN_FEATURE_LOCKED
  - /settings/team: invite a second email; on Free/Starter the seat cap (1) blocks
  - /settings/sms: page renders, shows "not configured" state (no actual Twilio calls)
  - /settings/billing: shows current tier + portal button (don't open Stripe)

Guides
  - /guides: global templates visible
  - Clone a global template into the workspace
  - /guides/new: build a custom guide with 2 steps + 1 context question
    -> on Free/Starter expect PLAN_FEATURE_LOCKED on insert
  - Edit a step, reorder, save

Requests
  - /requests/new: create request against the cloned guide
  - Create requests up to (cap+1) to verify PLAN_LIMIT_REACHED at the boundary
    (free=3, starter=25 — only do full cap on free; for higher tiers create 2 and
     verify usage_events row appears + cap value reads correctly)
  - /requests/:id: change channel (Email/Both) — SMS option disabled (no Twilio),
    persisted selection still in localStorage after reload

Recipient flow (public, no auth)
  - Open /r/:token in fresh context
  - Answer context questions
  - Upload one sample image per step
  - Submit -> recipient confirmation page
  - Verify submissions row + captured_media rows + notification fires for workspace

Submission review
  - /submissions/:id: see media, AI summary fields, missing_items
  - Add internal note -> Pro+ only; Free/Starter expect PLAN_FEATURE_LOCKED
  - Mark reviewed -> submitted_at/reviewed_at populated

Notifications & messaging
  - In-app notifications appear for: request_message_*, submission_received, request_opened
  - Send reminder from request detail; verify request_messages row inserted
    (email delivery itself logged in email_send_log, not actually sent in test)

Data retention sanity
  - run_data_retention() invoked manually; verify nothing deleted for fresh data
```

## Acceptance criteria

- `qa-report.md` lists every scenario above × 5 tiers with status and evidence (route, screenshot path, or SQL row count).
- Plan-gate triggers fire correctly: at least one PASS row per gate (`enforce_request_limit`, `enforce_seat_cap`, `enforce_internal_notes_plan`, `enforce_custom_guides_plan`, `enforce_message_templates_plan`).
- All bugs found are listed with reproduction steps. Plan does NOT include fixing them — if the user wants fixes, that's a follow-up.

## Out of scope

- SMS send / inbound (excluded per request).
- Real Stripe checkout (would charge real cards). Tier gating verified via direct `plan_tier` updates, which is what the gates actually check.
- Real email delivery (Resend/SES). Verified by `email_send_log` rows + edge-function 200s.
- Load / performance testing.
- Visual regression beyond "page rendered without runtime error".

## Technical notes

- Mock users created via `supabase.auth.signUp` from a one-off node script run with `code--exec`, then a migration sets plan_tier + bypasses email confirmation for these specific emails.
- Browser sessions: one `navigate_to_sandbox` per tier, then `act` through flows. Use `set_viewport_size 1280x720`. Logged-out recipient pass uses a separate sandbox session per request token.
- Cleanup: at the end, a migration deletes the 5 test workspaces (cascade clears requests/submissions/etc.) and the 5 auth users. Cleanup runs even if tests fail.
- Estimated runtime: ~25–40 minutes of tool calls. I'll keep the report updated incrementally so partial results survive a mid-run failure.

## Deliverable

`/mnt/documents/qa-report.md` plus a short chat summary of: total PASS / FAIL / BLOCKED counts, top 5 issues found, and any gates that did not behave as the schema implies.