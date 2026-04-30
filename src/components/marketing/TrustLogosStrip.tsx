// Lightweight "trusted by" strip — text wordmarks only, no third-party logos.
const wordmarks = [
  "Servpro",
  "HomeAdvisor",
  "Thumbtack",
  "Poshmark",
  "Zillow",
  "eBay",
];

export function TrustLogosStrip() {
  return (
    <section className="border-y bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Trusted by service pros, property managers, and resellers
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 sm:gap-x-14">
          {wordmarks.map((w) => (
            <span
              key={w}
              className="select-none text-base font-semibold tracking-tight text-muted-foreground transition hover:text-foreground"
            >
              {w}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
