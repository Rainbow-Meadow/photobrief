# Modern SaaS Landing + Inline Auth — PhotoBrief

The uploaded logo (deep navy camera body, electric-blue lens accent, "Photo" charcoal / "Brief" electric blue) becomes the visual anchor. The existing design tokens already match (electric blue `#0A6BFF`, charcoal foreground), so the work is mostly compositional + adding a complementary navy.

## What gets built

### 1. Logo prep (already done in exploration)
- `src/assets/photobrief-logo.png` — full wordmark, transparent background (1686×429).
- `src/assets/photobrief-mark.png` — camera-only mark for tight headers (505×429).

Background was removed with a feathered luminance threshold so antialiased edges stay clean.

### 2. Brand tokens (`src/index.css`)
Add three new tokens, sampled from the logo:
- `--brand-navy: 222 60% 11%` — camera body
- `--brand-lens: 217 100% 45%` — lens highlight
- `--gradient-brand: linear-gradient(135deg, navy 0%, navy-mid 55%, primary 130%)` — for the hero panel
- `--gradient-radial-glow` — soft top-center primary glow for the hero backdrop
- `--shadow-brand` — deep navy elevation for the auth card

Register `bg-gradient-brand` and `shadow-brand` in `tailwind.config.ts`.

### 3. BrandMark uses the real logo
Rewrite `src/components/layout/BrandMark.tsx`:
- Default: `<img src={logo} />` wordmark, 28px height.
- `markOnly` prop: render `photobrief-mark.png` only, used in compact contexts (sidebar, mobile header).
- No more lucide `Camera` placeholder, no gradient square.

### 4. New `Landing.tsx` — single page, four sections

```text
+-----------------------------------------------------------------+
|  HERO (split, gradient-brand backdrop with radial glow)         |
|  ┌─────────────────────────────┐  ┌──────────────────────────┐ |
|  │ Eyebrow • AI photo intake   │  │  AUTH CARD               │ |
|  │ Headline (Photo/Brief style)│  │  Tabs: Sign in | Sign up │ |
|  │ Subhead                     │  │  [ Continue with Google ]│ |
|  │ • bullet  • bullet  • bullet│  │  ─── or ───              │ |
|  │ Trust row (industries)      │  │  email / password        │ |
|  │                             │  │  [ Start free → ]        │ |
|  └─────────────────────────────┘  └──────────────────────────┘ |
+-----------------------------------------------------------------+
|  HOW IT WORKS — 3 steps with the camera mark as the divider    |
+-----------------------------------------------------------------+
|  VALUE PROPS — 4 feature cards (existing copy, refreshed)      |
+-----------------------------------------------------------------+
|  CTA BAND — gradient-brand, single button, recipient demo link |
+-----------------------------------------------------------------+
```

#### Hero details
- Background: `bg-gradient-brand` with `gradient-radial-glow` overlay; subtle dotted grid pattern (CSS, no asset) for texture.
- Left column: large headline echoing the logo's two-tone treatment — `<span className="text-foreground">Send a link.</span> <span className="text-primary">Get a complete brief.</span>` rendered on a light card that floats over the navy backdrop. (Or invert: navy backdrop with white headline + electric-blue accent word, mirroring the logo exactly. Will go with the inverted version since it ties the page directly to the logo identity.)
- Trust strip: small caps "TRUSTED BY" + 4-5 industry labels (Plumbing • Junk Removal • Property • Resale • Field Service).

#### Inline auth card
Reuses the existing `Auth.tsx` logic (Google OAuth via `lovable.auth.signInWithOAuth("google")` + email/password via `supabase.auth`) but as a compact embedded card on the landing page so visitors can sign up without a route change.

- shadcn `Tabs` for Sign in / Sign up.
- Google button (with the existing inline SVG) at the top.
- "or continue with email" divider.
- Email + password fields; signup adds optional name.
- Submits redirect to `/dashboard` (auth listener in `useAuth` does the actual redirect once session lands).
- Footer link: "Forgot password?" (out of scope to wire — placeholder routing to `/auth?mode=reset` for now).
- The standalone `/auth` page stays as a fallback for direct deep links.

#### How it works
Three numbered steps, each a small card with an icon row:
1. Pick a guide or describe what you need.
2. Recipient walks the chat-guided capture.
3. You get a graded brief with AI summary + next action.

Camera mark used at small size between steps as a brand divider (decorative, `aria-hidden`).

#### CTA band
Existing copy, restyled with `bg-gradient-brand` + soft inner stroke, single primary button on a white pill.

### 5. `MarketingLayout` header
- Replace the small placeholder mark with the real wordmark image (24-28px tall).
- Footer uses the wordmark too.

## Files

- **modify** `src/index.css` — add brand-navy / brand-lens / gradient-brand / shadow-brand tokens
- **modify** `tailwind.config.ts` — register the new gradient + shadow
- **modify** `src/components/layout/BrandMark.tsx` — render the real logo image, add `markOnly`
- **modify** `src/pages/Landing.tsx` — full rewrite per layout above
- **new** `src/features/auth/components/InlineAuthCard.tsx` — extracted compact auth card used by the landing hero
- **modify** `src/pages/Auth.tsx` — refactor to render `InlineAuthCard` so logic lives in one place

(Logo PNGs in `src/assets/` are already in place from exploration.)

## Out of scope
- Password reset flow wiring (link present, route stub only).
- Marketing copy tone change beyond minor refinements.
- Pricing / docs nav additions.
