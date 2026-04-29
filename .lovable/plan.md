## Reject-with-comments + targeted resubmission, with First- and Second-pass acceptance

### Goal
Give reviewers a structured way to **reject specific photos** with comments, send the recipient back to retake **only the rejected items**, and use that round-trip as the source of truth for two operator-trust metrics:

- **First-pass acceptance** — % of submissions accepted with no rejections.
- **Second-pass acceptance** *(sub-stat under it)* — of the submissions that *did* fail first pass, % that were accepted on the very next review (i.e. one rejection round, then approved). This proves "even when it fails, it almost always lands on the second look."

### Data model

**Migration:**
1. `captured_media`: add `review_comment text` and `reviewed_at timestamptz`. Standardize `status` values to `pending | approved | rejected | resubmitted` (no schema change).
2. `submissions`: add `first_pass_status text default 'pending'` (`pending | accepted | rework`) and `second_pass_status text default 'pending'` (`pending | accepted | rework | n_a`). `n_a` = first pass already accepted, so second pass doesn't apply.
3. New table `submission_reviews` (audit trail powering both metrics):
   ```
   id uuid pk, submission_id uuid not null fk -> submissions(id) on delete cascade,
   workspace_id uuid not null, reviewer_id uuid,
   action text check (action in ('rejected','approved')) not null,
   round int not null,                     -- 1 for first review, 2 for second, etc.
   summary_message text,
   rejected_media_ids uuid[] not null default '{}',
   created_at timestamptz default now()
   ```
   RLS mirrors `submissions` (workspace member read+insert).
4. Trigger `set_pass_status` on `submission_reviews` insert:
   - `round=1, action='rejected'` → `first_pass_status='rework'`.
   - `round=1, action='approved'` → `first_pass_status='accepted'`, `second_pass_status='n_a'`.
   - `round=2, action='approved'` → `second_pass_status='accepted'`.
   - `round=2, action='rejected'` → `second_pass_status='rework'`.
5. Trigger `finalize_first_pass_on_review` on `submissions` status → `reviewed`: if `first_pass_status='pending'` (reviewer hit "Mark reviewed" without an explicit review row), insert a synthetic `submission_reviews` (action='approved', round = next round) so metrics stay consistent.
6. Update `requests_inbox_view` to expose `submission_first_pass_status` and `submission_second_pass_status`.

### Reject UX (Reviewer)

In `SubmissionReviewPage` + `ShotCard`:
- Each shot card gets **Approve** / **Reject** buttons.
- **Reject** opens an inline comment field; saving marks the card with a destructive border + "Will be returned for retake."
- Sticky footer banner whenever ≥1 shot is rejected: *"3 shots marked for retake."* with **Send back for resubmission** (primary) and Discard rejections.
- Send opens a confirm dialog with an editable auto-built recipient message (per-shot comments shown read-only). On confirm:
  - Update each rejected `captured_media` row: `status='rejected'` + `review_comment` + `reviewed_at`.
  - Insert one `submission_reviews` row (action='rejected', `round` = current round number).
  - Set `submissions.status='needs_more'` (trigger updates pass statuses).
  - Send a `request_messages` row, `kind='followup'`, body = the assembled message.
- The legacy "Ask for more photos" entry point routes through this same flow.

### Recipient resubmission flow (only what was rejected)

`PublicRecipientPage` + `useChatFlow`:
- After resolving the active submission, query for any `captured_media` with `status='rejected'`. If any exist → **resubmit mode**:
  - Banner: *"{Business name} asked for {N} photo(s) to be retaken."*
  - Queue only the rejected steps. Each step shows the reviewer's `review_comment` as helper text.
  - On retake: insert a **new** `captured_media` (status `pending`, same `submission_id` + `step_id`); flip the prior row to `status='resubmitted'`. (Keeps before/after pairing per step for review.)
  - Skip the questions step.
- Submission then re-enters the reviewer's queue. The next reviewer action (approve all → "Mark reviewed", or another reject round) writes a `submission_reviews` row with `round=2`, which the trigger uses to set `second_pass_status`.

### Dashboard tile

`DashboardPage.tsx`. Replace the heuristic shipped earlier with the authoritative read from the view:

```ts
const decided = requests.filter(r =>
  r.firstPassStatus === "accepted" || r.firstPassStatus === "rework"
);
const firstAccepted = decided.filter(r => r.firstPassStatus === "accepted").length;
const firstPct = decided.length ? Math.round((firstAccepted / decided.length) * 100) : null;

// Second-pass: only counts the submissions that failed first pass and have
// since reached a second-pass outcome.
const secondDecided = requests.filter(r =>
  r.secondPassStatus === "accepted" || r.secondPassStatus === "rework"
);
const secondAccepted = secondDecided.filter(r => r.secondPassStatus === "accepted").length;
const secondPct = secondDecided.length
  ? Math.round((secondAccepted / secondDecided.length) * 100)
  : null;
```

Rendered as one tile with a primary value and a sub-stat:

```text
┌──────────────────────────────────────────┐
│ ShieldCheck  First-pass acceptance       │
│                                          │
│              92%                         │
│                                          │
│ 4 sent back for resubmission             │
│ ─────────────────────────                │
│ 100% accepted on second pass · 4 of 4    │
└──────────────────────────────────────────┘
```

Empty-state copy:
- No reviews yet → value `—`, hint `No reviews yet`, sub-stat hidden.
- No first-pass failures yet → sub-stat reads `No second-pass reviews yet`.
- 1 vs many → "1 sent back for resubmission" / "1 of 1 accepted on second pass".

Implementation: extend `MetricCard` with an optional `subStat?: { label: string; tone?: 'default' | 'success' }` prop rendered as a thin top-bordered row under `hint`. (No new component, additive prop.)

### Out of scope
- No third-pass tracking (`round ≥ 3` still updates `second_pass_status` only; we don't promise a third-pass metric).
- No reviewer reputation, no per-step accept rate.
- No editing of past rejection comments after sending.
- No resubmission of context questions, only photos.

### Files

**Migration (new):**
- `captured_media` columns; `submissions` columns; `submission_reviews` table + RLS; `set_pass_status` trigger; `finalize_first_pass_on_review` trigger; recreate `requests_inbox_view`.

**Frontend types/services:**
- `src/types/photobrief.ts` — add `firstPassStatus`, `secondPassStatus` on `PhotoBriefRequest`; add `reviewComment`, `reviewStatus` on `SubmissionShot`.
- `src/services/requestsService.ts` — map the two new view columns.
- `src/services/submissionsService.ts` — add `rejectShots({ submissionId, items: [{ mediaId, comment }], summaryMessage })` (computes round, writes media updates + `submission_reviews` + followup message); read `review_comment`/`status` into `SubmissionShot`.

**Reviewer UI:**
- `src/features/submissions/components/ShotCard.tsx` — Approve/Reject buttons, inline comment editor, status visuals.
- `src/features/submissions/pages/SubmissionReviewPage.tsx` — sticky rejection footer + send dialog; route the existing "Ask for more photos" button through the new flow.

**Recipient UI:**
- `src/features/capture/pages/PublicRecipientPage.tsx` and `src/hooks/useChatFlow.ts` — resubmit-mode detection, banner, filter to rejected steps, write resubmissions as new `captured_media`, flip prior rows to `resubmitted`.

**Dashboard:**
- `src/components/shared/MetricCard.tsx` — additive `subStat` prop.
- `src/features/workspace/pages/DashboardPage.tsx` — compute first/second pass; render tile with sub-stat.
