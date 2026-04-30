import { MessageSquare, Sparkles, CheckCircle2, Camera } from "lucide-react";
import wideGarage from "@/assets/junk-removal/wide-garage.jpg";
import pileCloseup from "@/assets/junk-removal/pile-closeup.jpg";
import mattress from "@/assets/junk-removal/mattress.jpg";
import appliances from "@/assets/junk-removal/appliances.jpg";
import drivewayAccess from "@/assets/junk-removal/driveway-access.jpg";
import threshold from "@/assets/junk-removal/threshold.jpg";

const SHOTS = [
  { src: wideGarage, label: "Wide garage", ok: true },
  { src: pileCloseup, label: "Main pile", ok: true },
  { src: mattress, label: "Mattress + box spring", ok: true },
  { src: appliances, label: "Appliances", ok: true },
  { src: drivewayAccess, label: "Driveway access", ok: true },
  { src: threshold, label: "Threshold", ok: true },
];

/**
 * Decorative product preview — pure CSS, no real product behavior.
 * Mirrors the real PhotoBrief flow:
 *  - Left: chat-first capture (PublicRecipientPage) the customer sees
 *  - Right: submission review (SubmissionReviewPage) the operator sees
 */
export function HeroProductMockup() {
  return (
    <div className="relative mx-auto w-full max-w-5xl">
      {/* Glow */}
      <div
        aria-hidden
        className="absolute inset-x-8 -top-6 -bottom-6 rounded-[2rem] bg-gradient-to-br from-primary/20 via-primary/5 to-transparent blur-2xl"
      />

      <div className="relative overflow-hidden rounded-2xl border bg-card shadow-elev-lg">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
          <div className="ml-3 flex-1">
            <div className="mx-auto w-full max-w-md truncate rounded-md bg-background px-3 py-1 text-center text-[11px] text-muted-foreground">
              photobrief.app/r/marcus-t
            </div>
          </div>
        </div>

        {/* Two-pane preview */}
        <div className="grid gap-px bg-border md:grid-cols-2">
          {/* CUSTOMER SEES — chat-first capture */}
          <div className="bg-muted/20 p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Customer sees →
            </p>

            <div className="mt-4 space-y-3">
              {/* Assistant: prompt for next photo */}
              <div className="flex gap-2">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-elev-sm">
                  <MessageSquare className="h-3.5 w-3.5" />
                </span>
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm border bg-card px-3 py-2 shadow-elev-sm">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Photo 2 of 6
                  </p>
                  <p className="text-xs font-semibold text-foreground">
                    Close-up of the main pile
                  </p>
                  <p className="text-[11px] leading-relaxed text-foreground/90">
                    Stand about 6 feet back so we can see the full volume.
                  </p>
                </div>
              </div>

              {/* User: photo bubble */}
              <div className="flex flex-row-reverse gap-2">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                  You
                </span>
                <div className="w-full max-w-[78%] overflow-hidden rounded-2xl rounded-tr-sm bg-primary p-1 shadow-elev-sm">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                    <img
                      src={pileCloseup}
                      alt="Close-up of a household junk pile inside a single-car garage"
                      width={768}
                      height={576}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Assistant: AI feedback */}
              <div className="flex gap-2">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-elev-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm border bg-card px-3 py-2 shadow-elev-sm">
                  <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-success">
                    <CheckCircle2 className="h-3 w-3" /> Looks great
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-foreground/90">
                    Clear view of the pile. One more — the driveway where our truck will park.
                  </p>
                </div>
              </div>

              {/* Composer */}
              <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 shadow-elev-sm">
                <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="flex-1 text-[11px] text-muted-foreground">
                  Take photo or upload
                </span>
                <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground">
                  Send
                </span>
              </div>
            </div>
          </div>

          {/* YOU SEE — submission review */}
          <div className="bg-card p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              You see →
            </p>

            <div className="mt-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Marcus T. — Garage Cleanout
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Submitted 2 min ago · 6 of 6 photos
                </p>
              </div>
              <span className="inline-flex flex-col items-center rounded-md bg-success/10 px-2.5 py-1 text-success">
                <span className="text-sm font-bold leading-none">94%</span>
                <span className="text-[9px] font-semibold uppercase tracking-wide">
                  Readiness
                </span>
              </span>
            </div>

            {/* AI summary */}
            <div className="mt-4 rounded-lg border bg-accent/40 p-3">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-accent-foreground">
                <Sparkles className="h-3 w-3" /> AI summary
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-foreground">
                Single-car garage cleanout, ~½ truckload. Mattress, box spring,
                and a mini-fridge flagged for oversize handling. Ground-level
                access, driveway fits a 16-ft truck — ready to dispatch.
              </p>
            </div>

            {/* Shot grid */}
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {SHOTS.map((shot, i) => (
                <div
                  key={i}
                  className="relative aspect-square overflow-hidden rounded-md border bg-muted"
                >
                  <img
                    src={shot.src}
                    alt={shot.label}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                    width={256}
                    height={256}
                  />
                  <span className="absolute right-1 top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-success text-success-foreground shadow-elev-sm">
                    <CheckCircle2 className="h-3 w-3" />
                  </span>
                </div>
              ))}
            </div>

            {/* Action row */}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-md border bg-card py-2 text-xs font-medium text-foreground"
              >
                Ask for more
              </button>
              <button
                type="button"
                className="flex-[2] rounded-md bg-primary py-2 text-xs font-semibold text-primary-foreground"
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
