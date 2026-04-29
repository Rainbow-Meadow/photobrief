## Goal

Make it easy for any signed-in user to reset their password or log out from anywhere in the authenticated app. Today the avatar in the header is a static circle (no menu) and there is no logout control inside the app — only `useAuth().signOut` exists.

## Changes

### 1. Convert the header avatar into an account dropdown
File: `src/components/layout/DashboardLayout.tsx`

Wrap the existing `<Avatar>` in a `DropdownMenu` (already in `src/components/ui/dropdown-menu.tsx`) with these items:

- Header label: signed-in email (from `useAuth().user.email`)
- "Reset password" → sends reset email via `supabase.auth.resetPasswordForEmail(user.email, { redirectTo: ${origin}/reset-password })`, then toasts "Check your inbox for a reset link." Disabled if no email on the user.
- "Log out" → calls `signOut()` from `useAuth`, then `navigate("/auth")` and toasts "Signed out."

The avatar fallback initials should use the email's first letter instead of the hard-coded "BS".

### 2. Add the same actions to the mobile Settings sheet
File: `src/components/layout/MobileSettingsSheet.tsx`

Append a new section under the existing settings list:

- "Reset password" row (KeyRound icon) — same handler as above
- "Log out" row (LogOut icon, destructive styling) — same handler as above

This guarantees the controls are reachable on phones, where the header avatar is small and easy to miss.

### 3. Small shared helper
File: `src/features/account/useAccountActions.ts` (new)

Tiny hook returning `{ resetPassword, logOut }` so the dropdown and the sheet share one implementation. Keeps toasts and navigation consistent.

## Out of scope

- No new routes. `/reset-password` and `/forgot-password` already exist and are reused.
- No change to onboarding, RequireAuth, or auth provider logic.
- No "change password while signed in" inline form — sending the email link is the same flow Supabase recommends and matches the existing forgot-password page.

## Files touched

- edit `src/components/layout/DashboardLayout.tsx`
- edit `src/components/layout/MobileSettingsSheet.tsx`
- new  `src/features/account/useAccountActions.ts`
