import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";

export default function CreateRequestPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New request"
        description="Phase 7 will turn this into a chat-first AI request builder. Phase 1 placeholder."
      />
      <EmptyState
        icon={Sparkles}
        title="AI request builder coming soon"
        description="In Phase 7 you'll describe what photos you need and AI will draft the request, steps, questions, and intro message — editable before you send."
      />
    </div>
  );
}
