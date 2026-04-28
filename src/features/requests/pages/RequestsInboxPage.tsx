import { NavLink } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRequests } from "@/hooks/useRequests";
import { requestStatusOptions } from "@/config/statusOptions";
import { formatRelativeTime } from "@/utils/format";

export default function RequestsInboxPage() {
  const mockRequests = useRequests();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Requests"
        description="Every link you've sent and every brief you've received."
        actions={
          <Button asChild className="gap-1.5">
            <NavLink to="/requests/new">
              <Plus className="h-4 w-4" /> New request
            </NavLink>
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search recipient or guide…" />
      </div>

      <div className="overflow-hidden rounded-lg border bg-card shadow-elev-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">Recipient</th>
              <th className="px-5 py-3 font-medium">Guide</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Created</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {mockRequests.map((r) => {
              const status = requestStatusOptions[r.status];
              return (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-5 py-3">
                    <p className="font-medium text-foreground">{r.recipientName}</p>
                    <p className="text-xs text-muted-foreground">{r.recipientContact}</p>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{r.guideName}</td>
                  <td className="px-5 py-3">
                    <StatusBadge label={status.label} tone={status.tone} />
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {formatRelativeTime(r.createdAt)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button asChild variant="ghost" size="sm">
                      <NavLink to={`/requests/${r.id}`}>Open</NavLink>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
