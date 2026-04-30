
# PhotoBrief demo video — end-to-end request flow

A ~25 second, 1920×1080 / 30fps MP4 rendered with Remotion, captions/text only (no voiceover). Reuses the existing junk-removal "Garage Cleanout" photos and the landing-page visual language (glass panels, ambient sky background, primary/primary-glow gradient) so the video feels like a natural extension of the marketing site.

Final output: `/mnt/documents/photobrief-demo.mp4`

## Story (5 scenes, ~25s total)

```
[0:00] LOGO IN          1.5s   PhotoBrief wordmark fades up over ambient sky
[0:01] STEP 1 — SEND    4.5s   "Sarah at Apex Junk Removal sends a request"
                                Phone-shaped card composes a brief, taps Send
[0:06] STEP 2 — RECEIVE 4.5s   "Marcus gets a text with one link"
                                SMS bubble drops in, link expands into chat UI
[0:10] STEP 3 — CAPTURE 7s     "AI guides him photo by photo"
                                6 photo tiles fly in one by one (the existing
                                wide-garage / pile / mattress / appliances /
                                driveway / threshold images), each gets a green
                                check, mini "AI feedback" bubbles appear
[0:17] STEP 4 — BRIEF   5s     "Sarah opens a complete, dispatch-ready brief"
                                Glass brief panel assembles: 6/6 photos grid,
                                94% readiness ring spins up, AI summary types in
[0:22] CLOSING          3s     Tagline: "Send a link. Get a complete brief."
                                CTA-style logo lockup + photobrief.ai
```

Total: ~25.5s = 765 frames at 30fps.

## Visual direction

- **Palette** — pulled from the landing page CSS tokens: primary `hsl(var(--primary))` blue with `--primary-glow` gradient, near-white glass panels with subtle border, soft warm ambient mesh background (matches `bg-ambient-sky` / `bg-ambient-mesh`).
- **Typography** — Inter (Google Font, loaded via `@remotion/google-fonts/Inter`) for UI/body, Inter 800 for the big captions. Matches site.
- **Motion system** — default entrance: 18-frame spring (`damping: 20, stiffness: 180`) with a 6px upward translate + opacity 0→1. Hero/accent moments (logo, readiness ring, tagline) use a bouncier spring (`damping: 12`). Scene-to-scene uses `<TransitionSeries>` with `fade` (15-frame springTiming) — restrained, premium, no flashy wipes.
- **Camera feel** — every scene has a slow 1.02→1.06 scale drift on its hero element so nothing feels static.
- **Layout** — asymmetric: phone/chat panels left-aligned with caption text right; brief panel center-stage. Never dead-centered until the closing tagline.

## Scene details

**Scene 1 — Logo in (45 frames)**
Wordmark "PhotoBrief" springs up center, with the small `Sparkles` glyph and tagline "AI-guided visual intake" fading in beneath.

**Scene 2 — Business sends request (135 frames)**
- Left: a faux desktop "New request" card (rounded glass, matches `RequestDraftPreview`): title "Garage Cleanout", recipient "Marcus T. · 555-0142", a 3-line preview of the guide steps.
- Cursor glides to a primary "Send request" button; on click the button pulses and a paper-plane icon flies off-screen right.
- Right: caption "1. Build a brief in seconds" with sub-line "Pick a template or describe the job."

**Scene 3 — Customer receives link (135 frames)**
- A phone-frame mockup slides up from bottom.
- An SMS bubble appears: "Apex Junk Removal: Tap to send a few photos so we can quote your cleanout → photobrief.ai/r/4f8a"
- Bubble link expands into the recipient chat header ("Apex Junk Removal · Garage Cleanout") and the first assistant prompt ("Photo 1 of 6 — Wide shot of the garage").
- Caption right: "2. Customer just taps a link" / "No app install. Works on any phone."

**Scene 4 — Guided capture with AI checks (210 frames)**
The hero scene. Phone frame stays anchored on the left; on the right, a 3×2 grid of the six junk-removal photos populates one tile at a time with a 22-frame stagger:
1. wide-garage → green check + "Great wide shot"
2. pile-closeup → "Volume looks like ~½ truck"
3. mattress → "Oversize item flagged"
4. appliances → "Mini-fridge — special handling"
5. driveway-access → "Truck access confirmed"
6. threshold → "Ground-level entry"

After tile 6 a small "6 of 6 ✓" pill pops in. Caption right: "3. AI guides every photo" / "Quality-checked in real time."

**Scene 5 — Business gets the finished brief (150 frames)**
- The phone fades back, the photo grid morphs/scales into the right-hand glass brief panel from the landing page (same look as `HeroGlassStory`'s right column).
- Header: "Marcus T. — Garage Cleanout · 6 of 6 photos"
- Readiness SVG ring animates 0 → 94% (interpolating `strokeDashoffset` over 30 frames)
- AI summary types in line by line: "Single-car garage cleanout, ~½ truckload. Mattress + box spring and mini-fridge flagged for oversize/appliance handling. Ground-level access, driveway fits a 16-ft truck — ready to dispatch."
- Small "First-pass guarantee active" chip slides in at the bottom.
- Caption left: "4. Dispatch-ready brief" / "Quote and schedule on the spot."

**Scene 6 — Closing (90 frames)**
Big centered tagline "Send a link. Get a complete brief." with the gradient applied to "complete brief" (matches the H1 on `Landing.tsx`). Below: "photobrief.ai" in muted foreground. A subtle floating-shapes background ties it back to the hero.

## Technical implementation

Following the `skill/remotion-video` workflow exactly:

1. **Scaffold** at `/dev-server/remotion/`:
   - `bun init -y`
   - Install: `remotion @remotion/cli @remotion/renderer @remotion/bundler @remotion/compositor-linux-x64-musl @remotion/transitions @remotion/google-fonts react react-dom typescript @types/react`
   - Apply the NixOS compositor fix: copy musl `remotion` binary over the gnu path, symlink system `ffmpeg`/`ffprobe` into the gnu compositor dir.
   - Write `tsconfig.json` (jsx `react-jsx`, module `Preserve`).

2. **Project files**:
   ```
   remotion/
     src/
       index.ts                    registerRoot(RemotionRoot)
       Root.tsx                    <Composition id="main" 1920x1080 fps=30 durationInFrames≈755>
       MainVideo.tsx               <TransitionSeries> wiring scenes 1–6 with fade transitions
       theme.ts                    Color tokens copied from src/index.css (HSL → hex), spring presets
       components/
         AmbientBackground.tsx     Persistent gradient + soft floating blobs (no backdropFilter — uses filter: blur sparingly)
         GlassPanel.tsx            Reusable rounded-2xl panel with border + shadow
         Caption.tsx               Large headline + sub line, used in scenes 2–5
         PhoneFrame.tsx            iPhone-ish frame for chat scenes
         ReadinessRing.tsx         Animated SVG ring driven by a 0–1 progress prop
       scenes/
         SceneLogo.tsx
         SceneSend.tsx
         SceneReceive.tsx
         SceneCapture.tsx
         SceneBrief.tsx
         SceneClosing.tsx
     public/
       photos/                     Copied from src/assets/junk-removal/*.jpg via code--copy
   ```

3. **Assets** — `code--copy` the 6 existing junk-removal jpgs from `src/assets/junk-removal/` into `remotion/public/photos/`, referenced via `staticFile('photos/wide-garage.jpg')` etc. No new image generation needed (reuses what's already on the landing page → guarantees brand consistency).

4. **Fonts** — `loadFont` from `@remotion/google-fonts/Inter` at module scope (weights 400/600/800).

5. **Animation rules** — every motion via `useCurrentFrame()` + `interpolate()`/`spring()`. No CSS transitions, no Framer Motion, no `backdropFilter` (sandbox Chromium constraint).

6. **Render** — programmatic script at `remotion/scripts/render-remotion.mjs` (per skill best practice), with `chromeMode: "chrome-for-testing"`, `muted: true`, `concurrency: 1`, `browserExecutable: "/bin/chromium"`, output → `/mnt/documents/photobrief-demo.mp4`.

7. **QA** — render `bunx remotion still` checkpoints at frames 30, 180, 360, 540, 720 to spot-check each scene before the full render. Then render the full video and report file size + path.

## Out of scope

- No voiceover / no audio (the user picked the captions-only option). Final MP4 will be muted.
- No background music (can be added later by mixing externally).
- Video is generated as a downloadable artifact only — not embedded into the React app or wired into the landing page in this pass. After delivery, the user can ask me to add it to the hero or a "Watch demo" modal.
- The 6 junk-removal photos are reused as-is — no new image generation.
