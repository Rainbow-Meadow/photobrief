import { useParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { useGuide, useGuides } from "@/hooks/useGuides";
import { EmptyState } from "@/components/shared/EmptyState";
import { BookOpen } from "lucide-react";

export default function GuideDetailPage() {
  const { id } = useParams();
  const guides = useGuides();
  const guide = useGuide(id) ?? guides[0];

  if (!guide) {
    return (
      <EmptyState icon={BookOpen} title="Guide not found" description="This guide no longer exists." />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={guide.name} description={guide.description} />

      <section className="rounded-lg border bg-card p-5 shadow-elev-sm">
        <h2 className="text-sm font-semibold text-foreground">
          Capture steps ({guide.steps.length})
        </h2>
        <ol className="mt-3 space-y-3">
          {guide.steps.map((step, i) => (
            <li key={step.id} className="flex gap-3 rounded-md border bg-background p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{step.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{step.instructions}</p>
              </div>
            </li>
          ))}
          {guide.steps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No steps defined yet.</p>
          ) : null}
        </ol>
      </section>

      {guide.questions.length > 0 ? (
        <section className="rounded-lg border bg-card p-5 shadow-elev-sm">
          <h2 className="text-sm font-semibold text-foreground">
            Context questions ({guide.questions.length})
          </h2>
          <ul className="mt-3 space-y-2">
            {guide.questions.map((q) => (
              <li key={q.id} className="rounded-md border bg-background p-3 text-sm text-foreground">
                {q.prompt}
                {q.required ? <span className="ml-1 text-destructive">*</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
