# PhotoBrief database architecture

This repo is two-way linked with the Lovable project and the managed Supabase database. That is a feature: make real changes in this repo/branch, use Lovable preview and the linked Supabase environment to test them, then publish/merge only after preview validation.

Because PhotoBrief is still beta and not yet shipped to external users, the database should be made clean and strict now rather than carrying loose early-prototype conventions forward.

## Domain map

### Identity and tenancy

- `profiles`
- `business_workspaces`
- `workspace_members`
- `brand_profiles`
- `platform_admins`

`business_workspaces` is the tenant root. Tables that are shown in a workspace UI should either directly contain `workspace_id` or be reachable through a parent that does.

### Guides and request templates

- `photo_guides`
- `guide_steps`
- `context_questions`
- `message_templates`

Guides may be global templates or workspace-owned custom guides. Steps and questions are ordered child records.

### Request and recipient intake

- `photo_brief_requests`
- `submissions`
- `submission_answers`
- `captured_media`

A request is the business-side ask. A submission is the recipient response. Captured media is individual evidence. Submission answers store durable recipient context-question answers.

### AI and review output

- `ai_check_results`
- `extracted_details`
- `submission_reviews`
- `internal_notes`

`captured_media.ai_feedback` may keep the full AI envelope, but queryable review facts should be copied into typed columns or child tables where possible.

### Messaging and notifications

- `request_messages`
- `notifications`
- `email_send_log`
- `email_send_state`
- `email_unsubscribe_tokens`
- `email_suppressions`
- `sms_send_log`
- `sms_suppressions`
- `workspace_sms_config`

`request_messages` is the durable per-request activity timeline. Provider-specific send logs are operational records.

### Billing and usage

- `subscriptions`
- `usage_events`
- `request_credit_packs`
- `founding_pro_claims`
- `founding_pro_cache`

`subscriptions` is the billing source of truth mirrored into `business_workspaces.plan_tier` for fast feature gating. Credit packs and usage events should be append/audit friendly.

### Growth/admin surfaces

- `waitlist_submissions`
- `beta_invites`
- admin/invite support tables

These are not part of the core request/submission workflow and should not be required for normal app operation.

## Relationship rules

1. Every workspace-owned table should have either a direct `workspace_id` foreign key or a clear parent chain to one.
2. If a table duplicates `workspace_id` for RLS/query performance, a trigger should verify it matches the parent request/submission.
3. Lifecycle/status values used by application logic should be constrained by enum or check constraint.
4. Provider IDs that must be idempotent, such as Stripe checkout sessions or payment intents, should have unique indexes before launch.
5. Public-token flows should authorize through dedicated database helpers/RLS. Edge Functions must authorize before using service-role reads or paid AI calls.

## Current PR database behavior

This PR applies real database work on the preview branch:

- `20260501120000_add_submission_answers.sql` creates durable recipient answer storage.
- `20260501130000_database_scale_hardening.sql` adds relationship constraints, status-domain constraints, tenant-consistency triggers, and query-path indexes.
- `20260501140000_beta_schema_cleanup.sql` converts loose lifecycle text columns to enum types, validates beta-era relationships, adds production-grade uniqueness rules, introduces token-hash foundations, adds data-quality checks, and standardizes `updated_at` triggers.

The cleanup intentionally keeps app-facing table names stable while making the database strict enough to scale from the start.

## Preview validation checklist

After Lovable/Supabase preview applies this branch, run these checks and smoke tests before publishing/merging.

### Data integrity checks

```sql
-- Request messages must belong to the same workspace as their request.
select rm.id, rm.request_id, rm.workspace_id, r.workspace_id as actual_workspace_id
from public.request_messages rm
join public.photo_brief_requests r on r.id = rm.request_id
where rm.workspace_id <> r.workspace_id;

-- Internal notes must belong to the same workspace as their submission.
select n.id, n.submission_id, n.workspace_id, s.workspace_id as actual_workspace_id
from public.internal_notes n
join public.submissions s on s.id = n.submission_id
where n.workspace_id <> s.workspace_id;

-- Submission reviews must belong to the same workspace as their submission.
select sr.id, sr.submission_id, sr.workspace_id, s.workspace_id as actual_workspace_id
from public.submission_reviews sr
join public.submissions s on s.id = sr.submission_id
where sr.workspace_id <> s.workspace_id;

-- Submission answers must align submission, request, and workspace.
select sa.id, sa.submission_id, sa.request_id, sa.workspace_id,
       s.request_id as actual_request_id,
       s.workspace_id as actual_submission_workspace_id,
       r.workspace_id as actual_request_workspace_id
from public.submission_answers sa
join public.submissions s on s.id = sa.submission_id
join public.photo_brief_requests r on r.id = sa.request_id
where sa.request_id <> s.request_id
   or sa.workspace_id <> s.workspace_id
   or sa.workspace_id <> r.workspace_id;

-- Provider IDs should be unique before launch.
select stripe_checkout_session_id, count(*)
from public.request_credit_packs
where stripe_checkout_session_id is not null
group by stripe_checkout_session_id
having count(*) > 1;

select stripe_payment_intent_id, count(*)
from public.request_credit_packs
where stripe_payment_intent_id is not null
group by stripe_payment_intent_id
having count(*) > 1;

select stripe_subscription_id, count(*)
from public.subscriptions
where stripe_subscription_id is not null
group by stripe_subscription_id
having count(*) > 1;
```

### Product smoke tests

1. Create a request.
2. Open/copy the public `/r/:token` link.
3. Submit recipient photos and context answers.
4. Confirm media AI review still runs.
5. Confirm submission summary uses saved answers.
6. Confirm reviewer page shows customer answers.
7. Reject a photo and reopen the public link to confirm resubmission still narrows to rejected steps.
8. Confirm request messages/reminders still insert correctly under relationship/consistency triggers.
9. Confirm billing checkout/top-up/portal routes return to `/settings/billing`.
10. Confirm onboarding still creates a workspace/profile/default workspace without violating new FKs or enums.

## Post-preview type generation

After Lovable/Supabase preview applies migrations, regenerate Supabase types so app code can stop using casts for new tables/enums:

```bash
supabase gen types typescript --project-id <project-id> --schema public > src/integrations/supabase/types.ts
```

Run CI after regenerating types.

## Future migration: fully remove raw public request tokens

This PR adds `token_hash` and `token_prefix`, backfills them, and updates `request_id_for_token()` to prefer hashed token comparisons while still supporting the legacy raw `token` column.

After preview validation, the next security migration can remove raw-token dependency:

1. Update app/server code so new request links are generated from a one-time token and only `token_hash`/`token_prefix` are stored.
2. Stop selecting raw `token` from internal list/detail views unless absolutely needed.
3. Update RLS helpers to remove fallback raw-token comparison.
4. Drop or heavily restrict the raw `token` column.
