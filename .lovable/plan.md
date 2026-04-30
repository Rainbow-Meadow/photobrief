
# Invite-only beta + public waitlist

PhotoBrief stays in beta: public visitors join a waitlist, only invited emails can create accounts. Existing users sign in normally.

## 1. Config flag

New `src/config/access.ts`:

- `PUBLIC_SIGNUP_ENABLED = false`
- `INVITE_ONLY_BETA = true`
- Helper `signupCtaTarget()` → returns `/waitlist` when invite-only, `/auth?mode=signup` otherwise.
- Helper `signupCtaLabel()` → `"Join waitlist"` or `"Start free"`.

All marketing/pricing CTAs read from this — no hardcoded strings.

## 2. Database (one migration)

**`waitlist_entries`**
- `id uuid pk`, `name`, `business_name`, `email citext unique`, `business_type`, `website`, `use_case`, `estimated_monthly_requests`, `notes`, `status text default 'new'` (new/reviewed/invited/rejected/contacted), `source text default 'web'`, `created_at`, `updated_at`
- RLS: anon `INSERT` allowed; `SELECT/UPDATE/DELETE` admin-only via `is_platform_admin()`.

**`beta_invites`** (separate from existing `workspace_invites` which is for team seats)
- `id uuid pk`, `email citext`, `business_name`, `workspace_id uuid null`, `invited_by uuid null`, `token_hash text not null` (sha256), `token_prefix text` (first 8 chars, for admin display), `status text default 'pending'` (pending/accepted/expired/revoked), `expires_at timestamptz default now()+'14 days'`, `accepted_at`, `notes`, timestamps
- Unique partial index on `(email)` where `status='pending'`.
- RLS: admin-only read/write. Acceptance happens through an edge function (service role).

**`platform_admins`** (allowlist; safer than a flag on profiles)
- `user_id uuid pk references auth.users`, `created_at`
- Helper `public.is_platform_admin()` SECURITY DEFINER returning bool.
- Seeded by manual SQL with the user's existing admin email (we'll prompt for which email to seed during build).

## 3. Edge functions (3 new)

- **`waitlist-submit`** (public, JWT off): zod-validate fields, enforce rate-limit by IP + email, dedupe by email (return `{ already: true }` instead of error), insert row, fire `_notify_event` for ops notification. Returns `{ ok, already }`.
- **`invite-validate`** (public, JWT off): given raw token, hash + look up `beta_invites`. Returns `{ valid, email, business_name, reason }` where reason is `expired|revoked|accepted|not_found|ok`. No 500s on miss.
- **`invite-accept`** (public, JWT off): called from signup page after `auth.signUp` succeeds. Verifies token + that `auth.users.email` matches invite email, marks `status='accepted'`, `accepted_at=now()`. Idempotent.
- **`admin-invites`** (JWT on, asserts `is_platform_admin`): create / revoke / resend / mark-waitlist-status. Returns one-time raw token on create (only shown once; copy-link UX).

## 4. Routes (App.tsx)

Add to marketing layout:
- `/waitlist` → `WaitlistPage` (public)
- `/signup` → `SignupPage` (public; reads `?invite=` token)
- `/beta-invite/:token` → `BetaInvitePage` (public landing → forwards to `/signup?invite=...`)

`/invite/:token` stays as-is (team-seat invites; do not break).

Admin:
- `/admin/invites` → `AdminInvitesPage` wrapped in `RequireAuth` + new `RequirePlatformAdmin` guard (renders 404 for non-admins, no leakage).

## 5. Pages

**`WaitlistPage`** — glass design matching brand:
- Headline + subhead per spec, form fields per spec, react-hook-form + zod.
- Submits to `waitlist-submit`. On `already: true` → "Looks like you're already on the list — we'll be in touch."
- On success → success card replacing form.
- Tracks `waitlist_viewed`, `waitlist_submitted`, `waitlist_duplicate`.

**`SignupPage`** — invite-aware:
- No `?invite` token → `<Navigate to="/waitlist" replace />` + `signup_blocked_no_invite` event.
- With token → call `invite-validate`. Invalid/expired/revoked → polished error card with link to `/waitlist` (`invite_invalid` event).
- Valid → render signup form (email pre-filled and **read-only**, name + password). Email mismatch is impossible because the field is locked.
- After `supabase.auth.signUp` → call `invite-accept` → redirect to `/onboarding` (or `/dashboard` if workspace exists).
- Google/Apple OAuth: pass invite token via `state`; on return, the existing redirect-to-dashboard flow runs but we add a `<InviteAcceptanceGuard>` on `/onboarding` that finalizes acceptance if a `pendingInviteToken` is in sessionStorage.

**`BetaInvitePage`** (`/beta-invite/:token`) — small landing that validates and forwards to `/signup?invite=…`.

**`AdminInvitesPage`** — two-tab UI:
- Waitlist: table with filter (status, business type), row actions: mark reviewed/contacted, "Invite this person" (creates beta invite pre-filled).
- Invites: table of beta invites with status, expires, copy-link, revoke, resend (regenerates token).
- All actions go through `admin-invites` edge function.

## 6. CTA updates

Replace every `/auth?mode=signup` and "Start Free / Try Free / Start free" string in:
- `src/components/layout/MarketingLayout.tsx` (desktop + mobile nav)
- `src/pages/Landing.tsx` (hero CTA)
- `src/pages/Pricing.tsx`
- `src/components/pricing/PricingCardGrid.tsx` (free plan CTA → "Join waitlist")
- `src/components/marketing/FinalCtaCard.tsx`
- `src/components/marketing/FirstPassGuaranteeBand.tsx`
- `src/components/marketing/FoundingCustomerBanner.tsx` (founding-pro CTA → `/waitlist?interest=founding-pro` so we capture intent)

All read from `signupCtaTarget()` / `signupCtaLabel()` so flipping the flag flips everything.

`AuthPage`: when `mode=signup` and `INVITE_ONLY_BETA`, redirect to `/waitlist`. Keep sign-in fully functional (Google/Apple/email/demo). Remove the bottom "New to PhotoBrief? Create one" link in invite-only mode; replace with "Don't have an invite? Join the waitlist."

## 7. Auth guard / safety

- `RequireAuth` unchanged — still handles existing users + onboarding loop + backend-unavailable panel.
- New `RequirePlatformAdmin` component checks `platform_admins` membership via a small hook (`usePlatformAdmin`).
- Backend-unavailable behavior preserved (we do NOT block sign-in, only signup).
- Demo account (`demo@photobrief.app`) and existing seed users continue to work — they sign in via the password flow which is untouched. The temp-password / password-reset flow (`/forgot-password`, `/reset-password`) is untouched.

## 8. Analytics

Extend `src/lib/analytics.ts` event union with: `waitlist_viewed`, `waitlist_submitted`, `waitlist_duplicate`, `invite_created`, `invite_accepted`, `invite_invalid`, `signup_blocked_no_invite`. Fire from the relevant pages/functions.

## 9. Email

No automatic invite emails this pass — admin copies the link. Edge function returns the raw token once on creation. We'll wire the existing `_notify_event` queue for a `beta_invite_created` template later behind a `BETA_INVITE_EMAIL_ENABLED` flag (off by default).

## Validation checklist (post-build)

I'll manually walk through:
1. `/` shows "Join waitlist" CTA.
2. `/waitlist` submit → success.
3. Re-submit same email → friendly "already on list".
4. `/signup` (no token) → redirects to `/waitlist`.
5. `/signup?invite=bogus` → polished error + waitlist link.
6. Admin creates invite → copies link → `/signup?invite=…` works once.
7. Reusing accepted invite → blocked with clear message.
8. Existing demo + beta accounts sign in normally.
9. `/dashboard` still requires auth.
10. `/admin/invites` returns 404 for non-admin signed-in users.

## Open question (will ask before building)

Which email should be seeded into `platform_admins`? (We need at least one to access `/admin/invites`.)

## Deliverables

- 1 migration (3 tables + helper function + RLS)
- 4 edge functions (`waitlist-submit`, `invite-validate`, `invite-accept`, `admin-invites`)
- 3 new pages + 1 admin page + 1 guard component + 1 hook
- 1 config file + analytics event additions
- ~7 marketing/pricing files updated to read from config
