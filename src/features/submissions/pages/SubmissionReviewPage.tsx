import { useParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReadinessProgress } from "@/components/shared/ReadinessProgress";
import { ReadinessScoreBadge } from "@/components/shared/ReadinessScoreBadge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useSubmission, useSubmissions } from "@/hooks/useSubmissions";
import { submissionStatusOptions } from "@/config/statusOptions";

export default function SubmissionReviewPage() {
  const { id } = useParams();
  const fallback = useSubmissions()[0];
  const submission = useSubmission(id) ?? fallback;
  const status = submissionStatusOptions[submission.status];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Brief from ${submission.recipientName}`}
        description={submission.guideName}
        actions={
          <div className="flex items-center gap-2">
            <ReadinessScoreBadge score={submission.readinessScore} />
            <StatusBadge label={status.label} tone={status.tone} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-4 lg:col-span-2">
          <div className="rounded-lg border bg-card p-5 shadow-elev-sm">
            <h2 className="text-sm font-semibold text-foreground">AI summary</h2>
            <p className="mt-2 text-sm text-foreground/90">{submission.aiSummary}</p>
            <div className="mt-4">
              <ReadinessProgress value={submission.readinessScore} />
              <p className="mt-2 text-xs text-muted-foreground">
                Suggested next action: {submission.suggestedNextAction}
              </p>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-5 shadow-elev-sm">
            <h2 className="text-sm font-semibold text-foreground">Photos</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Photo gallery, AI checks, and missing shots panel land in Phase 4–5.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="aspect-square rounded-md border bg-muted" />
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg border bg-card p-5 shadow-elev-sm">
            <h2 className="text-sm font-semibold text-foreground">Extracted details</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Labels, serials, and receipts will appear here in Phase 5.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-5 shadow-elev-sm">
            <h2 className="text-sm font-semibold text-foreground">Internal notes</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Team-only notes and activity timeline arrive in Phase 5+.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
