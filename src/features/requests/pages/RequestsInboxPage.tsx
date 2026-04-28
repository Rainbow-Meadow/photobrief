import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { Plus, Send, Eye, Bell, MoreHorizontal, Archive, Trash2, UserPlus, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ReadinessScoreBadge } from "@/components/shared/ReadinessScoreBadge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRequests } from "@/hooks/useRequests";
import { useCurrentWorkspace } from "@/hooks/useCurrentWorkspace";
import { requestStatusOptions } from "@/config/statusOptions";
import { formatRelativeTime } from "@/utils/format";
import { guideTemplates } from "@/config/guideTemplates";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { toast } from "sonner";
import { notificationService } from "@/services/notificationService";
import { messagingService } from "@/services/messagingService";
import { requestsService } from "@/services/requestsService";
import { usePlan } from "@/hooks/usePlan";
import { getPlanLimit, minPlanFor } from "@/config/planLimits";
import { supabase } from "@/integrations/supabase/client";
import {
  InboxFilters,
  applyInboxFilters,
  defaultInboxFilters,
  type InboxFilterState,
} from "@/features/requests/components/InboxFilters";
import type { RequestStatus } from "@/types/photobrief";

export default function RequestsInboxPage() {
  const requests = useRequests();
  const { workspace } = useCurrentWorkspace();
  const teamMembers = useTeamMembers();
  const queryClient = useQueryClient();
  const { can } = usePlan();
  const canRemind = can("reminders");
  const canBulk = can("bulk_actions");
  const canAssign = can("assignments");
  const [searchParams] = useSearchParams();
  const initialStatus = (searchParams.get("status") ?? "all") as RequestStatus | "all";
  const [filters, setFilters] = useState<InboxFilterState>({
    ...defaultInboxFilters,
    status: initialStatus,
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  // Realtime: refetch when this workspace's requests/submissions change.
  useEffect(() => {
    const wsId = workspace?.id;
    if (!wsId) return;
    const channel = supabase
      .channel(`inbox-${wsId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "photo_brief_requests", filter: `workspace_id=eq.${wsId}` },
        () => queryClient.invalidateQueries({ queryKey: ["requests", wsId] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submissions", filter: `workspace_id=eq.${wsId}` },
        () => queryClient.invalidateQueries({ queryKey: ["requests", wsId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspace?.id, queryClient]);

  const filtered = useMemo(() => applyInboxFilters(requests, filters), [requests, filters]);

  const guides = useMemo(
    () => guideTemplates.map((g) => ({ id: g.id, name: g.name })),
    [],
  );

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

      <InboxFilters
        value={filters}
        onChange={setFilters}
        guides={guides}
        assignees={teamMembers}
      />

      <div className="overflow-hidden rounded-lg border bg-card shadow-elev-sm">
        <div className="flex items-center justify-between border-b px-5 py-3 text-xs text-muted-foreground">
          <span>
            {filtered.length} {filtered.length === 1 ? "request" : "requests"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Recipient</th>
                <th className="px-5 py-3 font-medium">Guide</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Readiness</th>
                <th className="px-5 py-3 font-medium">Missing</th>
                <th className="px-5 py-3 font-medium">Last activity</th>
                <th className="px-5 py-3 font-medium">Assignee</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    No requests match these filters.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const status = requestStatusOptions[r.status];
                  return (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="px-5 py-3 align-top">
                        <p className="font-medium text-foreground">{r.recipientName}</p>
                        <p className="text-xs text-muted-foreground">{r.recipientContact}</p>
                      </td>
                      <td className="px-5 py-3 align-top text-muted-foreground">{r.guideName}</td>
                      <td className="px-5 py-3 align-top">
                        <StatusBadge label={status.label} tone={status.tone} />
                      </td>
                      <td className="px-5 py-3 align-top">
                        {r.readinessScore !== undefined ? (
                          <ReadinessScoreBadge score={r.readinessScore} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 align-top">
                        {r.missingItems && r.missingItems.length > 0 ? (
                          <ul className="space-y-0.5 text-xs text-muted-foreground">
                            {r.missingItems.slice(0, 2).map((m) => (
                              <li key={m}>• {m}</li>
                            ))}
                            {r.missingItems.length > 2 ? (
                              <li className="opacity-70">+{r.missingItems.length - 2} more</li>
                            ) : null}
                          </ul>
                        ) : (
                          <span className="text-xs text-success">Complete</span>
                        )}
                      </td>
                      <td className="px-5 py-3 align-top text-xs text-muted-foreground">
                        {r.lastActivityAt ? formatRelativeTime(r.lastActivityAt) : formatRelativeTime(r.createdAt)}
                      </td>
                      <td className="px-5 py-3 align-top">
                        {r.assigneeName ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">
                              {r.assigneeName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </span>
                            {r.assigneeName.split(" ")[0]}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Unassigned</span>
                        )}
                      </td>
                      <td className="px-5 py-3 align-top text-right">
                        <div className="flex justify-end gap-1">
                          <Button asChild variant="ghost" size="sm" className="gap-1">
                            <NavLink to={`/requests/${r.id}`}>
                              <Eye className="h-3.5 w-3.5" /> Open
                            </NavLink>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="More actions">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={async () => {
                                  if (!canRemind) {
                                    const plan = minPlanFor("reminders");
                                    toast.error(
                                      `Reminders are on ${plan ? getPlanLimit(plan).name : "a higher plan"}`,
                                    );
                                    return;
                                  }
                                  const t = toast.loading(`Sending reminder to ${r.recipientName}…`);
                                  try {
                                    await messagingService.send({ requestId: r.id, kind: "reminder" });
                                    toast.dismiss(t);
                                    toast.success(`Reminder sent to ${r.recipientName}`);
                                    notificationService.notify({
                                      event: "reminder_sent",
                                      audience: "recipient",
                                      title: `Reminder sent to ${r.recipientName}`,
                                      body: r.guideName,
                                      requestId: r.id,
                                      recipientEmail: r.recipientContact,
                                      href: `/requests/${r.id}`,
                                    });
                                  } catch (err: any) {
                                    toast.dismiss(t);
                                    toast.error(err?.message ?? "Could not send reminder");
                                  }
                                }}
                              >
                                <Bell className="mr-2 h-3.5 w-3.5" /> Send reminder
                                {!canRemind ? (
                                  <span className="ml-auto text-[10px] uppercase tracking-wide text-primary">Pro</span>
                                ) : null}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  navigator.clipboard?.writeText(`${window.location.origin}/r/${r.token}`);
                                  toast.success("Link copied");
                                }}
                              >
                                <Send className="mr-2 h-3.5 w-3.5" /> Copy link
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
