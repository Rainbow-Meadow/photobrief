import {
  Wrench,
  Building2,
  Tag,
  Megaphone,
  FileText,
  MessageSquare,
} from "lucide-react";

const industries = [
  { icon: Wrench, title: "Plumbers & HVAC", outcome: "Get leak photos before dispatch" },
  { icon: Building2, title: "Property Managers", outcome: "Move-in/out condition reports" },
  { icon: Tag, title: "Resellers", outcome: "Listing-ready photos in 5 min" },
  { icon: Megaphone, title: "Small Businesses", outcome: "Social content shot checklists" },
  { icon: FileText, title: "Insurance Agents", outcome: "Structured damage documentation" },
  { icon: MessageSquare, title: "Service Providers", outcome: "Diagnose before the visit" },
];

export function IndustryGrid() {
  return (
    <section id="use-cases" className="relative overflow-hidden bg-background">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-ambient-sky opacity-50" />
      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-eyebrow">Industries</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Built for your industry
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Whether you're diagnosing, documenting, selling, or creating — there's a PhotoBrief for it.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {industries.map((i) => (
            <article
              key={i.title}
              className="group glass-strong rounded-2xl p-5 lift-on-hover"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow transition">
                <i.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-foreground">{i.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{i.outcome}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
