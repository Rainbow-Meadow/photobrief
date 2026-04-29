
## 1. Audit — what actually exists today

Routes confirmed in `src/App.tsx`:

**Marketing / public**: `/` (Landing), `/pricing`, `/auth`, `/forgot-password`, `/reset-password`, `/unsubscribe`
**Onboarding**: `/onboarding`, `/invite/:token`
**Authenticated business app** (DashboardLayout sidebar):
- `/dashboard` — metrics (Ready to review, Needs customer, In progress, Refunded), recent requests, AssistantPanel sheet
- `/requests` — inbox with filters, bulk actions (gated), assignments (gated), reminders (gated)
- `/requests/new` — Template tab + AI builder tab (AI gated), draft preview, Create / Save as guide
- `/requests/:id` — request detail, copy link, send reminder, ask for more
- `/submissions/:id` — review screen with shot cards, AI feedback, readiness score, ask-for-more dialog, internal notes, activity timeline, PDF export
- `/guides`, `/guides/new`, `/guides/:id` — guide library + builder
- `/settings/brand`, `/settings/team`, `/settings/templates`, `/settings/sms`, `/settings/billing` (incl. new top-up packs)

**Public recipient (no auth)**: `/r/:token` (chat-first capture flow with photo prompts, AI feedback, retake/use-anyway, questions, review, submit), `/r/:token/done`

Sidebar (`AppSidebar.tsx`) groups: Dashboard, Requests, Guides + Settings (Brand, Team, Templates, SMS, Billing). **No Help link today.** Marketing nav has How it works / Use cases / Pricing — **no Help link today.**

### Things the guide must NOT invent
- No mobile camera-roll uploader on the business side (recipients capture; businesses review)
- No "duplicate request" button, no "archive all" — only what's in the inbox dropdown
- AI Request Builder and reminders/bulk/assignments are **plan-gated**; the guide must say so
- There is no in-app onboarding tour today

### UX friction worth flagging (feeds section 5)
1. No Help / "?" entry point anywhere — beta users have nowhere to land
2. Dashboard "Refunded this period" metric is unexplained; needs a tooltip
3. Create Request page doesn't show a live preview of the recipient link experience
4. Recipient retake-vs-use-anyway moment has no explainer of consequences
5. Submission Review readiness score has no legend (what is "good"?)

---

## 2. What to build

### A. New route `/help` (BetaGuidePage)

Rendered inside `DashboardLayout` for signed-in users **and** mounted under `MarketingLayout` so logged-out beta testers + recipients can reach it. Single component, two routes:

```
/help          → MarketingLayout (public)
/app/help      → DashboardLayout (in-app, adds sidebar link)
```

Add "Help & Guide" item to `AppSidebar` (new section "Resources") with `LifeBuoy` icon. Add "Help" link to MarketingLayout desktop nav and mobile sheet. Add a floating "?" button in `DashboardLayout` bottom-right that links to `/app/help`.

### B. Page structure (single page, deep-linkable sections)

```text
BetaGuidePage
├─ Hero strip ("PhotoBrief beta — get up and running in 5 minutes")
├─ Audience switcher tabs: [Quick Start] [For Businesses] [For Customers] [FAQ]
├─ Sticky in-page TOC (desktop) / Sheet TOC (mobile)
└─ Sections (anchored: #quick-start, #business, #recipient, #faq, #troubleshooting)
```

Each section uses a reusable `<GuideStep>` component:

```text
┌─────────────────────────────────────┐
│ ① Step title                         │
│ Short plain-language instruction.    │
│                                      │
│ [ Annotated screenshot placeholder ] │
│   ↳ Callout pins (numbered)          │
│                                      │
│ ✅ What you should see: ...          │
│ 💡 Quick tip: ...                    │
│ ⚠️  Heads-up (only when needed)      │
└─────────────────────────────────────┘
```

### C. Reusable components (new, in `src/features/help/`)
- `GuideStep.tsx` — number + title + body + slot for screenshot + optional tip/warn/whatYouSee
- `Callout.tsx` — variants: tip, warn, success
- `AnnotatedScreenshot.tsx` — wraps an `<img>` with absolutely-positioned numbered pins (`{x, y, label}[]`); falls back to a styled placeholder card when image is missing so we can ship before screenshots exist
- `GuideTOC.tsx` — sticky section nav
- `QuickChecklist.tsx` — checkbox list (visual only, persisted to localStorage so user can mark progress)

### D. Content (final copy ships in the page)

**Quick Start (5 steps)**
1. Pick a template on **Requests → New request**
2. Add the customer's name + email or phone
3. Click **Create request** — we send the link
4. When they submit, open it from **Dashboard → Ready to review**
5. Review photos, accept or **Ask for more**

**For Businesses** sections:
1. What PhotoBrief is (2 sentences)
2. Tour of the Dashboard (metrics meaning, refunded credits explained)
3. Creating a request (Template vs AI builder — note AI is on Pro+)
4. Customizing a guide (Guides → New)
5. Sending the link (email auto-sends if address provided, otherwise copy link)
6. What your customer sees (link to recipient section)
7. Tracking status (statuses defined: Sent, Needs customer, In progress, Submitted, Reviewed)
8. Reviewing a submission (shot cards, AI feedback, readiness score legend, accept/ask-for-more)
9. Asking for more photos (per-shot comments)
10. Branding & settings (Brand, Templates, SMS, Team, Billing incl. top-up packs)

**For Customers (recipient mini-guide)** — written so a business can forward the section URL:
1. Open the link your contractor sent you
2. Follow the chat — it tells you exactly what photo to take next
3. Tap the camera tile to take or upload a photo
4. Read the AI feedback — green = good, yellow = could be better
5. Retake or "Use anyway" (we explain the trade-off)
6. Answer any short questions
7. Review your submission and tap **Submit**

**FAQ / Troubleshooting** (accordion):
- I don't know what photo to take → re-read the prompt; tap the example
- My photo was rejected/flagged → what AI looks for, retake tips
- I already submitted → you can submit more if asked
- I need to send more photos → wait for an "Ask for more" link
- I can't find my request → check the original email/SMS
- I'm on mobile → fully supported, use the camera button
- Something looks confusing → contact link

### E. Recommended screenshots / visual anchors (placeholders ship now)

| # | File path | Anchored to | Pins |
|---|-----------|-------------|------|
| 1 | `src/assets/help/dashboard-overview.png` | `/dashboard` | Metrics row, Recent requests, Assistant button |
| 2 | `src/assets/help/requests-new-template.png` | `/requests/new` (Template tab) | Mode tabs, template grid, draft preview, Create button |
| 3 | `src/assets/help/requests-new-ai.png` | `/requests/new` (AI tab) | Prompt box, generated draft, Pro badge |
| 4 | `src/assets/help/inbox-statuses.png` | `/requests` | Status filter, status badges, row actions |
| 5 | `src/assets/help/submission-review.png` | `/submissions/:id` | Shot card, AI verdict, readiness badge, Ask-for-more |
| 6 | `src/assets/help/recipient-chat.png` | `/r/:token` | Photo prompt card, capture tile, progress bar |
| 7 | `src/assets/help/recipient-feedback.png` | `/r/:token` | AI feedback bubble, Retake / Use anyway buttons |
| 8 | `src/assets/help/recipient-review.png` | `/r/:token` | Review summary, Submit button |
| 9 | `src/assets/help/billing-topups.png` | `/settings/billing` | Plan card, Top-up packs section |

`AnnotatedScreenshot` renders a labeled placeholder ("Screenshot: Dashboard overview — coming soon") when the file is missing, so the guide is shippable on day one and gets nicer as PNGs land.

### F. Sidebar / Nav wiring
- `AppSidebar.tsx`: add new `SidebarGroup` "Resources" with one item `{ title: "Help & Guide", url: "/app/help", icon: LifeBuoy }`
- `MarketingLayout.tsx`: add `<NavLink to="/help">Help</NavLink>` to desktop nav and mobile sheet
- `DashboardLayout.tsx`: add a small fixed `LifeBuoy` floating button (bottom-right, above MobileTabBar) linking to `/app/help`

### G. Files to create / edit

Create:
- `src/features/help/pages/BetaGuidePage.tsx`
- `src/features/help/components/GuideStep.tsx`
- `src/features/help/components/Callout.tsx`
- `src/features/help/components/AnnotatedScreenshot.tsx`
- `src/features/help/components/GuideTOC.tsx`
- `src/features/help/components/QuickChecklist.tsx`
- `src/features/help/content/quickStart.ts` (data-driven so copy is editable in one file)
- `src/features/help/content/business.ts`
- `src/features/help/content/recipient.ts`
- `src/features/help/content/faq.ts`

Edit:
- `src/App.tsx` — add `/help` (MarketingLayout) and `/app/help` (DashboardLayout) routes
- `src/components/layout/AppSidebar.tsx` — Resources group + Help item
- `src/components/layout/MarketingLayout.tsx` — Help nav link (desktop + mobile sheet)
- `src/components/layout/DashboardLayout.tsx` — floating Help button

No backend changes. No new dependencies.

---

## 3. Top 5 UX improvements (from auditing what the guide had to over-explain)

1. **Add a persistent Help / "?" entry point** in both the app sidebar and the marketing header — biggest single beta-onboarding win.
2. **Add a one-screen first-run tour** on `/dashboard` after onboarding (3 tooltips: metrics, New request, Inbox) so the written guide isn't the only signpost.
3. **Add a "Preview as recipient" button** on `/requests/new` and `/requests/:id` — opens the recipient flow in a side sheet so businesses see exactly what their customer gets without leaving the app.
4. **Explain the readiness score inline** on submission review with a small popover legend (0–60 needs work, 60–85 ok, 85+ great) — currently a number with no anchor.
5. **Inline the "Refunded this period" metric** with a tooltip explaining the first-pass guarantee, and make the Retake-vs-Use-anyway card on the recipient side spell out the consequence ("Using anyway may delay your job if your contractor needs to ask again").

---

## Acceptance

- Visiting `/help` (logged out) and `/app/help` (logged in) renders the same content with the appropriate chrome.
- Sidebar shows a "Help & Guide" link; marketing header shows a "Help" link.
- All four tabs (Quick Start / Business / Customers / FAQ) render, are deep-linkable, and read cleanly on mobile (440px) and desktop.
- Every step has either a real screenshot or a clearly-labeled placeholder.
- No invented features — every instruction maps to a real route or button that exists today.
