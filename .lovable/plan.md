# Landing page + design schema refactor

Refactor the marketing surfaces to match the cleaner, lighter, more conversion-focused identity in your reference screenshots: tighter hero, segmented "How it works" with numbered steps, a stats band, an industries grid, testimonials, full pricing inline, and a final CTA card.

## Visual identity shifts

| Aspect | Today | After (matches reference) |
|---|---|---|
| Hero background | Heavy navy `bg-gradient-brand` with grid + watermark, white text everywhere | **Light** background (`bg-background` → subtle `bg-gradient-subtle`), centered single-column copy, primary CTAs as solid blue pills on white |
| Top nav | Pricing / Sign in | **How it works · Use cases · Pricing** + "Sign in" + blue "Try Free" pill (matches screenshot) |
| Hero CTAs | Inline auth card on the right | Two centered buttons: **"Start Free — No Credit Card"** (primary blue pill) and **"▶ Watch 90-second demo"** (ghost). Trust line below |
| Hero visual | Big inline auth form | A **product mockup card** (browser chrome, "customer sees" / "you see" split) — built in CSS, no image |
| Logo strip | "Built for: Plumbing • Junk removal…" inside the hero | Dedicated **"Trusted by service pros, property managers, and resellers"** strip beneath hero with company-name pseudo-logos (text wordmarks) |
| How it works | 3 steps, icon-led cards | **4 steps** with massive light-gray numerals (01, 02, 03, 04) over short label + body — matches the spacious "From request to review in minutes" screenshot |
| Stats band | (none) | New **navy band** "The numbers speak for themselves" with 4 glassy stat tiles: 40% / 8 min / 3× / 94% |
| Use cases | Generic 4 value-props | **6 industry tiles** ("Plumbers & HVAC", "Property Managers", "Resellers", "Small Businesses", "Insurance Agents", "Service Providers") with icon + outcome line |
| Social proof | (none) | New **3-up testimonials** with stars, quote, name, role |
| Pricing | Embedded `PricingCardGrid` on dark band | Move pricing **off the landing page** — the landing CTA points to `/pricing`. The dedicated `/pricing` page (already exists) gets a small visual polish to match |
| Final CTA | Navy band with two buttons | **Centered light card** with bolt icon, "Your next customer is about to send you the wrong photos." headline, and a single primary CTA |
| Color usage | Navy gradient dominant on landing | Navy reserved for: top brand bar, **stats band only**, and **CTA buttons**. Everything else is white / muted with the blue as accent |
| Typography rhythm | Mixed weights, tight tracking | Heavier headline (`font-bold`), more vertical breathing room (`py-20` → `py-24` on key sections), centered alignment for hero and section headers |

## Sections (top to bottom)

1. **Top nav** — wordmark left; "How it works · Use cases · Pricing" center; "Sign in" + "Try Free" right.
2. **Hero** — light background, centered: tagline pill, big 2-line headline ("Send a link.\nGet a complete brief."), supporting paragraph, two CTAs, "Free plan includes 5 requests/month · No install for your customers", then a CSS-built product mockup card showing the dual-pane "Customer sees / You see" preview.
3. **Trust strip** — "Trusted by service pros, property managers, and resellers" + 6 muted text wordmarks (Servpro, HomeAdvisor, Thumbtack, Poshmark, Zillow, eBay) — purely illustrative.
4. **How it works** — "From request to review in minutes" + 4 numbered steps in a 4-col grid.
5. **Stats band (navy)** — "The numbers speak for themselves" + 4 stat tiles (40% / 8 min / 3× / 94%).
6. **Built for your industry** — 6 industry cards (3×2) with icons + one-line outcomes.
7. **Testimonials** — "Loved by pros who hate wasted time" + 3 cards with 5-star rating.
8. **Final CTA card** — light card with lightning icon, "Your next customer is about to send you the wrong photos.", subline, and "Create Your Free Account" primary button.

## Component-level changes

- **`src/pages/Landing.tsx`** — rewritten end-to-end against the 8-section structure above. Drop `InlineAuthCard`, drop `PricingCardGrid` from the landing flow, drop the in-hero industries pill row.
- **`src/components/layout/MarketingLayout.tsx`** — nav links updated to `#how-it-works`, `#use-cases`, `/pricing`. The "Try Free" button becomes the rounded blue pill style used in the screenshot (no shape change to the global button — just `rounded-full` on this instance).
- **New `src/components/marketing/`** folder with focused, reusable pieces (each one small, no logic):
  - `HeroProductMockup.tsx` — the dual-pane "Customer sees / You see" CSS card (browser chrome + step prompt + AI summary panel).
  - `TrustLogosStrip.tsx` — text-only wordmark row.
  - `HowItWorksSteps.tsx` — 4 large-numeral steps.
  - `StatsBand.tsx` — navy band with 4 stat tiles.
  - `IndustryGrid.tsx` — 6 outcome tiles.
  - `TestimonialsRow.tsx` — 3-up stars + quote.
  - `FinalCtaCard.tsx` — bolt icon + headline + button.
- **`src/pages/Pricing.tsx`** — light polish only: lighter hero (gradient-subtle instead of `gradient-brand`), reuses existing `PricingCardGrid`. The "Founding Customer Offer" yellow banner from the screenshot becomes a new `<FoundingCustomerBanner />` rendered above the grid (only shown while seats remain — uses existing `useFoundingPro`).
- **No design-token changes required** — everything maps to existing semantic tokens (`primary`, `brand-navy`, `muted`, `success`, `accent`). The navy stays available for the stats band and CTA pill.

## Out of scope

- The product mockup is **decorative CSS**, not a real working preview. It mimics the Customer/You-see split using existing tokens, real microcopy, and our brand colors. No new images.
- Logos in the trust strip are text wordmarks at low opacity, not real third-party logos (avoids trademark issues).
- Stats numbers (40% / 8 min / 3× / 94%) are marketing claims drawn from the reference; we keep them as strings in `Landing.tsx` so you can edit them in one place later.
- Pricing data, plan limits, Founding Pro logic, billing flow — unchanged.

## Files

- **Edit**: `src/pages/Landing.tsx`, `src/pages/Pricing.tsx`, `src/components/layout/MarketingLayout.tsx`
- **Add**: `src/components/marketing/HeroProductMockup.tsx`, `TrustLogosStrip.tsx`, `HowItWorksSteps.tsx`, `StatsBand.tsx`, `IndustryGrid.tsx`, `TestimonialsRow.tsx`, `FinalCtaCard.tsx`, `FoundingCustomerBanner.tsx`

Approve and I'll switch to build mode and ship the refactor.