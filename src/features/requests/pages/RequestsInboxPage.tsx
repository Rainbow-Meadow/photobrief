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
import { PlanTag } from "@/components/shared/PlanTag";
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

  // Drop selections that are no longer in the filtered view
  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(filtered.map((r) => r.id));
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (ids.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [filtered]);

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(filtered.map((r) => r.id)));
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelected(new Set());

  const ensureBulkAllowed = () => {
    if (canBulk) return true;
    const plan = minPlanFor("bulk_actions");
    toast.error(`Bulk actions are on ${plan ? getPlanLimit(plan).name : "a higher plan"}`);
    return false;
  };

  const refetchInbox = () =>
    queryClient.invalidateQueries({ queryKey: ["requests", workspace?.id] });

  const handleBulkArchive = async () => {
    if (!ensureBulkAllowed()) return;
    setBulkBusy(true);
    const ids = Array.from(selected);
    try {
      await requestsService.bulkUpdateStatus(ids, "archived");
      toast.success(`Archived ${ids.length} request${ids.length === 1 ? "" : "s"}`);
      clearSelection();
      await refetchInbox();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not archive");
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!ensureBulkAllowed()) return;
    if (!window.confirm(`Delete ${selected.size} request(s)? This cannot be undone.`)) return;
    setBulkBusy(true);
    const ids = Array.from(selected);
    try {
      await requestsService.bulkDelete(ids);
      toast.success(`Deleted ${ids.length} request${ids.length === 1 ? "" : "s"}`);
      clearSelection();
      await refetchInbox();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not delete");
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkAssign = async (assigneeId: string | null, name: string) => {
    if (!ensureBulkAllowed()) return;
    if (!canAssign) {
      const plan = minPlanFor("assignments");
      toast.error(`Assignments are on ${plan ? getPlanLimit(plan).name : "a higher plan"}`);
      return;
    }
    setBulkBusy(true);
    const ids = Array.from(selected);
    try {
      await requestsService.bulkAssign(ids, assigneeId);
      toast.success(`Assigned ${ids.length} to ${name}`);
      clearSelection();
      await refetchInbox();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not assign");
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requests"
        description="Every link you've sent and every brief you've received."
        actions={
          <Button asChild className="hidden gap-1.5 sm:inline-flex">
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

      <div className="overflow-hidden surface-card">
        {selected.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-b bg-primary/5 px-5 py-2 text-xs">
            <span className="font-medium text-foreground">
              {selected.size} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1"
              onClick={handleBulkArchive}
              disabled={bulkBusy}
            >
              <Archive className="h-3.5 w-3.5" /> Archive
              {!canBulk ? <PlanTag plan="pro" className="ml-1" /> : null}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 gap-1" disabled={bulkBusy}>
                  <UserPlus className="h-3.5 w-3.5" /> Assign
                  {!canAssign ? <PlanTag plan="pro" className="ml-1" /> : null}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Assign to</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleBulkAssign(null, "Unassigned")}>
                  Unassigned
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {teamMembers.map((m) => (
                  <DropdownMenuItem key={m.id} onClick={() => handleBulkAssign(m.id, m.name)}>
                    {m.name}
                  </DropdownMenuItem>
                ))}
                {teamMembers.length === 0 ? (
                  <DropdownMenuItem disabled>No teammates yet</DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-destructive hover:text-destructive"
              onClick={handleBulkDelete}
              disabled={bulkBusy}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7 gap-1"
              onClick={clearSelection}
            >
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between border-b px-5 py-3 text-xs text-muted-foreground">
            <span>
              {filtered.length} {filtered.length === 1 ? "request" : "requests"}
            </span>
          </div>
        )}
        {/* Mobile: stacked card list. */}
        <ul className="divide-y md:hidden">
          {filtered.length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-muted-foreground">
              No requests match these filters.
            </li>
          ) : (
            filtered.map((r) => {
              const status = requestStatusOptions[r.status];
              const isSel = selected.has(r.id);
              return (
                <li
                  key={r.id}
                  className={isSel ? "bg-primary/5 px-4 py-3" : "px-4 py-3 active:bg-muted/40"}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      aria-label={`Select request for ${r.recipientName}`}
                      checked={isSel}
                      onCheckedChange={() => toggleOne(r.id)}
                      className="mt-1"
                    />
                    <NavLink
                      to={`/requests/${r.id}`}
                      className="flex min-w-0 flex-1 flex-col gap-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-medium text-foreground">
                          {r.recipientName}
                        </p>
                        <StatusBadge label={status.label} tone={status.tone} />
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {r.guideName} ·{" "}
                        {r.lastActivityAt
                          ? formatRelativeTime(r.lastActivityAt)
                          : formatRelativeTime(r.createdAt)}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        {r.readinessScore !== undefined ? (
                          <ReadinessScoreBadge score={r.readinessScore} />
                        ) : null}
                        {r.missingItems && r.missingItems.length > 0 ? (
                          <span className="text-[11px] text-muted-foreground">
                            {r.missingItems.length} missing
                          </span>
                        ) : (
                          <span className="text-[11px] text-success">Complete</span>
                        )}
                        {r.assigneeName ? (
                          <span className="text-[11px] text-muted-foreground">
                            · {r.assigneeName.split(" ")[0]}
                          </span>
                        ) : null}
                      </div>
                    </NavLink>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="More actions"
                          className="h-10 w-10 shrink-0"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <NavLink to={`/requests/${r.id}`}>
                            <Eye className="mr-2 h-3.5 w-3.5" /> Open
                          </NavLink>
                        </DropdownMenuItem>
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
                            } catch (err: any) {
                              toast.dismiss(t);
                              toast.error(err?.message ?? "Could not send reminder");
                            }
                          }}
                        >
                          <Bell className="mr-2 h-3.5 w-3.5" /> Send reminder
                          {!canRemind ? <PlanTag plan="pro" alignRight /> : null}
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
                </li>
              );
            })
          )}
        </ul>

        {/* Desktop / tablet: full table. */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-10 px-3 py-3">
                  <Checkbox
                    aria-label="Select all"
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={toggleAll}
                  />
                </th>
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
                  <td colSpan={9} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    No requests match these filters.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const status = requestStatusOptions[r.status];
                  const isSel = selected.has(r.id);
                  return (
                    <tr key={r.id} className={isSel ? "bg-primary/5" : "hover:bg-muted/30"}>
                      <td className="px-3 py-3 align-middle">
                        <Checkbox
                          aria-label={`Select request for ${r.recipientName}`}
                          checked={isSel}
                          onCheckedChange={() => toggleOne(r.id)}
                        />
                      </td>
                      <td className="px-5 py-3 align-middle">
                        <p className="font-medium text-foreground">{r.recipientName}</p>
                        <p className="text-xs text-muted-foreground">{r.recipientContact}</p>
                      </td>
                      <td className="px-5 py-3 align-middle text-muted-foreground">{r.guideName}</td>
                      <td className="px-5 py-3 align-middle">
                        <StatusBadge label={status.label} tone={status.tone} />
                      </td>
                      <td className="px-5 py-3 align-middle">
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
                      <td className="px-5 py-3 align-middle text-xs text-muted-foreground">
                        {r.lastActivityAt ? formatRelativeTime(r.lastActivityAt) : formatRelativeTime(r.createdAt)}
                      </td>
                      <td className="px-5 py-3 align-middle">
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
                      <td className="px-5 py-3 align-middle text-right">
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
                                  <PlanTag plan="pro" alignRight />
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
