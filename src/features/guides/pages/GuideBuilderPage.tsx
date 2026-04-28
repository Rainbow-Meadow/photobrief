import { Wand2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";

export default function GuideBuilderPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New guide"
        description="Build a reusable photo guide. AI generator lands in Phase 8."
      />
      <EmptyState
        icon={Wand2}
        title="Guide builder coming in Phase 2"
        description="Add capture steps, context questions, and AI checks. Then send the guide as a request or save it for reuse."
      />
    </div>
  );
}
