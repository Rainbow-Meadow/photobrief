import { Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";

export default function TeamSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Team" description="Invite teammates and manage roles." />
      <EmptyState
        icon={Users}
        title="Team management lands in Phase 10"
        description="Roles live in a separate user_roles table with a security-definer has_role() function — never on profiles."
      />
    </div>
  );
}
