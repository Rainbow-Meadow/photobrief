import { CheckCircle2, Sparkles, Camera, ShieldCheck, FileText, AlertTriangle } from "lucide-react";
import leakPhoto from "@/assets/leak-photo.jpg";
import wideScene from "@/assets/submission/wide-scene.jpg";
import pipeConnections from "@/assets/submission/pipe-connections.jpg";
import shutoffValve from "@/assets/submission/shutoff-valve.jpg";
import waterDamage from "@/assets/submission/water-damage.jpg";
import blurryRetake from "@/assets/submission/blurry-retake.jpg";

const SHOTS = [
  { src: wideScene, label: "Wide scene", ok: true },
  { src: leakPhoto, label: "Close-up of leak", ok: true },
  { src: pipeConnections, label: "Pipe connections", ok: true },
  { src: shutoffValve, label: "Shutoff valve", ok: true },
  { src: blurryRetake, label: "Under-sink area", ok: false },
  { src: waterDamage, label: "Water damage", ok: true },
];

/**
 * HeroGlassStory — premium Apple-style product narrative.
 * Two floating glass panels: customer guided capture (left, slightly behind)
 * and business-ready brief (right, in front), set against an ambient sky.
 * Pure CSS, no real product behavior.
 */
export function HeroGlassStory() {
  return (
    <div className="relative mx-auto w-full max-w-6xl">
      {/* Ambient sky behind the panels */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 rounded-[3rem] bg-ambient-sky"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-10 -inset-y-10 -z-10 rounded-[3rem] bg-ambient-mesh blur-2xl"
      />

      <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-[5fr_7fr] lg:gap-10">
        {/* CUSTOMER PANEL ----------------------------------------- */}
        <div className="relative lg:translate-y-6">
          <div className="glass-strong relative rounded-[28px] p-5 shadow-glass-lg sm:p-6 animate-lift-in">
            <div className="flex items-center justify-between">
              <span className="text-eyebrow">Customer · on phone</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Photo 2 of 6
              </span>
            </div>

            {/* Assistant prompt bubble */}
            <div className="mt-4 flex items-start gap-2.5">
              <span className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
                <Sparkles className="h-3.5 w-3.5" />
                <span aria-hidden className="lens-ring absolute -inset-0.5 rounded-full opacity-70" />
              </span>
              <div className="glass max-w-[88%] rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                <p className="text-[13px] font-semibold text-foreground">Close-up of the leak</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-foreground/80">
                  Get within arm's reach so we can see where water is coming from.
                </p>
              </div>
            </div>

            {/* User photo bubble */}
            <div className="mt-3 flex flex-row-reverse items-start gap-2.5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                You
              </span>
              <div className="overflow-hidden rounded-2xl rounded-tr-sm bg-gradient-primary p-1 shadow-glow">
                <div className="relative aspect-[4/3] w-[220px] overflow-hidden rounded-[14px] sm:w-[260px]">
                  <img
                    src={leakPhoto}
                    alt="Close-up of a leaking P-trap pipe"
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="eager"
                    width={520}
                    height={390}
                  />
                </div>
              </div>
            </div>

            {/* AI feedback */}
            <div className="mt-3 flex items-start gap-2.5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-elev-sm">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <div className="glass max-w-[88%] rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-success">
                  <CheckCircle2 className="h-3 w-3" /> Looks great
                </p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-foreground/80">
                  Sharp focus on the joint. One more — the shutoff valve.
                </p>
              </div>
            </div>

            {/* Composer */}
            <div className="glass mt-4 flex items-center gap-2 rounded-full px-3 py-1.5">
              <Camera className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="flex-1 text-[12px] text-muted-foreground">Take photo or upload</span>
              <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground">
                Send
              </span>
            </div>
          </div>
        </div>

        {/* BUSINESS BRIEF PANEL ----------------------------------- */}
        <div className="relative">
          <div className="glass-strong relative rounded-[28px] p-5 shadow-glass-lg sm:p-7 animate-lift-in [animation-delay:120ms]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-eyebrow">Business-ready brief</span>
                <p className="mt-1 text-[15px] font-semibold text-foreground">Sarah M. — Plumbing Leak</p>
                <p className="text-[12px] text-muted-foreground">Submitted 2 min ago · 6 of 6 photos</p>
              </div>

              {/* Readiness ring */}
              <div className="relative h-[72px] w-[72px] shrink-0">
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                  <circle cx="18" cy="18" r="15.5" className="fill-none stroke-muted" strokeWidth="3" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    className="fill-none stroke-success [stroke-dasharray:97.4] [stroke-dashoffset:13.6]"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-semibold leading-none text-foreground tabular-nums">86</span>
                  <span className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">Readiness</span>
                </div>
              </div>
            </div>

            {/* AI summary */}
            <div className="glass mt-4 rounded-2xl p-3.5">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                <Sparkles className="h-3 w-3" /> AI summary
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-foreground">
                P-trap leak under the kitchen sink. Shutoff valve accessible. All critical photos captured — ready to quote.
              </p>
            </div>

            {/* Shot grid */}
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <p className="text-eyebrow">Captured shots</p>
                <span className="text-[11px] text-muted-foreground">5 pass · 1 retake</span>
              </div>
              <div className="mt-2 grid grid-cols-6 gap-1.5">
                {SHOTS.map((shot, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-lg hairline">
                    <img
                      src={shot.src}
                      alt={shot.label}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                      width={120}
                      height={120}
                    />
                    <span
                      className={
                        "absolute right-1 top-1 inline-flex h-4 w-4 items-center justify-center rounded-full shadow " +
                        (shot.ok ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground")
                      }
                    >
                      {shot.ok ? <CheckCircle2 className="h-2.5 w-2.5" /> : <AlertTriangle className="h-2.5 w-2.5" />}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Extracted details + actions */}
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="glass rounded-2xl px-3.5 py-2.5">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <FileText className="h-3 w-3" /> Extracted
                </p>
                <p className="mt-1 text-[12px] text-foreground">Brand: Moen · Pipe: 1¼" PVC</p>
              </div>
              <div className="glass rounded-2xl px-3.5 py-2.5">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-success">
                  <ShieldCheck className="h-3 w-3" /> Quote-ready
                </p>
                <p className="mt-1 text-[12px] text-foreground">First-pass guarantee active</p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="glass flex-1 rounded-full px-3 py-2 text-[12px] font-medium text-foreground"
              >
                Ask for more
              </button>
              <button
                type="button"
                className="btn-primary-glass flex-[2] rounded-full px-3 py-2 text-[12px] font-semibold text-primary-foreground"
              >
                Mark reviewed
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
