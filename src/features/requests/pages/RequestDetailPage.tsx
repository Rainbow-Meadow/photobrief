import { NavLink, useParams } from "react-router-dom";
import { Copy, Send } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { useRequest, useRequests } from "@/hooks/useRequests";
import { requestStatusOptions } from "@/config/statusOptions";

export default function RequestDetailPage() {
  const { id } = useParams();
  const fallback = useRequests()[0];
  const request = useRequest(id) ?? fallback;
  const status = requestStatusOptions[request.status];

  return (
    <div className="space-y-6">
      <PageHeader
        title={request.recipientName}
        description={request.guideName}
        actions={<StatusBadge label={status.label} tone={status.tone} />}
      />

      <section className="rounded-lg border bg-card p-5 shadow-elev-sm">
        <h2 className="text-sm font-semibold text-foreground">Recipient link</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Share this link via SMS, email, or your CRM. Recipient does not need an account.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <code className="flex-1 truncate rounded-md border bg-muted px-3 py-2 text-xs">
            https://photobrief.app/r/{request.token}
          </code>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Copy className="h-4 w-4" /> Copy
          </Button>
          <Button asChild size="sm" className="gap-1.5">
            <NavLink to={`/r/${request.token}`} target="_blank">
              <Send className="h-4 w-4" /> Preview
            </NavLink>
          </Button>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5 shadow-elev-sm">
        <h2 className="text-sm font-semibold text-foreground">Activity</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Reminders, recipient progress, and AI feedback will appear here in Phase 4+.
        </p>
      </section>
    </div>
  );
}
