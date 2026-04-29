## Replace "Avg. readiness" with a more actionable quality metric

### Why
The current **Avg. readiness** tile on the Dashboard averages a 0–100 readiness score across all submissions. Two problems:
- It's an abstract score — owners can't tell what to *do* with "73".
- It double-counts what the inbox already shows per-row via the `ReadinessScoreBadge`.

A more useful operator metric is **First-pass acceptance** — what share of submissions arrived complete enough that no follow-up / resubmission was needed. It directly answers "is my brief working, or am I chasing customers?"

### What changes

**Dashboard tile (the only place "Avg. readiness" is surfaced):**

Replace the 5th `MetricCard` in `src/features/workspace/pages/DashboardPage.tsx`:

- **Label:** `First-pass acceptance`
- **Value:** `${pct}%`  (e.g. `82%`)
- **Hint:** `${needsRework} need${s} resubmission` (e.g. `3 need resubmission`) — falls back to `No submissions yet` when the denominator is 0.
- **Icon:** swap `Gauge` → `ShieldCheck` (acceptance feel; already used elsewhere in the app).

**Calculation** (uses data already on `PhotoBriefRequest`, no schema change):

```
const submitted = requests.filter(r =>
  r.status === "submitted" || r.status === "in_progress" || r.status === "needs_customer_action"
  ? r.readinessScore !== undefined
  : false
);
// "Accepted on first pass" = submission exists, no missing items, readiness ≥ 80
const accepted = submitted.filter(r =>
  (r.readinessScore ?? 0) >= 80 && (!r.missingItems || r.missingItems.length === 0)
);
const needsRework = submitted.length - accepted.length;
const pct = submitted.length ? Math.round((accepted.length / submitted.length) * 100) : null;
```

If `pct === null` show `—` as the value and `No submissions yet` as the hint, matching the empty-state convention used by the other tiles.

### Out of scope
- No DB / view changes — `readiness_score` and `missing_items` are already on `requests_inbox_view`.
- The per-row `ReadinessScoreBadge` in the inbox table stays (it's per-submission and still useful at the row level). Only the aggregate tile is replaced.
- No marketing copy touches "completeness" — the term doesn't appear in marketing.

### Files
- `src/features/workspace/pages/DashboardPage.tsx` — update `metrics` memo (rename `avgReadiness` → `firstPassPct` + `needsRework`), swap the `MetricCard` props, swap `Gauge` import for `ShieldCheck`.
