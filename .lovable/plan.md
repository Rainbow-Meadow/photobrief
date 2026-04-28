# Sitewide design refresh around the PhotoBrief logo package

You uploaded 7 official assets. Today the app only uses two flat PNGs (`photobrief-logo.png` wordmark and `photobrief-mark.png` mark), and the favicon + OG image are still Lovable defaults. This plan installs the full package, retires the old files, and threads the right variant into every brand surface.

## 1. Install the logo package

Copy uploaded files into `src/assets/brand/` (and `public/` for static head/meta refs):

```text
src/assets/brand/
  photobrief-primary.png       (Primary_Transparent  — 3D camera mark, color)
  photobrief-mark-dark.png     (Dark_Logo           — flat navy mark, on light bg)
  photobrief-mark-light.png    (Light_Logo          — flat white mark, on dark bg)
  photobrief-mark-cartoon.png  (Cartoon             — flat color mark, playful)
  photobrief-wordmark.png      (Wordmark            — "PhotoBrief" type only)
  photobrief-horizontal.png    (Horizontal          — mark + wordmark, lockup)
  photobrief-stacked.png       (Stacked             — mark over wordmark)

public/
  favicon.png                  (from Cartoon — readable at 16/32px)
  apple-touch-icon.png         (from Primary, 180×180)
  og-image.png                 (1200×630 — Stacked on brand-navy gradient)
```

Delete the legacy `src/assets/photobrief-logo.png`, `src/assets/photobrief-mark.png`, and `public/favicon.ico` once references are migrated.

## 2. Upgrade `BrandMark` to a variant-aware component

Replace the current 2-image component with a typed API so every surface picks the *right* asset instead of inverting/recoloring a single PNG:

```tsx
type Variant = "horizontal" | "stacked" | "wordmark" | "mark" | "primary";
type Tone    = "auto" | "light" | "dark" | "color";

<BrandMark variant="horizontal" tone="auto" size={28} />
```

Mapping rules:
- `tone="light"` → uses `mark-light` (white) for dark backgrounds — no more CSS `invert` hack.
- `tone="dark"`  → uses `mark-dark` (navy) for light backgrounds.
- `tone="color"` → uses `primary` (3D) — for hero/marketing moments only.
- `tone="auto"`  → respects `dark:` class via Tailwind.
- `variant="horizontal"` and `variant="stacked"` use the prebuilt lockups (better kerning than ad-hoc mark+wordmark).

## 3. Surface-by-surface application

| Surface | Today | After |
|---|---|---|
| `MarketingLayout` header | `<BrandMark />` (horizontal PNG) | `variant="horizontal" tone="dark"` at h=32 |
| `MarketingLayout` footer | same | `variant="wordmark" tone="dark"` at h=20, muted |
| `AppSidebar` (collapsed) | mark only | `variant="mark" tone="auto"` at 24 |
| `AppSidebar` (expanded) | wordmark | `variant="horizontal" tone="auto"` at 26 |
| `Auth` page card | wordmark | `variant="stacked" tone="color"` (Primary mark + wordmark) — hero-grade welcome |
| `Landing` hero right column | n/a | subtle floating `primary` mark watermark behind `InlineAuthCard` (very low opacity, decorative) |
| `Landing` "Why teams switch" | flat mark @ opacity 90 | `variant="primary"` (3D) at h=160, no opacity reduction — let it shine |
| `Landing` CTA band | n/a | small `mark-light` next to the headline for brand recall |
| `PublicRequestLayout` header | generic primary square placeholder when no recipient logo | fallback to `variant="mark" tone="dark"` at 28 |
| `index.html` `<title>` / meta | "Lovable App" / Lovable OG | "PhotoBrief — Take the right photos, every time." + new `og-image.png` + favicon set |
| `<head>` icons | `favicon.ico` | `favicon.png` + `apple-touch-icon.png` + `theme-color` `#0A6BFF` |

## 4. Lockup, spacing & motion polish

- Hero pages (`Landing`, `Pricing`, CTA bands) gain a faint, large `primary` mark as a decorative background element on the gradient (single-instance, blurred, ~8% opacity) — gives the brand a physical presence without crowding copy.
- Stacked variant on `Auth` gets a soft 600ms fade-in using the existing `fade-in` keyframe.
- `BrandMark` adds optional `withGlow` prop that drops `shadow-glow` behind the 3D mark on dark backgrounds (used in Auth + CTA only).
- All instances get `loading="eager"` for above-the-fold (header, hero, auth) and `loading="lazy"` everywhere else.

## 5. Microcopy + meta alignment

- `index.html`: title, description, OG/Twitter tags rewritten to PhotoBrief. `theme-color` and `apple-mobile-web-app-title` added.
- `MarketingLayout` footer tagline already says "Take the right photos, every time" — keep, pair with new wordmark.

## Technical notes

- All seven uploads are copied via `code--copy` from `user-uploads://` into `src/assets/brand/` and `public/`.
- New `BrandMark.tsx` keeps the existing default export signature (`<BrandMark className size />`) backwards-compatible so unchanged call sites still render the horizontal lockup — only the source file changes.
- Tailwind `dark:` selectors handle `tone="auto"` via two `<img>` tags swapped with `hidden dark:block` / `block dark:hidden` (no JS).
- `og-image.png` is generated locally with ImageMagick (composite stacked logo on `--gradient-brand` background, 1200×630) and committed to `public/`.
- `favicon.ico` is removed AFTER `index.html` is updated to point at `favicon.png`, to avoid the browser default request hitting a stale icon.
- No backend, schema, or routing changes.

## Files touched

- **Add**: 7 brand PNGs in `src/assets/brand/`, `public/favicon.png`, `public/apple-touch-icon.png`, `public/og-image.png`
- **Rewrite**: `src/components/layout/BrandMark.tsx`, `index.html`
- **Edit**: `MarketingLayout.tsx`, `AppSidebar.tsx`, `PublicRequestLayout.tsx`, `pages/Landing.tsx`, `pages/Auth.tsx`
- **Delete**: `src/assets/photobrief-logo.png`, `src/assets/photobrief-mark.png`, `public/favicon.ico`

Approve and I'll switch to build mode and ship it.