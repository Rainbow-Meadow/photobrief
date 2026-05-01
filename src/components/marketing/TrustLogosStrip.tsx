import { ShieldCheck, Sparkles, Lock } from "lucide-react";

/**
 * "TrustLogosStrip" — honest beta-era trust band.
 *
 * We're invite-only beta and don't yet have a stable of real customer logos
 * to display. Showing fictitious logos would erode the very trust we're
 * trying to build, so this band instead leans on three concrete, verifiable
 * trust signals: who it's built for, what's guaranteed, and what's never
 * shared.
 */
const SIGNALS = [
  {
    icon: Sparkles,
    label: "In private beta with home-services teams",
    detail: "Built with roofing, HVAC, junk removal, and claims operators.",
  },
  {
    icon: ShieldCheck,
    label: "First-pass guarantee",
    detail: "If a submission needs rework, that request is refunded.",
  },
  {
    icon: Lock,
    label: "Customer photos stay yours",
    detail: "Per-workspace storage. Never used to train external models.",
  },
] as const;

export function TrustLogosStrip() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-center text-eyebrow">Why early teams trust PhotoBrief</p>
        <div className="mx-auto mt-6 grid max-w-5xl gap-4 sm:grid-cols-3">
          {SIGNALS.map(({ icon: Icon, label, detail }) => (
            <div
              key={label}
              className="glass flex items-start gap-3 rounded-2xl px-4 py-3 text-left"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
