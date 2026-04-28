import { NavLink } from "react-router-dom";
import { Inbox, CheckCircle2, Clock, FileImage, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/shared/MetricCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ReadinessProgress } from "@/components/shared/ReadinessProgress";
import { ReadinessScoreBadge } from "@/components/shared/ReadinessScoreBadge";
import { Button } from "@/components/ui/button";
import { mockRequests, mockSubmissions } from "@/config/mockData";
import { requestStatusOptions, submissionStatusOptions } from "@/config/statusOptions";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Your inbox at a glance. Phase 1 preview with mock data."
        actions={
          <Button asChild className="gap-1.5">
            <NavLink to="/requests/new">
              <Plus className="h-4 w-4" /> New request
            </NavLink>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Open requests" value={mockRequests.length} icon={Inbox} hint="Awaiting submission" />
        <MetricCard label="New briefs" value={mockSubmissions.filter((s) => s.status === "new").length} icon={FileImage} hint="Need review" />
        <MetricCard label="Avg. readiness" value="83" icon={CheckCircle2} hint="Last 30 days" />
        <MetricCard label="Avg. response" value="2h 14m" icon={Clock} hint="Recipient time-to-submit" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border bg-card shadow-elev-sm">
          <header className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">Recent requests</h2>
            <Button asChild variant="ghost" size="sm">
              <NavLink to="/requests">View all</NavLink>
            </Button>
          </header>
          <ul className="divide-y">
            {mockRequests.slice(0, 4).map((r) => {
              const tone = requestStatusOptions[r.status].tone;
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{r.recipientName}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.guideName}</p>
                  </div>
                  <StatusBadge label={requestStatusOptions[r.status].label} tone={tone} />
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-lg border bg-card shadow-elev-sm">
          <header className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground">New briefs</h2>
            <Button asChild variant="ghost" size="sm">
              <NavLink to="/requests">Open inbox</NavLink>
            </Button>
          </header>
          <ul className="divide-y">
            {mockSubmissions.map((s) => (
              <li key={s.id} className="space-y-2 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{s.recipientName}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.guideName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ReadinessScoreBadge score={s.readinessScore} />
                    <StatusBadge
                      label={submissionStatusOptions[s.status].label}
                      tone={submissionStatusOptions[s.status].tone}
                    />
                  </div>
                </div>
                <ReadinessProgress value={s.readinessScore} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
