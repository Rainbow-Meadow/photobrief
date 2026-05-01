## Light / Dark mode pill toggle

The app already has full dark-mode tokens defined in `src/index.css` (`.dark { ... }`) and `next-themes` is installed but no provider is wired up. I'll add a provider, persist the user's choice, and surface a compact pill-style toggle in the sidebar footer.

### Scope
- The toggle controls the **authenticated app** (`.app-shell`). Marketing, auth, and recipient flows stay on their fixed light branding so the public/customer experience doesn't shift.
- Default theme = `light` (matches today). Stored in localStorage by `next-themes`.

### Changes

1. **`src/components/theme/ThemeProvider.tsx`** (new)
   - Thin wrapper around `next-themes`' `ThemeProvider`.
   - `attribute="class"`, `defaultTheme="light"`, `enableSystem={false}`, `storageKey="pb-theme"`, `disableTransitionOnChange`.

2. **`src/App.tsx`**
   - Wrap the tree (inside `QueryClientProvider`, outside `AuthProvider`) with `<ThemeProvider>` so the `dark` class lands on `<html>` before any authed page paints.

3. **`src/components/shared/ThemeToggle.tsx`** (new)
   - Pill-shaped two-segment switch (Sun / Moon icons), styled with the existing `.pill` look:
     - Container: `rounded-full border bg-muted p-0.5 inline-flex`
     - Each segment: `rounded-full px-2.5 py-1 text-xs` — active segment uses `bg-background text-foreground shadow-sm`, inactive is `text-muted-foreground`.
   - Uses `useTheme()` from `next-themes`. Guards against SSR/hydration with a `mounted` flag.
   - Accessible: `role="group"`, each segment is a `<button>` with `aria-pressed` and an `aria-label` ("Light mode" / "Dark mode"). Arrow-key support to flip between segments.
   - Collapsed-sidebar variant: when the sidebar is collapsed, render a single icon-only round button that toggles between the two modes (keeps the rail tidy).

4. **`src/components/layout/AppSidebar.tsx`**
   - Add a small footer row above the existing `UpgradePromptCard` containing `<ThemeToggle />`. Always rendered (independent of `showUpgradeCard`). Uses `collapsed` from `useSidebar()` to pick the compact variant.

5. **`src/index.css`** (tiny addition)
   - The existing `.dark .app-shell` block already handles the teal-on-navy accents. Confirmed `--app-bg`, `--app-sidebar-bg`, etc. are defined under `.dark` (lines 207–220), so no new tokens needed. Only add a `color-scheme: dark` declaration inside `.dark` so native form controls / scrollbars switch too.

### Out of scope
- No system-preference auto-detection (kept off to avoid surprising returning users; can add later behind the same toggle by exposing a third "Auto" segment).
- No theming changes to marketing pages — they remain light by design.
- Sonner already reads `useTheme()` via `next-themes`, so toasts will follow the toggle automatically once the provider is wired.

### Files
- New: `src/components/theme/ThemeProvider.tsx`, `src/components/shared/ThemeToggle.tsx`
- Edited: `src/App.tsx`, `src/components/layout/AppSidebar.tsx`, `src/index.css`
