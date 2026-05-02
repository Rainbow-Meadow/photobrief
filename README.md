# PhotoBrief

PhotoBrief is a multi-tenant photo-intake workflow app for small businesses.

A workspace user creates a guided photo request, sends a public tokenized link to a recipient, the recipient captures photos through a chat-first flow, AI reviews the media, and the workspace reviews the resulting submission.

## Core data spine

The primary data chain is:

```text
auth.users
  -> profiles.default_workspace_id
  -> business_workspaces
  -> brand_profiles
  -> photo_guides
  -> guide_steps / context_questions
  -> photo_brief_requests
  -> submissions
  -> captured_media
  -> ai_check_results
  -> submission_answers
  -> extracted_details
  -> internal_notes
  -> submission_reviews
  -> request_messages
```

`useAuth` owns the Supabase Auth session. `useCurrentWorkspace` resolves the active workspace from `profiles.default_workspace_id`, loads `business_workspaces`, and merges in the latest `subscriptions` row so plan gates read live billing state.

## Request flow

1. A workspace user creates a request from a launch template, saved guide, or AI-generated draft.
2. `requestsService.create` inserts `photo_brief_requests` with workspace, guide, recipient, channel, and token data.
3. The app builds `/r/:token` and optionally sends it through `messagingService`.
4. Inbox views read from `requests_inbox_view`, which denormalizes guide name, assignee, latest readiness score, pass status, missing items, and last activity.

## Recipient flow

The public recipient page does not require an auth session. It uses `getTokenClient(token)`, which injects `x-request-token` into Supabase requests. RLS policies validate that token through database helpers.

The capture flow:

1. `loadRecipientContext(token)` resolves request, workspace branding, guide, and any rejected media requiring resubmission.
2. `useChatFlow` prompts for photos and questions.
3. On first real photo upload, `PublicRecipientPage` lazily creates a `submissions` row so `captured_media` has a valid parent.
4. Media uploads to the `submission-media` bucket under `{workspaceId}/{requestId}/{uuid}.{ext}`.
5. `captured_media` rows store the storage path, guide step, status, and later AI feedback.
6. Final submit writes recipient context answers to `submission_answers`, marks the request submitted, and triggers `ai-summarize-submission`.

## AI flow

Client UI calls `aiService`; UI components should not call model providers directly.

AI work is performed by Supabase Edge Functions and routed through `_shared/aiModelRouter.ts`, which standardizes task tiers and response envelopes.

Important authorization rule: AI Edge Functions should authorize before model calls. Public recipient calls must include `x-request-token`; workspace calls must be tied to an active workspace member. This protects private submission data and prevents anonymous AI spend.

## Review flow

`submissionsService.getById` hydrates a reviewer-facing `Submission` shape from:

- `submissions`
- `captured_media`
- `extracted_details`
- `internal_notes`
- `submission_answers`

Reviewers can approve, reject, request retakes, assign, add notes, export PDFs, send reminders, and archive. Rejected shots update `captured_media`, insert `submission_reviews`, move the submission to `needs_more`, and are detected by the recipient context loader when the original link is reopened.

## Billing and plan gates

Plan capabilities live in `src/config/planLimits.ts`. The UI reads plan state through `usePlan`, while important limits and feature gates should also be enforced by RLS, database triggers, or Edge Functions.

Stripe checkout and subscription sync live in Supabase Edge Functions. Active subscription state is written to `subscriptions` and mirrored onto `business_workspaces.plan_tier`.

## Known follow-ups

- Add a proper session restore path for the public recipient flow. The app currently saves a small progress snapshot to `sessionStorage`, but full rehydration is not complete.
- Align all billing return URLs. Subscription checkout now returns to `/settings/billing`; top-up checkout and customer portal should use the same route.
- Audit Supabase migrations/RLS policies in full, especially token-scoped public access and plan-enforcement triggers.
- Add tests around recipient submit, answer persistence, token-authorized AI calls, and review hydration.
