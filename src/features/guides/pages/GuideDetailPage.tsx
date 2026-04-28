import { useParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { mockGuides } from "@/config/mockData";

export default function GuideDetailPage() {
  const { id } = useParams();
  const guide = mockGuides.find((g) => g.id === id) ?? mockGuides[0];
  return (
    <div className="space-y-6">
      <PageHeader title={guide.name} description={guide.description} />
      <div className="rounded-lg border bg-card p-5 shadow-elev-sm">
        <h2 className="text-sm font-semibold text-foreground">Steps & context questions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Step editor and context-question editor arrive in Phase 2.
        </p>
      </div>
    </div>
  );
}
