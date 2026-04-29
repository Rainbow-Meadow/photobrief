## Goal

Make onboarding resilient to the Lovable Cloud transient 503 / `PGRST002` ("schema cache reload") errors that are currently blocking users on the Review step, and add a server-side fallback in case a user's workspace bootstrap row is missing entirely.

## Files

### 1. New — `src/lib/supabaseRetry.ts`

Extract the retry logic that already lives inside `useCurrentWorkspace` into a reusable helper. Same backoff (250ms → 750ms → 2.25s, 4 attempts), same transient detection (`PGRST001`, `PGRST002`, 503, "schema cache", "Database client error").

Exports: `withSupabaseRetry(fn, maxAttempts?)` and `isTransientSupabaseError(err)`.

### 2. Refactor — `src/hooks/useCurrentWorkspace.ts`

Replace the local `withRetry` / `isTransient` definitions with imports from `@/lib/supabaseRetry`. Behavior unchanged.

### 3. New edge function — `supabase/functions/ensure-workspace/index.ts`

Server-side, service-role provisioner. Verifies the caller's JWT, then idempotently:
1. Upserts `profiles` row (id, email, name).
2. Looks up an existing workspace via `profiles.default_workspace_id`, then via `business_workspaces.owner_id`.
3. If none, inserts a fresh `business_workspaces` row.
4. Ensures `workspace_members` (owner/active), `brand_profiles`, and `subscriptions` rows exist.
5. Updates `profiles.default_workspace_id` to point at the workspace.

Returns `{ workspace_id }`. Registered in `supabase/config.toml` with `verify_jwt = false` (the function does its own JWT validation against the Supabase auth API, matching the pattern used by `ensure-demo-user`).

### 4. Edit — `supabase/config.toml`

Add the new function block:
```
[functions.ensure-workspace]
  verify_jwt = false
```

### 5. Edit — `src/features/workspace/pages/OnboardingPage.tsx`

**Fix #1 — error banner.** When `useCurrentWorkspace` finishes loading with `workspace = null`, render a banner above the form: "We can't reach your workspace right now" with a Retry button (calls `refetch()`) and a "Repair workspace" button (calls the `ensure-workspace` edge function then `refetch()`). The form below stays visible so the user can keep typing.

**Fix #2 — retry-wrapped writes.** Wrap every supabase call in `handleFinish` (workspace update, brand_profiles select/update/insert, profiles update) with `withSupabaseRetry`. If the final attempt still fails with a transient error, show a persistent inline error inside the card (not just a sonner toast) with a "Try again" button.

**Fix #3 — stronger Finish gate.** Change the disable condition from `disabled={saving || wsLoading}` to `disabled={saving || wsLoading || !workspace?.id}`. Add a `title` tooltip explaining "Loading workspace…" or "Workspace unavailable — tap Repair above" so the disabled state is never ambiguous.

**Fix #4 — auto-repair on first detected gap.** On mount, after `useCurrentWorkspace` resolves with `workspace = null` and `loading = false`, automatically call `ensure-workspace` once (guarded by a ref so it doesn't loop), then `refetch()`. Only show the manual error banner if that auto-repair also fails.

The seeding `useEffect` already gracefully handles `workspace?.id` being null, so no change needed there.

## Behavioral summary

| Scenario | Before | After |
|---|---|---|
| Cloud schema cache reload during onboarding load | Form loads with empty defaults, Finish silently no-ops | Banner appears with Retry; auto-repair runs once; on success form populates and Finish works |
| User without `default_workspace_id` (orphaned account) | Permanently stuck — Finish toasts "Workspace not loaded" forever | Auto-repair provisions all bootstrap rows; user proceeds normally |
| Transient 503 during Finish click | `handleFinish` throws, toast disappears, no clear next step | Each write retries up to 4 times; if all fail, persistent inline error with "Try again" |
| Healthy Cloud, normal flow | Works | Works (no extra latency — retry only triggers on transient errors) |

## Out of scope

- Other pages that use `supabase` directly (Dashboard, Requests, etc.) — they aren't on the critical signup path. Can adopt `withSupabaseRetry` later if similar reports come in.
- Cloud instance sizing — the underlying 503s are infrastructure-side and resolve on their own; if they recur frequently, recommend upgrading the Cloud instance from Connectors → Lovable Cloud → Advanced settings.
