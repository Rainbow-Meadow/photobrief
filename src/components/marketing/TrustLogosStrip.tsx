const wordmarks = ["Servpro", "HomeAdvisor", "Thumbtack", "Poshmark", "Zillow", "eBay"];

export function TrustLogosStrip() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-center text-eyebrow">
          Trusted by service pros, property managers, and resellers
        </p>
        <div className="mx-auto mt-6 flex max-w-5xl flex-wrap items-center justify-center gap-x-10 gap-y-4 sm:gap-x-14">
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
