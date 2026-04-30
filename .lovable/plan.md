# PhotoBrief Visual Identity Upgrade — Apple-Inspired Glass

A focused redesign that keeps every flow intact and only changes look, feel, hierarchy, and surface language. No backend, routing, or data model changes.

---

## 1. Audit — what still feels template-like today

- Hero is a centered text block + standard browser-chrome mockup. No depth, no glass, no real "Apple" presentation.
- Nav is flat: solid background, generic ghost links, no glass or active-state polish.
- Section rhythm is conventional Tailwind SaaS: light-gray bands, big numerals, 2/4-up grids — works, but reads as "Lovable starter".
- Cards everywhere use the same `bg-card + shadow-elev-sm` recipe, so pricing, dashboard, capture, and review all look siblings of each other rather than purpose-built surfaces.
- No glass token system — translucent surfaces are one-off `bg-white/[0.06] backdrop-blur` strings inside components.
- Typography is Inter system default with one weight scale; hero headline isn't large or tight enough to feel premium.
- Buttons are stock shadcn — no branded primary, no luminous hover, no consistent loading state.
- Capture chat bubbles, submission review, and dashboard widgets have no shared "glass" identity — they look like different apps.
- Mobile nav works but visual hierarchy is weak; sheet feels generic.
- Decorative numerals in HowItWorks, gray pricing FAQ band, and the StatsBand all read as defaults.

---

## 2. Top 10 highest-impact upgrades

1. Introduce a **glass design token layer** (`--glass-*`, `--blur-*`, `--ring-hairline`, layered shadows) and a `<GlassPanel>` primitive with variants: `nav | hero | card | modal | widget | chat`.
2. Redesign the **homepage hero**: tighter headline, refined CTA pair, and a new layered glass product story (two floating panels with parallax depth and a soft sky-blue ambient gradient behind them) replacing the browser-chrome mockup.
3. Rebuild **navigation** as a translucent floating glass bar with hairline border, refined hover underline, and a branded primary CTA pill.
4. Establish a **typography scale** (Inter Display for h1/h2, Inter for body, tabular nums for metrics) with confident hero size (clamp 44–72px), tighter tracking, and consistent label/eyebrow style.
5. Refactor **buttons** with a true brand primary (gradient + inner highlight + soft ring on hover), consistent `loading`, `success`, and `disabled` states, and a new `glass` variant for use on dark/photo backgrounds.
6. Redesign **pricing cards** as glass tiles with distinct elevation for the recommended Pro plan (lifted, glow ring, gradient header chip), uniform feature spacing, and four clear tiers visually grouped.
7. Polish the **dashboard shell**: sidebar becomes a thin glass rail, header uses a translucent strip, metric cards become glass widgets with strong number hierarchy + sparkline placeholder, and the request inbox rows get a refined hover lift.
8. Elevate the **recipient capture/chat flow**: branded glass header with progress pill, larger capture CTA, refined chat bubbles (assistant = glass card w/ lens dot, user = primary gradient), AI feedback bubble with sparkline accent, and a calm completion state.
9. Make the **submission review page** the "money screen": a hero readiness card (large animated score ring + status label), AI summary glass card, missing items glass card, shot grid with consistent badge language, and a sticky action bar.
10. Add **restrained motion**: section reveal on scroll, card hover lift (translateY -2px + shadow swap), readiness ring count-up, chat bubble fade/slide-in, and button press micro-interaction. All ≤250ms, respects `prefers-reduced-motion`.

---

## 3. The Apple-inspired glass system

### Tokens (added to `src/index.css` `:root` and `.dark`)

```text
--glass-bg-strong:   hsl(0 0% 100% / 0.72)
--glass-bg:          hsl(0 0% 100% / 0.55)
--glass-bg-soft:     hsl(0 0% 100% / 0.35)
--glass-bg-onDark:   hsl(222 60% 14% / 0.55)
--glass-border:      hsl(220 30% 90% / 0.7)
--glass-border-onDark: hsl(0 0% 100% / 0.12)
--glass-highlight:   hsl(0 0% 100% / 0.6)   /* top inner sheen */
--glass-shadow:      0 1px 0 hsl(0 0% 100% / 0.6) inset,
                     0 20px 40px -20px hsl(222 47% 11% / 0.18),
                     0 8px 24px -12px hsl(222 47% 11% / 0.12)
--blur-sm: 8px;  --blur-md: 16px;  --blur-lg: 28px;
--radius-xs: 8px; --radius-sm: 12px; --radius-md: 16px;
--radius-lg: 20px; --radius-xl: 28px; --radius-2xl: 36px;
--ambient-sky: radial-gradient(80% 60% at 50% 0%, hsl(217 100% 70% / 0.18), transparent 70%)
```

Tailwind exposure: extend `boxShadow.glass`, `backdropBlur.glass-{sm,md,lg}`, `backgroundImage.ambient-sky`, plus utility classes `.glass`, `.glass-strong`, `.glass-onDark`, `.hairline`.

### `<GlassPanel>` primitive (`src/components/ui/glass-panel.tsx`)

```tsx
<GlassPanel variant="card" tone="light" elevation="md" interactive>
```
Variants map to combinations of bg/blur/border/shadow tokens above. All glass surfaces in the app render through this component so the look stays consistent.

### Usage rules

- Glass appears on top of an ambient gradient, photo, or layered background — never on flat white-on-white.
- One glass tier per visual layer; never stack two translucent panels directly.
- Hairline border (`1px hsl(var(--glass-border))`) on every glass surface for crispness.
- Inner top highlight via `box-shadow inset` for the "sheen".
- Blur kept ≤ 16px on cards, 28px reserved for nav/modal overlays.
- Text on glass always passes WCAG AA — enforce via `text-foreground` on light glass, `text-white` on dark glass.

---

## 4. What changes, page by page

### Marketing

- **`src/pages/Landing.tsx`** — new hero copy ("Send a link. Get a complete brief." / "Start Free" + "Watch Demo"), ambient sky gradient behind hero, replace `HeroProductMockup` with new `HeroGlassStory`. Insert a 3-step value strip above HowItWorks.
- **`src/components/marketing/HeroGlassStory.tsx`** *(new)* — two floating glass panels (Customer / Brief) with offset depth, soft drop shadow, lens-ring accent, animated readiness arc.
- **`HowItWorksSteps.tsx`** — reduce to 3 steps matching brief, swap big numerals for refined lens-ring step indicators on glass cards.
- **`TrustLogosStrip.tsx`, `StatsBand.tsx`, `IndustryGrid.tsx`, `TestimonialsRow.tsx`, `FinalCtaCard.tsx`, `FirstPassGuaranteeBand.tsx`** — re-skin to glass cards / hairline dividers, consistent eyebrow style, no functional change.
- **`MarketingLayout.tsx`** — floating translucent glass nav, refined hover underline, branded primary CTA, polished mobile sheet.

### Pricing

- **`Pricing.tsx`** + **`PricingCardGrid.tsx`** — 4 glass tiles (Free / Pro / Business / Enterprise), Pro lifted with glow ring + gradient cap, uniform feature list, refined billing toggle, glass FAQ accordion, glass guarantee card.

### Auth

- **`src/pages/Auth.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`** — split layout with ambient gradient + faint product silhouette on one side, single glass card holding the form. Inputs get the new refined style (taller, hairline border, focus ring).

### Dashboard shell

- **`DashboardLayout.tsx`, `AppSidebar.tsx`, `PageHeader.tsx`** — translucent header, thin glass sidebar rail with refined active state (gradient pill + lens dot), softened content background using the ambient gradient.
- **`shared/MetricCard.tsx`, `DashboardPage.tsx`** — glass widgets, large tabular-num value, eyebrow label, micro-trend area, hover lift.
- Inbox rows (`RequestsInboxPage.tsx`, related row components) — hover lift, status pills re-skinned, readiness badge unified.

### Request builder

- **`CreateRequestPage.tsx`, `AIRequestBuilderChat.tsx`, `RequestBuilderModeTabs.tsx`, `GeneratedQuestionEditor.tsx`, `GeneratedStepEditor.tsx`, `TemplatePicker.tsx`** — wrap step canvas in glass, refine tab pills, soften card edges, consistent spacing scale; no logic change.

### Recipient capture / chat

- **`PublicRequestLayout.tsx`, `PublicRecipientPage.tsx`, `ChatThread.tsx`, `ChatMessage.tsx`, `PhotoPromptCard.tsx`, `CaptureUploadCard.tsx`, `AIFeedbackMessage.tsx`, `RetakeDecisionCard.tsx`, `ReviewSummaryCard.tsx`, `SubmitConfirmationCard.tsx`** — branded glass header w/ progress pill, larger primary capture button, assistant bubbles as glass cards w/ lens-ring avatar, user bubbles as primary gradient with subtle inner highlight, AI feedback bubble distinguished by sparkline accent, calm glass completion state.

### Submission review

- **`SubmissionReviewPage.tsx`, `ShotCard.tsx`, `ActivityTimeline.tsx`, `InternalNotesPanel.tsx`, `AskForMorePhotosDialog.tsx`** — new readiness hero (large ring + status), AI summary glass card, missing-items glass card, refined shot grid with unified status badges, sticky bottom action bar on mobile.

### Settings / branding

- **`BrandSettingsPage.tsx`, `BillingSettingsPage.tsx`, `TeamSettingsPage.tsx`, `MessageTemplatesPage.tsx`, `SmsSettingsPage.tsx`** — sectioned glass panels, refined form inputs, consistent description text style.

### Shared components touched

`button.tsx` (gradient primary + glass variant + loading state), `card.tsx` (radius + shadow scale), `input.tsx` / `textarea.tsx` / `select.tsx` (taller, hairline, focus ring), `badge.tsx` (status palette unified), `EmptyState.tsx`, `StatusBadge.tsx`, `PlanTag.tsx`, `ReadinessProgress.tsx`, `ReadinessScoreBadge.tsx`, `UpgradePromptCard.tsx`.

---

## 5. Motion

- `motion.css` utility additions: `.lift-on-hover`, `.section-reveal`, `.bubble-in`, `.ring-count-up`.
- Use Tailwind keyframes already in `tailwind.config.ts` (`fade-in`, plus new `lift`, `reveal`, `count-up`).
- All ≤ 250ms, easing `cubic-bezier(0.4,0,0.2,1)`. Wrapped in `@media (prefers-reduced-motion: no-preference)`.

---

## 6. Implementation order

1. Tokens + Tailwind extension + `GlassPanel` primitive + button/input/card refinements.
2. Marketing layout (nav + footer) and homepage hero + sections.
3. Pricing page + pricing cards.
4. Auth screens.
5. Dashboard shell + metric cards + inbox rows.
6. Recipient capture/chat surfaces.
7. Submission review page.
8. Settings & remaining shared components.
9. Mobile pass + motion pass + accessibility/contrast verification.

---

## 7. Guardrails

- Zero changes to routing, data hooks, Supabase calls, or state machines.
- Keep all component prop signatures stable — purely visual refactor inside components.
- Preserve every existing test; do not remove behavior covered by `src/test/*`.
- Run a contrast pass on every new glass surface (target WCAG AA 4.5:1).
- No new heavy dependencies — use existing `lucide-react`, Tailwind, CSS only.

---

## 8. Deliverable summary I will provide after implementation

1. Pages updated (list).
2. Components updated (list).
3. Design tokens added/changed (diff of `index.css` + `tailwind.config.ts`).
4. Glass styles introduced (`GlassPanel` API + utility classes).
5. Mobile responsiveness notes (per surface).
6. Remaining polish recommendations (e.g. real product screenshots, custom illustrations, video demo asset).
