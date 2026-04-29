
# Full End-to-End Per-Tier App Audit

Audit every app surface against every plan tier using **one mock user per tier** (free, starter, pro, team, business). Verify each tier's features are (a) available where allowed, (b) properly gated where not, and (c) fully functional end to end. Delete all audit data after.

## Methodology

**Hybrid (DB + REST + edge function curl)** — same approach used in prior audit rounds. No browser automation per-tier (5× browser sessions would be slow and fragile); instead exercise the actual code paths the UI calls.

### Seed
For each tier, create one auth user via Supabase Admin API → `handle_new_user` trigger auto-bootstraps workspace + subscription + profile. Then promote each workspace's `subscriptions.plan_tier` and `business_workspaces.plan_tier` to its target tier (direct SQL, simulating a successful Stripe webhook).

### Per-Tier Test Matrix

For each of the 5 users, run these checks against the real code paths:

| Surface | What we verify |
|---|---|
| **Auth & onboarding** | Signup → `handle_new_user` populates 5 tables; profile readable via RLS; default workspace resolves |
| **Workspace & RLS isolation** | User A cannot read User B's workspace, requests, submissions, brand_profiles, notifications, usage_events, subscriptions |
| **Plan gates — request quota** | Insert N+1 `photo_brief_requests` where N = tier cap (3/25/150/500/1500). Confirm trigger raises `PLAN_LIMIT_REACHED` at N+1 only |
| **Plan gates — seat cap** | Insert N+1 `workspace_members` where N = tier cap (1/1/3/10/25). Confirm `enforce_seat_cap` fires correctly |
| **Plan gates — custom guides** | Insert `photo_guides` with `workspace_id`. Free/Starter must fail with `PLAN_FEATURE_LOCKED`; Pro/Team/Business succeed |
| **Plan gates — internal notes** | Insert `internal_notes`. Free/Starter blocked; Pro+ allowed |
| **Plan gates — message templates** | Insert `message_templates`. Free/Starter blocked; Pro+ allowed |
| **Public recipient flow** | Anon GET `/r/{token}` resolves request; anon insert into `submissions` + `captured_media` succeeds; cross-token access denied |
| **Usage tracking** | After successful request inserts, `current_period_usage` returns correct count for the workspace; other workspaces see 0 |
| **Notifications** | Trigger `notify_on_request_opened` fires on status change; row appears in `notifications` for workspace members only |
| **Edge functions** | `curl` `notify-event` with a signup payload (service-role auth) → returns 200; `process-email-queue` boots; `payments-webhook` responds to a synthetic checkout.session.completed |
| **Founding Pro** | `founding_pro_remaining()` returns sensible value; cache row stays consistent under parallel callers |
| **Subscriptions/billing rows** | Each tier has correct `plan_tier`, `billing_interval`, `current_period_start/end`, `is_founding_pro` flag where applicable |
| **Email queue** | After signup, welcome email enqueued via `_notify_event` → row appears in pgmq; `process-email-queue` drains it |

### Pass/Fail Criteria

A tier passes only if **every** row in its column produces the expected outcome (allowed where listed, blocked-with-correct-error-code where gated). Any unexpected 500/403/PGRST error = fail.

### Output
A compact pass/fail matrix (5 tiers × 14 surfaces) with the exact failure message for each red cell. Followed by remediation recommendations.

### Cleanup (destructive, pre-approved)
- Delete the 5 auth users (cascades workspace_members via trigger semantics)
- Explicitly purge: `business_workspaces`, `subscriptions`, `workspace_members`, `profiles`, `photo_brief_requests`, `submissions`, `captured_media`, `usage_events`, `notifications`, `message_templates`, `internal_notes`, `photo_guides` (audit-created only), `email_send_log`, pgmq queue messages tagged audit
- Verify `leftover_audit_users = 0` and no orphaned workspaces remain

## Technical Notes

- All seed/cleanup happens via `supabase--migration` (cleanup) and `code--exec` against the REST/admin APIs using `SUPABASE_SERVICE_ROLE_KEY`.
- Each mock user gets a unique deterministic email prefix (`audit_e2e_{tier}_{timestamp}@photobrief.test`) for safe cleanup.
- Plan-gate insert tests use `service_role` for setup but switch to **per-user JWT** for the actual gate-triggering insert — otherwise `service_role` bypass would mask real user-facing behavior.
- RLS isolation tests use signed-in user JWTs (created via `auth.admin.generateLink` then exchanged), not anon key.
- Lessons from prior audit applied: throttle bulk `auth.users` inserts (≤2 concurrent) to avoid PostgREST schema-cache reload windows.

Approve and I'll switch to default mode and run it.
