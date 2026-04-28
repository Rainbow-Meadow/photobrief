
# Adopt PhotoBrief Template Directory as Source of Truth

The uploaded workbook contains the canonical structure: **5 topline categories**, **27 nested categories**, **68 streamlined guides**, **277 guide steps**, **264 context questions**, and **14 capture archetypes**. The current app has only 16 seeded guides and uses a different category vocabulary (`service_quote`, `property_proof`, etc.). This plan aligns the database, types, configs, and AI logic with the workbook.

## What changes

### 1. Database schema (migration)

- **Extend `capture_type` enum** — workbook uses only `photo`, `label`, `document` (already supported; no change needed beyond verification).
- **Verify `overlay_type` enum** — workbook uses 10 values, all already present in our enum. ✅
- **Verify `ai_check_type` enum** — workbook uses 13 values, all already present. ✅
- **Update `topline_category` enum** to match the workbook labels exactly (rename existing 5 values):
  - `service_quote_intake` → `field_service_quote_intake`
  - `property_proof_records` → `property_realestate_claims`
  - `product_support_claims` → `commerce_warranty_resale`
  - `sales_marketing_content` → `marketing_content_capture`
  - add new: `care_health_living_systems`
  - drop: `custom_business_intake` (workbook has no equivalent)
- **Add `workflow_type` column** to `photo_guides` (text, nullable) so guides can declare their archetype (`service_repair`, `equipment_service`, `quote_scope`, `proof_claim`, `property_intake`, `condition_report`, `label_proof`, `listing`, `marketing_capture`, `care_diagnostic`, `care_intake`, `vehicle_service`, `vehicle_body`, `before_after`).
- **Add `recommended_plan_tier` column** to `photo_guides` (text, nullable) to mirror the workbook's `Free/Starter/Pro/Team/Creator` recommendations.
- **Add `reason_to_ask` column** to `context_questions` (text, nullable) — documented in the workbook for each question.

### 2. Seed data (insert via insert tool, not migration)

- **Delete the existing 16 global guides** and their child rows (steps + questions).
- **Insert the full workbook**: 68 guides → 277 steps → 264 questions, all `is_global_template = true`, mapped to the 5 topline categories and 27 nested categories. Each guide carries `workflow_type`, `estimated_time_minutes`, and `recommended_plan_tier` from the workbook.

### 3. TypeScript types (`src/types/photobrief.ts`)

- Replace `CuratedCategory` union with the 5 new topline values.
- Add a `WorkflowType` union (14 archetypes).
- Extend `PhotoGuide` with `workflowType`, `nestedCategory`.
- Extend `ContextQuestion` with `reasonToAsk`.

### 4. Config files

- **`src/config/curatedCategories.ts`**: rebuild with the 5 new topline categories + their workbook descriptions and icons. Add a `nestedCategories.ts` that lists the 27 nested categories grouped by topline (used for filter chips in the Library).
- **`src/config/guideTemplates.ts`**: regenerate from the workbook so the local fallback matches the DB. (Auto-generated via a one-off Node script at plan-execution time; the file ends up ~3-4× longer.)
- **`src/config/captureArchetypes.ts`** (new): export the 14 archetype definitions (min steps, required pattern, optional module rule, typical extracted details). The AI summarizer and step builder will use this.

### 5. AI logic updates

- **`src/services/aiService.ts`**: replace the 6-keyword fallback matcher with a workflow-type aware matcher that scores against all 68 guides using guide name + nested category + workflow keywords. When the AI gateway is available, pass the workflow archetype constraints (min steps, required capture pattern) so generated drafts conform to the workbook standards.
- **`supabase/functions/ai-analyze-media/index.ts`**: pass the step's `overlay_type` and the guide's `workflow_type` into the Gemini prompt so the model knows which capture archetype it is validating against.
- **`supabase/functions/ai-summarize-submission/index.ts`**: include the archetype's `typical_extracted_details` so the readiness score and `missing_items` align with what the workbook expects (e.g. a `service_repair` submission should always extract `visible_issue_type`, `location_or_asset`, `safety_flag`, `relevant_label_or_control`).

### 6. UI consumers (no behavior change, just relabel)

- `GuideLibraryPage`: render the 5 new topline category sections; add nested-category filter chips.
- `RequestsInboxPage` template filter: still works (reads from `guideTemplates`).
- `TemplatePicker`: groups by topline → nested category for easier scanning across 68 templates.

## Out of scope

- Pet/Vet/Living-systems wording compliance review (workbook flags this as needing "careful wording" — we'll seed as-is and surface a follow-up task).
- Surfacing `recommended_plan_tier` as a paywall (current request limits already enforce plan caps).

## Technical notes

- The topline enum rename uses `ALTER TYPE ... RENAME VALUE` (Postgres 10+) — non-destructive; `ADD VALUE` for the new `care_health_living_systems`.
- All seed data is generated by a one-off Node script that reads `/tmp/templates.xlsx` and emits both an SQL `INSERT` batch (run via the insert tool) and the regenerated `guideTemplates.ts`. The script is not committed.
- Existing custom (non-global) guides in tenant workspaces are untouched.
- RLS policies are already permissive enough for global templates (`workspace_id IS NULL`) — no policy changes needed.
