# Permanent Per-Tier Seed Users + Live Tier Audit

Two-phase plan. Phase 1 creates 5 fully-realized, **permanent** test accounts (one per plan tier) with rich, tier-appropriate data. Phase 2 (you trigger when ready) walks each account in the live preview to verify real-world functionality.

---

## Phase 1 — Build & Seed (this run)

### Accounts (saved permanently)

| Tier | Email | Password | Industry persona |
|---|---|---|---|
| Free | `seed.free@photobrief.test` | `Seed!Free2026` | Solo handyman trying it out |
| Starter | `seed.starter@photobrief.test` | `Seed!Starter2026` | "Bright Spark Plumbing" — solo plumber |
| Pro | `seed.pro@photobrief.test` | `Seed!Pro2026` | "Northwind HVAC" — small HVAC crew |
| Team | `seed.team@photobrief.test` | `Seed!Team2026` | "Cascade Junk Removal" — 6-person ops team |
| Business | `seed.business@photobrief.test` | `Seed!Business2026` | "Apex Roofing Group" — 3 locations, white-label |

Credentials will be saved to `mem://seed-users` so all future sessions can use them. Existing `qa-*` audit users (5 found) will be left alone or cleaned up — your call (default: leave them).

### What "fully filled out" means per account

Every account gets, scaled to its tier:

**1. Profile + workspace identity (all tiers)**
- Real name, completed onboarding timestamp
- Workspace name, industry, slug
- Brand profile: **AI-generated logo** (uploaded to `brand-assets` bucket), brand color, contact email/phone, intro + completion + request heading copy
- For Pro+: Custom guides; for Business: `custom_domain` set, `hide_photobrief_branding=true`

**2. Subscription row** — correct `plan_tier`, `billing_interval` (mix monthly/annual), `current_period_start/end`, `is_founding_pro` for Pro, sandbox `stripe_customer_id`, `price_id`

**3. Team members** — seed extra `workspace_members` up to (but not exceeding) the seat cap: Free/Starter 1, Pro 3, Team 6, Business 12. Extra seats are real auth users with `seed.{tier}.member{n}@photobrief.test` so team-inbox flows actually work.

**4. Custom guides** (Pro/Team/Business only — gated by trigger)
- 2–4 industry-relevant guides with 4–8 `guide_steps` each (titles, instructions, why_it_matters, ai_checks array, capture_type, overlay_type)
- 2–3 `context_questions` per guide (mix of input types)

**5. Message templates** (Pro/Team/Business — gated)
- Initial / reminder / followup templates with realistic copy

**6. Requests + submissions + media** — volume scaled to tier:

| Tier | Requests | Submitted (with media) | In-progress | Drafts |
|---|---|---|---|---|
| Free | 2 | 1 | 1 | 0 |
| Starter | 8 | 5 | 2 | 1 |
| Pro | 20 | 12 | 5 | 3 |
| Team | 35 | 22 | 8 | 5 |
| Business | 50 | 32 | 12 | 6 |

Each submitted record gets:
- 3–6 `captured_media` rows with **AI-generated reference photos** (uploaded to `submission-media` bucket — covers like meter readings, damage shots, exterior, interior so the gallery looks real)
- `ai_check_results` rows (mix passed/failed) — Free/Starter get basic checks only, Pro+ get advanced
- `extracted_details` (model numbers, addresses, etc.)
- `ai_summary` + `readiness_score` + `next_action`
- `request_messages` (initial sent, 1–2 reminders, sometimes followup) — drives the messaging timeline
- For Pro+: `internal_notes` from teammates
- `usage_events` rows so usage meters show realistic numbers (~30–60% of monthly cap consumed)

**7. Notifications** — recent unread + read `notifications` for each member so the bell icon has content

**8. Tier-specific extras**
- **Starter+**: 1 `message_templates` row (within their cap)
- **Pro**: founding-pro claim + cache update; 5 saved templates
- **Team**: bulk-action-friendly request mix; assignments populated (`assigned_to` filled across team members); shared notes from multiple users
- **Business**:
  - `workspace_api_keys` (1 active, 1 revoked) with realistic `key_prefix`/`key_hash`
  - `webhook_subscriptions` (2 active, mix of events) + a few `webhook_deliveries` rows (mix of 200s and one failure)
  - `workspace_sms_config` populated as verified, with `from_number_friendly`
  - `sms_send_log` with a few delivered messages
  - Custom domain set on workspace

### How it gets executed

- Auth users created via Supabase Admin API (service role) with `email_confirm: true` so they can sign in immediately.
- Logos generated with `google/gemini-2.5-flash-image` (Lovable AI), uploaded to `brand-assets/{workspace_id}/logo.png`.
- Submission photos generated similarly (1 hero shot per submission shared via thumbnail variants — keeps generation cost reasonable while looking real).
- Plan promotion + bypass-trigger seeding done via service role inserts (triggers like `enforce_request_limit` / `enforce_seat_cap` are bypassed for service_role; we still respect caps in the seed counts).
- Throttled to ≤2 concurrent auth inserts to avoid PostgREST schema-cache flaps.

### Memory persistence

After successful seeding, write `mem://seed-users.md` containing:
- All 5 primary emails + passwords
- Member emails per workspace
- Workspace IDs, subscription IDs
- Note: "Permanent test accounts — do not delete. Used for tier audits."

And add a one-liner reference to `mem://index.md` under Memories.

### Verification before declaring Phase 1 done

Automated checks per account:
- Sign-in works (real auth flow, not service role)
- `useCurrentWorkspace` returns the correct plan
- Counts match the table above (requests, submissions, media, notes, templates, members)
- Logo URL resolves (HEAD 200)
- At least one submission per Pro+ account has internal notes + AI summary + extracted details

### Cleanup of prior audit data

The 5 existing `qa-*@photobrief.test` users from the prior audit round will be deleted before seeding to avoid confusion. (If you'd rather keep them, say so.)

---

## Phase 2 — Live Preview Tier Audit (separate, triggered after Phase 1)

Once Phase 1 reports green, you'll tell me to start. Then per tier, in order Free → Starter → Pro → Team → Business:

1. Sign in via the live preview as that tier's primary user
2. Walk every advertised feature in the plan card:
   - Dashboard renders with real data
   - Inbox shows correct request counts; filters/bulk actions behave per tier
   - Open a real submission → review media, AI summary, readiness, internal notes (Pro+), PDF export (per tier's `pdfExport` level)
   - Create-request flow: AI builder (Pro+), template picker (Pro+), guide picker including custom guides (Pro+)
   - Brand settings (Starter+): logo, color, messages render on a public `/r/{token}` page
   - Team settings (Pro+): members visible, invite gate behaves at cap
   - Business-only: API keys page, webhooks list with deliveries, SMS settings verified, custom domain shown
   - Upgrade prompts hidden where appropriate; gate dialogs appear where features are locked
3. Sign out, switch user, repeat
4. Final report: per-tier checklist with pass/fail and screenshots of anything broken

No code changes happen in Phase 2 unless I find a bug — those get fixed and re-verified for the affected tier only.

---

## Technical notes (for the curious)

- Seed runs in default mode using `code--exec` against the Admin API + `psql`/migrations for schema-respecting inserts.
- All seeded photos and logos are AI-generated (no copyright issues) and stored in existing public buckets.
- Triggers we explicitly account for: `enforce_request_limit`, `enforce_seat_cap`, `enforce_custom_guides_plan`, `enforce_internal_notes_plan`, `enforce_message_templates_plan`, `notify_on_request_opened`, `notify_on_submission_received`, `_notify_event` (welcome email — will fire 5×, expected).
- `mem://seed-users.md` is the canonical record; if you ever rotate passwords, that's where to update them.

Approve and I'll switch to default mode and run Phase 1 end-to-end. I'll report back with the verification matrix before we start Phase 2.
