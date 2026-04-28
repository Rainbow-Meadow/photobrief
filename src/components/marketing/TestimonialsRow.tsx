import { Star } from "lucide-react";

const testimonials = [
  {
    quote:
      "We cut wasted service calls by 40%. Customers send us everything we need before we ever leave the shop.",
    name: "Derek M.",
    role: "Owner, Bright Pipe Plumbing",
  },
  {
    quote:
      "Move-in documentation used to take us an hour. Now tenants do it themselves in 8 minutes and I get a PDF.",
    name: "Alicia R.",
    role: "Property Manager, 120 units",
  },
  {
    quote:
      "My listings sell 3× faster since I started using PhotoBrief. The shot checklists are a game changer.",
    name: "James T.",
    role: "Marketplace Reseller",
  },
];

export function TestimonialsRow() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Loved by pros who hate wasted time
          </h2>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="flex h-full flex-col rounded-2xl border bg-card p-6 shadow-elev-sm"
            >
              <div className="flex items-center gap-1 text-warning">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground">
                "{t.quote}"
              </blockquote>
              <figcaption className="mt-5">
                <p className="text-sm font-semibold text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
