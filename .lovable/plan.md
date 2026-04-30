# Replace landing hero example with a Junk Removal brief

The landing page hero (`HeroGlassStory`) currently shows a plumbing leak example: a customer-side chat with a leak close-up, plus a 6-shot business "brief" panel. I'll swap it for a junk removal request with brand-new, fully photorealistic, visually consistent images that depict a *well-completed* brief (all six shots pass, no retake warning).

## Scenario

**Customer:** Marcus T. — Garage Cleanout
**Job:** ~½ truckload of household junk in a single-car garage, ready for pickup
**Critical photos (6 of 6, all green):**
1. Wide shot of the garage from the open door (scale + access)
2. Close-up of the main pile (volume estimate)
3. Old mattress + box spring leaning against wall (oversize item)
4. Small appliance pile — broken microwave + mini-fridge (special handling)
5. Driveway / truck access view (where the truck will park)
6. Stair / threshold check at garage entry (no stairs, ground level)

The right-hand "AI summary" will read like a real dispatcher-ready brief: estimated volume, oversize items flagged, truck access confirmed, no stairs.

## Image generation

Generate 6 photorealistic JPGs via the Lovable AI image model (`google/gemini-3-pro-image-preview` for hero quality), with a shared style spec to guarantee consistency:

- Same suburban single-car garage, same daylight (overcast late afternoon, soft shadows)
- Same homeowner-phone perspective (handheld, ~chest height, slight wide-angle)
- Same color palette: warm beige garage walls, gray concrete floor, muted browns/blues in the junk pile
- No text, no watermarks, no people's faces
- Realistic camera grain, natural color, no HDR look
- Square crop friendly (the brief grid renders them as squares)

Files written to `src/assets/junk-removal/`:
- `wide-garage.jpg` — hero "close-up" used in the chat bubble + grid slot 1
- `pile-closeup.jpg`
- `mattress.jpg`
- `appliances.jpg`
- `driveway-access.jpg`
- `threshold.jpg`

After generation, I'll visually QA each image (open and inspect) and re-generate any that drift in style or look obviously AI before wiring them in.

## Code changes

**`src/components/marketing/HeroGlassStory.tsx`** — rewrite the example content:
- Swap all 6 image imports to the new junk-removal assets
- Update `SHOTS` array labels (Wide garage, Main pile, Mattress, Appliances, Driveway access, Threshold) and set **all six `ok: true`** so the brief reads as fully complete
- Update the chat bubbles:
  - Assistant prompt: "Photo 2 of 6 — Close-up of the main pile" / "Stand about 6 feet back so we can see the full volume."
  - User photo bubble uses `pile-closeup.jpg`
  - AI feedback: "Looks great — clear view of the pile. One more — the driveway where our truck will park."
- Update the brief panel:
  - Title: "Marcus T. — Garage Cleanout"
  - Subtitle: "Submitted 2 min ago · 6 of 6 photos"
  - Readiness ring: bump to **94** (fully complete brief), recompute the `stroke-dashoffset` accordingly
  - Footer counter: "6 pass · 0 retakes"
  - AI summary: "Single-car garage cleanout, ~½ truckload. Mattress + box spring and a mini-fridge flagged for oversize/appliance handling. Ground-level access, driveway fits a 16-ft truck — ready to dispatch."
  - Extracted card: "Volume: ~½ truck · Oversize: mattress, mini-fridge"
  - Quote-ready card copy unchanged ("First-pass guarantee active")

**`HeroProductMockup.tsx`** is not imported by Landing — leave it alone to avoid scope creep, but note in the response that it still references the leak photos in case the user wants that updated too.

**`Landing.tsx`** — no change (already imports `HeroGlassStory`).

## Out of scope

- The PublicRecipientPage / SubmissionReviewPage product flows — only the marketing mockup changes
- The `leak-photo.jpg` and `submission/*.jpg` assets stay on disk (still used by the unused `HeroProductMockup`)

## QA

After the edit:
1. View each generated image to confirm photorealism and visual consistency (same garage, lighting, perspective)
2. Load `/` in the preview at 1313×887 and confirm the hero panels render with the new images, no broken layouts, all six shot tiles green
