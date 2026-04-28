const steps = [
  {
    title: "Choose a guide",
    body: "Pick from 20+ professional templates — or let AI build a custom one in seconds.",
  },
  {
    title: "Send a link",
    body: "Share a branded request link via SMS, email, or QR code. No app install required.",
  },
  {
    title: "Customer captures",
    body: "Your customer follows step-by-step photo prompts with framing overlays and tips.",
  },
  {
    title: "Review instantly",
    body: "AI summarises the submission, flags issues, and gives you a quote-ready packet.",
  },
];

export function HowItWorksSteps() {
  return (
    <section id="how-it-works" className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            From request to review in minutes
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            A complete photo workflow your customers can complete from their phone — no app, no confusion.
          </p>
        </div>

        <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {steps.map((s, i) => (
            <div key={s.title} className="relative">
              <div className="text-5xl font-bold leading-none tracking-tight text-muted-foreground/25 tabular-nums">
                0{i + 1}
              </div>
              <h3 className="mt-5 text-base font-semibold text-foreground">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
