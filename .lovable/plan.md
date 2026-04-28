
# PhotoBrief — full-build audit & completion plan

I read the project bible in your Drive (README, MANIFEST, all 13 numbered folders — product brief, principles, decisions, pricing, workflows, roles, requirements, entity schema, AI behavior, prompt contracts, readiness scoring, image-quality checks, page specs, component inventory, design system, microcopy, recipient flow, full chat-first set, service architecture, QA plan, planLimits/types/guideTemplates configs) and walked the current codebase + Cloud schema.

## Where the build stands today

**Solid (matches the spec):**
- Tech foundation: Vite + React 18 + TS + Tailwind, Lovable Cloud, RLS-correct schema for workspaces, brand, guides, requests, submissions, captured media, AI checks, notes, notifications, subscriptions, usage events, founding-pro claims.
- Auth: Supabase email+password, demo login button, `handle_new_user` trigger seeds workspace + member + brand + free subscription + profile.
- Plan + gating model: `planLimits.ts` is well-structured and matches `01_Strategy/02_pricing_and_plan_limits.md`; `usePlan` hook is workspace-aware; DB enforces request cap via `enforce_request_limit` trigger and `current_period_usage`.
- Billing: Stripe products/prices + embedded checkout + customer portal + `payments-webhook` are wired through the gateway shared utility.
- Marketing: Landing (8-section refactor done), Pricing (PricingCardGrid, Founding Pro), MarketingLayout.
- App shell: DashboardLayout, AppSidebar, NotificationBell, PageHeader, BrandMark.
- Recipient capture: chat-first scaffolding (ChatThread, PhotoPromptCard, CaptureUploadCard, AIFeedbackMessage, RetakeDecisionCard, QuestionCard, ReviewSummaryCard, SubmitConfirmationCard, RecipientBrandingContext, useChatFlow).
- Brand settings: just rebuilt with logo upload + color + messaging + contact + live preview, persisting to `brand_profiles`.
- Guides: GuideLibrary / GuideDetail / GuideBuilder pages exist.
- Requests: Inbox + CreateRequest (Template / AI modes) + RequestDetail + RequestDraftPreview exist.
- Submissions: SubmissionReview with shots, notes, activity timeline, ask-for-more dialog.
- Workspace: Onboarding, Dashboard, Team settings pages exist.

**Critical gap — almost all reads are still mock data.**
- `requestsService`, `guidesService`, `submissionsService`, `workspaceService`, `notificationService`, `useUsage`, `useFoundingPro` read from `src/config/mockData.ts`.
- The DB tables exist with correct RLS but nothing writes/reads them yet, so: creating a request doesn't actually create a row, the inbox doesn't show real submissions, the recipient page can't actually load a real request token, capture uploads don't reach storage, AI checks aren't persisted, usage isn't counted against the plan trigger in real time.

**Other gaps vs. spec:**
- No public storage bucket for captured media; recipient uploads have nowhere to go.
- No edge function for the AI calls (`analyzeCapturedMedia`, `generateSubmissionSummary`, `generateGuideFromPrompt`, `generateFollowupRequest`) — currently a client-side mock service. Spec calls for Lovable AI (Gemini/GPT-5) via edge function with the JSON prompt contracts in `05_AI_System/02_prompt_contracts.md`.
- Recipient page route `/r/:token` likely renders against mock — no token RLS path is exercised. The DB has `request_id_for_token()` and policies that read the `x-request-token` header, but the client never sends it.
- No reminder / follow-up sending (email). No PDF export. No assignments persisted. No team invite flow. No white-label toggle. No custom domain. No API/webhooks. No SMS.
- No password reset page (`/reset-password`). No leaked-password (HIBP) protection enabled.
- No real-time on submissions / notifications.
- No data retention job (spec calls for plan-based history caps: 7d / 30d / 12m / 2y / forever).

## What this plan delivers

Four phases, each independently shippable. Each phase ends with the app actually working end-to-end at that level of completeness — no "wire it up later" scaffolding.

---

### Phase 1 — Cut over to Lovable Cloud (kill the mocks)

Goal: every screen reads/writes the real DB; the recipient flow works against a real token.

1. **Storage**
   - Create `submission-media` public-read bucket; RLS lets workspace members read their workspace's folder; recipients can insert into `submissions/{request_id}/...` while their token is active.
   - (Already have `brand-assets`.)

2. **Services → Cloud**
   Replace these services with Supabase queries (keep the same exported shape so callers don't churn):
   - `workspaceService.current()` → reads `business_workspaces` + `brand_profiles` + active `subscriptions` for `auth.uid()`.
   - `guidesService` → reads `photo_guides` + `guide_steps` + `context_questions` (templates: `is_global_template = true`; workspace guides: `workspace_id = current`).
   - `requestsService` → CRUD on `photo_brief_requests`; `getByToken` uses the public token RLS path with `x-request-token` header.
   - `submissionsService` → reads `submissions` + `captured_media` + `ai_check_results` + `extracted_details` + `internal_notes`.
   - `notificationService` → reads/writes `notifications`.
   - `useUsage` → reads `usage_events` via `current_period_usage` RPC.
   - `useFoundingPro` → reads `founding_pro_remaining()` RPC.
   - `useRequests/useGuides/useSubmissions` become React Query hooks (TanStack Query is already in deps).

3. **Recipient page (`/r/:token`)**
   - Public route that, given a token, sets a per-request supabase client header `x-request-token` and reads request + guide + steps + brand profile.
   - Submits captured media to storage, inserts `captured_media` rows under the token RLS, creates the `submissions` row on submit.

4. **Seed real templates**
   - Migration: insert the launch guide families from `04_Guide_Library/01_guide_taxonomy.md` (Service Quote Intake, Property Proof, Product Support, Sales Listing, Custom Intake) as `is_global_template = true` rows with steps + questions, mirroring `08_Config_Blueprints/guideTemplates.example.ts`.

5. **Realtime**
   - Enable `supabase_realtime` on `photo_brief_requests`, `submissions`, `notifications`. Subscribe in inbox + dashboard + bell.

6. **Delete `src/config/mockData.ts` and `mockAiService.ts`** once nothing imports them.

---

### Phase 2 — AI gateway + persistence

Goal: real AI behavior matching `05_AI_System` prompt contracts.

1. **Edge function `ai-analyze-media`**
   - Inputs: `submission_id`, `step_id`, `media_url`, `expected_capture_type`, `overlay_type`, `recipient_note`.
   - Calls Lovable AI Gateway (`google/gemini-2.5-flash` for cost; `gpt-5-mini` fallback) with the JSON contract from `02_prompt_contracts.md` → returns `quality_status / quality_score / shot_match_score / issues / feedback_to_recipient / business_flag_message / extracted_details / suggested_fix`.
   - Persists to `ai_check_results` + updates `captured_media.ai_feedback`, inserts rows into `extracted_details` when present.

2. **Edge function `ai-summarize-submission`**
   - Inputs: `submission_id`. Aggregates steps + checks + answers, calls `gemini-2.5-pro`, writes `submissions.ai_summary / readiness_score / next_action`. Computes the readiness blend per `03_readiness_scoring.md` (45/20/15/15/5).

3. **Edge function `ai-generate-guide`** (Pro-gated)
   - Powers AI Request Builder + Guide Generator. Server-checks plan via `subscriptions`. Returns the structured draft schema the client already renders.

4. **Edge function `ai-generate-followup`**
   - Generates the polite "we still need X" message + a token-resumable link for missing-shot follow-up.

5. **Wire the chat flow**
   - `useChatFlow` calls `ai-analyze-media` after each capture and surfaces the coach copy from `01_ai_behavior_spec.md`'s "Good recipient feedback" section.

---

### Phase 3 — Plan enforcement, reminders, PDF, team

Goal: every Pro-only feature in `01_Strategy/02_pricing_and_plan_limits.md` is gated server-side, not just client-side.

1. **Server-side gating**
   - DB triggers on `photo_guides` (custom guides require Pro+), `internal_notes` (Pro+), `workspace_members` insert (cap by plan seat limit).
   - Edge function gates: AI generators check plan before invoking AI. Return 402 with required plan name; UI shows existing `UpgradePromptCard`.

2. **Reminders & follow-up**
   - Edge function `send-recipient-message` (Resend connector — already linked? if not, the connector picker). Sends initial request link, reminder, and AI-generated follow-up. Writes to a new `request_messages` table (id, request_id, kind, sent_at, body).
   - "Send reminder" button on RequestDetail; scheduled reminder via DB cron (`pg_cron` already available in Supabase) at T+24h on `sent` requests with no submission.

3. **Branded PDF export** (Pro+)
   - Edge function `export-submission-pdf` builds a PDF (jsPDF or pdf-lib in Deno) using brand color/logo, AI summary, readiness, extracted details, photos in step order, answers. Returns signed URL.
   - Free/Starter PDFs include "Made with PhotoBrief" footer; Pro+ are clean; Business is white-label.

4. **Team & assignments**
   - `workspace_members` invites by email (edge function creates pending row, sends email with magic link). Acceptance flow.
   - Assign a request/submission to a member; `assigned_to` is already on the schema. Filter inbox by assignee.

5. **Saved message templates** (Pro+)
   - New table `message_templates` (workspace_id, name, body, kind). Picker on Create Request.

6. **Notifications**
   - DB trigger inserts a `notifications` row when: submission received, AI review completed, more-photos requested, recipient opened link, reminder sent. Bell already subscribes; Phase 1 added realtime.

---

### Phase 4 — Operational polish & launch surfaces

1. **Auth completeness**
   - `/reset-password` page (recovery flow per Lovable cloud auth rules).
   - Enable HIBP leaked-password check.
   - Add Google OAuth sign-in option.

2. **Public surfaces alignment**
   - Verify Landing/Pricing match `06_UX_UI/01_page_specs.md` and `04_microcopy.md` exactly. Wire "Start Free" → signup. Add `/demo` video placeholder, testimonials section.
   - Footer: legal links, privacy/security points from `09_Operations/01_privacy_security_checklist.md`.

3. **Data retention** (per plan)
   - Daily DB cron: archive/delete submissions older than the plan's history window (Free 7d, Starter 30d, Pro 12m, Team 2y, Business unlimited).

4. **White-label & custom domain** (Business)
   - White-label toggle hides PhotoBrief branding from recipient page + PDFs.
   - Custom domain: docs page explaining DNS + per-workspace `custom_domain` column already implied by spec; map subdomain via Cloudflare/Vercel-style instructions (manual onboarding to start, per `04_roadmap.md` Phase 4).

5. **API & webhooks** (Business)
   - Generated workspace API key (hashed, in new `workspace_api_keys` table). Edge function `public-api/v1/*` for `requests.create`, `requests.list`, `submissions.get`, `submissions.export_pdf`.
   - Outbound webhooks on `submission.created`, `submission.reviewed`.

6. **QA pass** against `09_Operations/02_QA_test_plan.md` covering: recipient flow on iOS Safari + Android Chrome, plan caps, RLS scoping (members can't read other workspaces, recipients can't escalate via token), PDF rendering, email deliverability, realtime updates, retention job, demo login.

---

## Suggested order if you want to ship value fast

```text
Phase 1  (Cloud cutover + recipient e2e)        ~ largest single chunk
Phase 2  (Real AI + persisted checks)
Phase 3  (Gating + reminders + PDF + team)
Phase 4  (Polish, retention, white-label, API)
```

Phase 1 alone moves the app from "demoable mock" to "real product the founding-pro betas in `10_Go_To_Market/03_founding_pro_offer.md` can use." The other phases can land week-by-week.

## Out of scope for this plan (keep for later)

- SMS sending (spec lists it as Phase 5 / nice-to-have).
- Native iOS/Android apps.
- Real OCR model fine-tuning (Gemini vision is good enough for v1).
- Multi-language recipient flow.
- Marketplace integrations (CRM, job-management) — Business-tier follow-on.

---

If this shape works, I'll start with **Phase 1**: storage bucket + service cutover + recipient `/r/:token` end-to-end + global template seed. Approve and I'll switch to build mode.
