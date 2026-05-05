# Beta Integration Pathways — 21 Companies

Based on the contact-form audit (`beta-current-setup_v2.md`) plus the screenshots in `beta-contact-shots.pdf`, I've grouped each company by intake archetype and matched it to the lowest-friction PhotoBrief integration. Five archetypes cover all 21 accounts.

## Archetype Playbook

| # | Archetype | Best PhotoBrief pathway |
|---|-----------|-------------------------|
| A | **No form, phone/email only** | Hosted PhotoBrief link + QR; share via SMS auto-reply, voicemail script, "Text photos to…" page button |
| B | **Minimal form (name/email/msg)** | Add a "Send Photos" CTA button next to the form pointing to a hosted PhotoBrief intake; mention in the form's confirmation email |
| C | **Service-typed form (select/checkbox of services)** | Hosted PhotoBrief intake whose first question mirrors their service picker; replace or augment existing form, route by service |
| D | **Detailed form (address + services + project)** | Full replacement: rebuild their form in PhotoBrief 1:1 (incl. address, service checkboxes, project notes) and add photo step. Embed via iframe or link from their CTA |
| E | **Specialty intake (model/serial/parts)** | Custom PhotoBrief template with conditional fields for make/model/serial + photo of nameplate; especially high-value for appliance repair |

## Per-Company Recommendations

### Junk Removal (5)
- **Junkpire** — Archetype C. Mirror the 5-service checkbox; PhotoBrief replaces form, photos drive accurate volume quote. Link from "Contact" button.
- **YardSmart Lawn Care** — Archetype A. The "GET A FREE ESTIMATE" button is broken (loops to homepage). Point that button at a hosted PhotoBrief link — instant lift.
- **Junk Under Junk** — Archetype B. Add PhotoBrief CTA above existing form; their "Service" is freetext, so PhotoBrief's structured picker is an upgrade.
- **Trash Lovers** — Archetype B + social. 3-field form is too thin. Hosted link in IG/TikTok bio + SMS keyword (they already promote SMS).
- **Green Team** — Archetype A (form is unreachable per audit). Replace "Request a Quote" CTA with hosted PhotoBrief intake.
- **Junk Removal Inc.** — Archetype D. Already invites photos via SMS to 508-633-8879. Replace form 1:1 in PhotoBrief and route SMS auto-reply to the same link to consolidate.

### Landscaping (4)
- **Mass Landscape Inc** — Archetype C. Reuse their Subject select (Services/Complaints/etc.); only "Services" branch hits PhotoBrief photo step.
- **Northeast Landscape** — Archetype D. Their form is the most complete (city select, service checkboxes). Rebuild in PhotoBrief to add photos; embed via iframe so the page UX is unchanged.
- **Motta Landscaping** — Archetype B. Replace the dated form (incl. spam-checkbox) with PhotoBrief; net upgrade in UX and lead quality.
- **John's Landscape** — Archetype D. Keep promo-offer checkbox + "How did you hear" question in PhotoBrief; add photo step for design/install needs.

### Pest Control (2)
- **Ford's Hometown** — Archetype A. Phone-only; they already use a PestPortals customer login. Add PhotoBrief link as the public "new customer / show us the pest" path, complementing PestPortals for existing customers.
- **Big Blue Bug** — Archetype A. Contact page has no form. Drop PhotoBrief CTA on `/contact/` as the primary intake.

### Plumbing (4)
- **Plumbing Solutions** — Archetype C. Their "How can we help?" textarea becomes a PhotoBrief service select + photo of leak/fixture.
- **Pipe & Plumber** — Archetype C. Reuse their 6-option service select directly in PhotoBrief.
- **R. Fresolo** — Archetype D. Long, dated form with a captcha — strong candidate for full replacement. Map every field, drop the verification step (PhotoBrief handles spam).
- **Worcester MA Plumber** — Archetype C. Notable: a placeholder phone (616-123-4567) sits on their site — flag to customer. PhotoBrief replaces form and fixes that visibility risk.

### Appliance Repair (5) — highest PhotoBrief ROI segment
- **Bright Appliance** — Archetype E. They already ask for Make/Model/Serial/Part. PhotoBrief adds nameplate photo + appliance photo; conditional logic by appliance type.
- **Appliance Pro Care** — Archetype A. "Request Service" form is unreachable per audit. Replace with hosted PhotoBrief — biggest single uplift in the cohort.
- **SmartFix Appliance** — Archetype B → E. Upgrade thin form to appliance-typed intake with photos and model number.
- **Apex Appliance** — Archetype A. Phone/SMS only. SMS auto-reply with PhotoBrief link is the natural pathway.
- **Elite Appliance** — Archetype B → E. They run Cliengo chat — push PhotoBrief link from chat opener and as a button beside the form.

## Cross-Cutting Beta Tactics

1. **Hosted link first, embed second.** Every account gets a hosted PhotoBrief URL on day 1; iframe/embed only where the customer's site builder supports it (ruling out a few WordPress lock-ins).
2. **SMS auto-reply template.** For every account with a phone number (all 21), provide a copy-paste auto-reply: *"Thanks! Send photos + details here: [link]"*. Critical for archetypes A and the 4 SMS-promoting accounts.
3. **CTA copy guidance.** "Send Photos & Get a Quote" outperforms "Request Service" in tests — recommend uniformly.
4. **Map service picklists exactly.** Where a service select/checkbox already exists (8 accounts), mirror options verbatim so internal routing/reporting doesn't break.
5. **Flag site issues during onboarding.** YardSmart broken CTA, Worcester placeholder phone, Green Team / Appliance Pro Care broken forms — surface these as "wins we'll fix while we onboard you."

## Deliverable

On approval I'll generate `/mnt/documents/beta-integration-plan.pdf` (and a matching `.csv`) with one row per company: archetype, exact pathway, CTA copy, fields to mirror, and any site issues to flag.
