
# Beta Account Preconfiguration — 21 MA Businesses

## What's in the spreadsheet (parsed)

- Sheet: **Verified Email Targets** (header on row 3) + a **Notes** sheet
- **21 valid rows**, all with Business Name + Business Email
- **Junkpire is included** (row 1)
- **Logo/Color column is empty for every row** — no embedded logos, no URLs, no hex colors
- 5 priority levels are condensed to: `1 - High`, `2 - Strong`, `3 - Good`
- Suggested Initial Guides span 10 unique labels across Junk Removal, Yard/Landscape, Pest, Plumbing, Appliance Repair, Appliance/HVAC

Because the spreadsheet has no logos or brand colors, every workspace will get an **initials placeholder logo** and a default brand color, and the export will record `Logo Imported = No (not in spreadsheet)`. We'll attempt a best-effort favicon fetch from each Website to use as the logo; rows where that fails fall back to initials.

## Step 1 — Preview & approval (in-app)

A new internal admin page at `/app/admin/beta-import` (visible only to the owner of the current workspace, with a hard-coded allowlist by email of the project owner) will:

1. Let you upload the same spreadsheet
2. Parse it client-side and show:
   - Sheet names, detected columns, row count
   - Preview table: Business Name · Email · Suggested Guide · Priority · Logo? (always "No — not in sheet, will try favicon")
   - Validation banners: "Junkpire present ✓", "21/21 rows have emails ✓", "0/21 rows have logos — favicon fallback will be used"
3. Show a big **"Create 21 beta accounts"** button that is disabled until you tick a confirmation checkbox

Nothing is created until you click the button.

## Step 2 — Backend creation (edge function)

A new edge function `beta-preconfigure-accounts` (service-role, owner-allowlisted) takes the parsed rows and, for each one:

1. **User** — `admin.auth.admin.listUsers()` to check for the email; if absent, `createUser({ email, password: <generated 20-char>, email_confirm: true, user_metadata: { must_change_password: true, beta_source: "ma_beta_outreach" } })`. Existing emails are skipped and recorded as `Already existed`.
2. **Workspace** — insert into `business_workspaces` (name = Business Name, plan_tier = `pro`, industry derived from Business Category) and add owner as `workspace_members` (role `owner`).
3. **Brand profile** — insert/update `brand_profiles` with primary color `#0A6BFF` (default — no colors in sheet) and a tasteful intro/completion message. Logo: best-effort favicon fetch from the Website (`https://www.google.com/s2/favicons?domain=...&sz=128`), upload to `brand-assets` bucket, set `logo_url`. On any failure → leave logo empty (UI renders initials).
4. **Subscription** — insert `subscriptions` row with `plan_tier = pro`, `status = trialing`, `trial_ends_at = now + 60 days`, `environment = sandbox`, `current_period_end = now + 60 days`. (See "Why Pro instead of `beta_pro_trial`" below.)
5. **Beta metadata** — new sidecar table `workspace_beta_metadata` stores: `source`, `imported_from_spreadsheet`, `beta_status`, `created_for_outreach`, `business_address`, `business_phone`, `website`, `business_type`, `why_chosen`, `account_setup_priority`, `suggested_initial_guide`, `logo_source`, `logo_import_status`. This avoids polluting `business_workspaces`.
6. **Starter guide** — match `Suggested Initial Guide` against the curated `guideTemplates` by fuzzy name; if a match exists, clone it into `photo_guides`/`guide_steps`/`context_questions` for the workspace. Otherwise build one of the 5 short hand-written starter guides (junk removal, yard/landscape, pest, plumbing, appliance) with 4–6 required steps, 3–5 questions, AI checks, missing-item rules, readiness scoring, completion message — exactly as specified.

The edge function returns `{ rows: [...] }` with one entry per business including `userId`, `workspaceId`, `tempPassword` (only for newly created users), `guideName`, `logoStatus`, `notes`.

### Why `pro` instead of a new `beta_pro_trial` plan tier
The DB `plan_tier` enum is fixed at `free|starter|pro|team|business` and adding a value requires a migration that's risky to run mid-product. We use `plan_tier = pro` plus `subscriptions.status = 'trialing'` and `trial_ends_at = now + 60 days`, and store the human-readable label `beta_pro_trial` in `workspace_beta_metadata.beta_plan_label`. The export shows `beta_pro_trial` exactly as requested.

## Step 3 — Excel export

After the function returns, the admin page generates `PhotoBrief_Beta_Account_Creation_Export.xlsx` in-browser using `xlsx` (already in deps via shadcn? — will add if missing) with two sheets:

- **Accounts** — exactly the 24 columns you listed
- **Import Summary** — the 10 summary fields you listed

Temp passwords appear ONLY in this Excel file. They are returned once by the edge function, never persisted in any DB column, never logged, never shown in app UI after the export downloads. Outreach emails are also generated locally from a template and embedded as the `Outreach Subject` / `Outreach Message` columns — nothing is sent.

## Outreach email template

Uses the exact wording you provided, with `{{Business Name}}`, `{{Suggested Initial Guide}}`, `{{login_url}}` (= `https://app.photobrief.ai/auth`), `{{Business Email Address}}`, and `{{temp_password}}` substituted per row. For `Already existed` rows, the password line is omitted and replaced with `Use your existing PhotoBrief login.`

## Files to add / change

```text
New
  supabase/migrations/<ts>_beta_metadata.sql       workspace_beta_metadata table + RLS
  supabase/functions/beta-preconfigure-accounts/index.ts   admin job
  src/features/admin/pages/BetaImportPage.tsx      preview + create + export UI
  src/features/admin/lib/parseBetaSheet.ts         xlsx parsing
  src/features/admin/lib/starterGuides.ts          5 hand-written fallback guides
  src/features/admin/lib/outreachEmail.ts          template renderer
  src/features/admin/lib/exportXlsx.ts             writes the export workbook
Edited
  src/App.tsx                                      route + owner allowlist guard
  src/components/layout/AppSidebar.tsx             "Beta Import" link (owner only)
  package.json                                     + xlsx dep if missing
```

## Security & guarantees

- Edge function checks the caller's JWT against an env-var owner allowlist (`BETA_IMPORT_ALLOWED_EMAILS`) before doing anything
- Temp passwords: generated with `crypto.getRandomValues`, returned once, never stored
- No outreach emails are sent — generation only
- Existing users are skipped, never overwritten
- Logo fetch failures don't block account creation; they're recorded in the export

## What I'll ask you to confirm before clicking "Create"

1. The 21-row preview table looks right and includes Junkpire
2. Default brand color `#0A6BFF` is acceptable since the sheet has no colors (or pick one)
3. Login URL to embed in outreach: `https://app.photobrief.ai/auth` (confirm)
4. Owner email allowlist for the admin page: I'll use the email on your current logged-in account — confirm or provide one

Once you approve this plan I'll switch to build mode, ship the migration + edge function + admin page, you upload the same spreadsheet on `/app/admin/beta-import`, click Create, and download the Excel file.
