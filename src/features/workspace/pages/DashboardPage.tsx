import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Inbox,
  Gauge,
  Plus,
  Sparkles,
  Bell,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/shared/MetricCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ReadinessScoreBadge } from "@/components/shared/ReadinessScoreBadge";
import { Button } from "@/components/ui/button";
import { useRequests } from "@/hooks/useRequests";
import { requestStatusOptions } from "@/config/statusOptions";
import { formatRelativeTime } from "@/utils/format";
import { AssistantPanel } from "@/features/workspace/components/AssistantPanel";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const requests = useRequests();
  const [assistantOpen, setAssistantOpen] = useState(false);

  const metrics = useMemo(() => {
    const readyToReview = requests.filter((r) => r.status === "submitted").length;
    const needsCustomer = requests.filter((r) => r.status === "needs_action" || r.status === "sent").length;
    const inProgress = requests.filter((r) => r.status === "in_progress").length;

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const requestsThisMonth = requests.filter(
      (r) => new Date(r.createdAt).getTime() >= monthStart.getTime(),
    ).length;

    const scored = requests.filter((r) => typeof r.readinessScore === "number");
    const avgReadiness = scored.length
      ? Math.round(scored.reduce((sum, r) => sum + (r.readinessScore ?? 0), 0) / scored.length)
      : 0;

    return { readyToReview, needsCustomer, inProgress, requestsThisMonth, avgReadiness };
  }, [requests]);

  const readyList = useMemo(
    () => requests.filter((r) => r.status === "submitted").slice(0, 4),
    [requests],
  );
  const needsActionList = useMemo(
    () => requests.filter((r) => r.status === "needs_action" || r.status === "sent").slice(0, 4),
    [requests],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Your inbox at a glance."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={assistantOpen ? "secondary" : "outline"}
              className="gap-1.5"
              onClick={() => setAssistantOpen((o) => !o)}
            >
              <Sparkles className="h-4 w-4" /> Assistant
            </Button>
            <Button asChild className="gap-1.5">
              <NavLink to="/requests/new">
                <Plus className="h-4 w-4" /> New request
              </NavLink>
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className={cn("space-y-6", assistantOpen ? "lg:col-span-2" : "lg:col-span-3")}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard
              label="Ready to review"
              value={metrics.readyToReview}
              icon={CheckCircle2}
              hint="Submitted, awaiting you"
            />
            <MetricCard
              label="Needs customer action"
              value={metrics.needsCustomer}
              icon={AlertCircle}
              hint="Waiting on recipient"
            />
            <MetricCard
              label="In progress"
              value={metrics.inProgress}
              icon={Clock}
              hint="Recipient capturing now"
            />
            <MetricCard
              label="Requests this month"
              value={metrics.requestsThisMonth}
              icon={Inbox}
              hint="Sent since the 1st"
            />
            <MetricCard
              label="Avg. readiness"
              value={metrics.avgReadiness}
              icon={Gauge}
              hint="Across scored briefs"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <DashboardList
              title="Ready to review"
              emptyLabel="Nothing waiting on you."
              items={readyList}
              ctaLabel="View submitted"
              ctaHref="/requests?status=submitted"
            />
            <DashboardList
              title="Needs customer action"
              emptyLabel="Everyone's caught up."
              items={needsActionList}
              ctaLabel="View open"
              ctaHref="/requests?status=needs_action"
              showReminder
            />
          </div>
        </div>

        {assistantOpen ? (
          <div className="lg:col-span-1">
            <div className="sticky top-4 h-[calc(100vh-6rem)]">
              <AssistantPanel open onClose={() => setAssistantOpen(false)} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface DashboardListProps {
  title: string;
  emptyLabel: string;
  items: ReturnType<typeof useRequests>;
  ctaLabel: string;
  ctaHref: string;
  showReminder?: boolean;
}

function DashboardList({ title, emptyLabel, items, ctaLabel, ctaHref, showReminder }: DashboardListProps) {
  return (
    <section className="rounded-lg border bg-card shadow-elev-sm">
      <header className="flex items-center justify-between border-b px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <NavLink to={ctaHref}>
            {ctaLabel} <ArrowRight className="h-3.5 w-3.5" />
          </NavLink>
        </Button>
      </header>
      {items.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="divide-y">
          {items.map((r) => {
            const tone = requestStatusOptions[r.status].tone;
            return (
              <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{r.recipientName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.guideName} · {formatRelativeTime(r.lastActivityAt ?? r.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {r.readinessScore !== undefined ? <ReadinessScoreBadge score={r.readinessScore} /> : null}
                  <StatusBadge label={requestStatusOptions[r.status].label} tone={tone} />
                  {showReminder ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toast.success(`Reminder sent to ${r.recipientName} (mock)`)}
                      aria-label="Send reminder"
                    >
                      <Bell className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
