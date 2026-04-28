const stats = [
  { value: "40%", label: "Fewer wasted service calls" },
  { value: "8 min", label: "Avg. customer completion time" },
  { value: "3×", label: "Faster listing sell-through" },
  { value: "94%", label: "Submission readiness score" },
];

export function StatsBand() {
  return (
    <section className="relative overflow-hidden bg-gradient-brand text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-radial-glow"
      />
      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            The numbers speak for themselves
          </h2>
          <p className="mt-4 text-white/75">
            Real results from PhotoBrief users across industries.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-white/15 bg-white/[0.08] p-6 text-center backdrop-blur transition hover:bg-white/[0.12]"
            >
              <div className="text-4xl font-bold tracking-tight sm:text-5xl">
                {s.value}
              </div>
              <p className="mt-2 text-sm text-white/75">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
