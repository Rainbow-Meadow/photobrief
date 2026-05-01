## Goal

When someone joins the waitlist, send two emails:
1. A beautifully branded **confirmation email** to the person who just signed up.
2. An **internal notification** to `hello@rainbow-meadow.org` with their submission details.

Both go through Lovable's existing email infrastructure (already verified on `notify.photobrief.ai`).

## What gets built

### 1. New transactional email template: `waitlist-confirmation`
File: `supabase/functions/_shared/transactional-email-templates/waitlist-confirmation.tsx`

- React Email component matching the existing PhotoBrief brand style used in `workspace-welcome.tsx` (electric blue `#0A6BFF` accent, navy heading `#101828`, white background, SF/Inter system font, 12px rounded button).
- Friendly greeting using the recipient's first name.
- Short copy explaining: they're on the list, beta seats are limited, we'll reach out personally when their seat is ready.
- "What happens next" section (3 short bullets: review → invite email → guided onboarding).
- Subtle CTA button linking back to `https://photobrief.ai` ("Visit photobrief.ai") — no false dashboard promise since they don't have access yet.
- Closing line inviting them to reply with questions.
- Subject: `You're on the PhotoBrief waitlist`.
- Preview text: `Thanks for joining — here's what happens next.`

### 2. New transactional email template: `waitlist-admin-notification`
File: `supabase/functions/_shared/transactional-email-templates/waitlist-admin-notification.tsx`

- Plain, info-dense internal layout (no marketing styling — simple labeled rows).
- Shows: name, email, business name, business type, website, use case, estimated monthly requests, notes, source, signup time.
- Subject (function): `New waitlist signup: {name} ({business_name || email})`.
- No unsubscribe footer concerns — system handles it; this is fine since it's a 1:1 transactional alert to one operator address.

### 3. Register both templates
File: `supabase/functions/_shared/transactional-email-templates/registry.ts`

Add imports + entries for `waitlist-confirmation` and `waitlist-admin-notification`.

### 4. Wire sends into `waitlist-submit`
File: `supabase/functions/waitlist-submit/index.ts`

After a successful insert (and only on first-time signup, not the dedupe `already` path):
- Invoke `send-transactional-email` for `waitlist-confirmation` → `recipientEmail = email`, `idempotencyKey = waitlist-confirm-{entryId}`, `templateData = { name }`.
- Invoke `send-transactional-email` for `waitlist-admin-notification` → `recipientEmail = "hello@rainbow-meadow.org"`, `idempotencyKey = waitlist-admin-{entryId}`, `templateData = { all submitted fields + createdAt }`.
- Both calls wrapped in try/catch — email failure must NOT fail the waitlist submission.
- Capture the inserted row's `id` by adding `.select('id').single()` to the insert.

### 5. Deploy
Deploy `send-transactional-email` (picks up new templates from the registry it imports) and `waitlist-submit`.

## Out of scope
- No changes to existing templates, the waitlist form UI, or DB schema.
- No marketing/drip sequences — these are strictly transactional (1:1, triggered by the user's own action / one operator alert per signup).
