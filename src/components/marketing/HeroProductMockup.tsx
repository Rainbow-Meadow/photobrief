import { Camera, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import leakPhoto from "@/assets/leak-photo.jpg";

/**
 * Decorative product preview — pure CSS, no real product behavior.
 * Renders the dual-pane "Customer sees / You see" mock from the brand reference.
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
              photobrief.app/r/sarah-m/plumbing-brief
            </div>
          </div>
        </div>

        {/* Two-pane preview */}
        <div className="grid gap-px bg-border md:grid-cols-2">
          {/* CUSTOMER SEES */}
          <div className="bg-card p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Customer sees →
            </p>
            <div className="mt-4 rounded-xl border bg-background p-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-foreground">
                  <Camera className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">Step 2 of 6</p>
                  <p className="text-[11px] text-muted-foreground">Close-up of the leak</p>
                </div>
              </div>
              <div className="relative mt-3 aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                <img
                  src={leakPhoto}
                  alt="Close-up of a leaking P-trap pipe under a kitchen sink"
                  width={768}
                  height={576}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {/* faux framing overlay */}
                <div className="absolute inset-4 rounded-md border-2 border-dashed border-white/70" />
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground shadow-sm">
                  Get close, keep it in focus
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="flex-1 rounded-md border bg-card py-2 text-xs font-medium text-muted-foreground"
                >
                  Skip
                </button>
                <button
                  type="button"
                  className="flex-[2] rounded-md bg-primary py-2 text-xs font-semibold text-primary-foreground"
                >
                  Capture
                </button>
              </div>
            </div>
          </div>

          {/* YOU SEE */}
          <div className="bg-card p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              You see →
            </p>
            <div className="mt-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Sarah M. — Plumbing Leak
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Submitted 2 min ago
                </p>
              </div>
              <span className="inline-flex flex-col items-center rounded-md bg-success/10 px-2.5 py-1 text-success">
                <span className="text-sm font-bold leading-none">86%</span>
                <span className="text-[9px] font-semibold uppercase tracking-wide">
                  Readiness
                </span>
              </span>
            </div>

            <div className="mt-4 rounded-lg border bg-accent/40 p-3">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-accent-foreground">
                <Sparkles className="h-3 w-3" /> AI Summary
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-foreground">
                Customer reports a P-trap leak under the kitchen sink. Shutoff valve accessible.
                All critical photos captured — ready to quote.
              </p>
            </div>

            <ul className="mt-3 space-y-1.5">
              {[
                { label: "Wide scene shot", ok: true },
                { label: "Close-up of leak", ok: false },
                { label: "Pipe connections", ok: true },
                { label: "Shutoff valve", ok: true },
              ].map((row) => (
                <li
                  key={row.label}
                  className="flex items-center justify-between rounded-md border bg-background px-3 py-1.5 text-xs text-foreground"
                >
                  <span className="inline-flex items-center gap-2">
                    {row.ok ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-warning" />
                    )}
                    {row.label}
                  </span>
                  {!row.ok ? (
                    <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">
                      Retake suggested
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
