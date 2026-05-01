import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Inbox,
  ShieldCheck,
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
import { useCurrentWorkspace } from "@/hooks/useCurrentWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { requestStatusOptions } from "@/config/statusOptions";
import { formatRelativeTime } from "@/utils/format";
import { AssistantPanel } from "@/features/workspace/components/AssistantPanel";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { messagingService } from "@/services/messagingService";
import { usePlan } from "@/hooks/usePlan";
import { getPlanLimit, minPlanFor } from "@/config/planLimits";

async function sendReminder(requestId: string, recipientName: string) {
  const t = toast.loading(`Sending reminder to ${recipientName}…`);
  try {
    const result = await messagingService.send({ requestId, kind: "reminder" });
    toast.dismiss(t);
    if (result.delivery === "sent") {
      toast.success(`Reminder sent to ${recipientName}`);
    } else {
      toast.message("Reminder logged", {
        description: "We couldn't deliver an email this time, but we recorded the nudge.",
      });
    }
  } catch (err: any) {
    toast.dismiss(t);
    toast.error(err?.message ?? "Could not send reminder");
  }
}

export default function DashboardPage() {
  const requests = useRequests();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const { can } = usePlan();
  const { workspace } = useCurrentWorkspace();
  const canRemind = can("reminders");

  // Count refunds (request_credit usage events) granted this billing
  // period — the visible payoff of the First-pass guarantee.
  const [refundedThisPeriod, setRefundedThisPeriod] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    const wsId = workspace?.id;
    if (!wsId) {
      setRefundedThisPeriod(null);
      return;
    }
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    supabase
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", wsId)
      .eq("event_type", "request_credit")
      .gte("created_at", monthStart.toISOString())
      .then(({ count }) => {
        if (!cancelled) setRefundedThisPeriod(count ?? 0);
      });
    return () => {
      cancelled = true;
    };
  }, [workspace?.id]);

  const metrics = useMemo(() => {
    const readyToReview = requests.filter((r) => r.status === "submitted").length;
    const needsCustomer = requests.filter((r) => r.status === "needs_customer_action" || r.status === "sent").length;
    const inProgress = requests.filter((r) => r.status === "in_progress").length;

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const requestsThisMonth = requests.filter(
      (r) => new Date(r.createdAt).getTime() >= monthStart.getTime(),
    ).length;

    // First-pass acceptance: of submissions that have reached a first-pass
    // verdict (accepted on first review, or sent back for rework), how many
    // were accepted on the first attempt.
    const firstDecided = requests.filter(
      (r) => r.firstPassStatus === "accepted" || r.firstPassStatus === "rework",
    );
    const firstAccepted = firstDecided.filter((r) => r.firstPassStatus === "accepted").length;
    const reworked = firstDecided.length - firstAccepted;
    const firstPassPct = firstDecided.length
      ? Math.round((firstAccepted / firstDecided.length) * 100)
      : null;

    // Second-pass acceptance: of submissions that failed first pass *and*
    // have been re-reviewed, how many landed on the second look.
    const secondDecided = requests.filter(
      (r) => r.secondPassStatus === "accepted" || r.secondPassStatus === "rework",
    );
    const secondAccepted = secondDecided.filter((r) => r.secondPassStatus === "accepted").length;
    const secondPassPct = secondDecided.length
      ? Math.round((secondAccepted / secondDecided.length) * 100)
      : null;

    return {
      readyToReview,
      needsCustomer,
      inProgress,
      requestsThisMonth,
      firstPassPct,
      reworked,
      secondPassPct,
      secondAccepted,
      secondDecidedCount: secondDecided.length,
    };
  }, [requests]);

  const readyList = useMemo(
    () => requests.filter((r) => r.status === "submitted").slice(0, 4),
    [requests],
  );
  const needsActionList = useMemo(
    () => requests.filter((r) => r.status === "needs_customer_action" || r.status === "sent").slice(0, 4),
    [requests],
  );

  const isEmpty = requests.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={isEmpty ? "Let's send your first request." : "Your inbox at a glance."}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={assistantOpen ? "secondary" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => setAssistantOpen((o) => !o)}
              aria-label="Toggle assistant"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Assistant</span>
            </Button>
            {/* New request lives in the bottom-bar FAB on mobile. */}
            <Button asChild size="sm" className="hidden gap-1.5 sm:inline-flex">
              <NavLink to="/requests/new">
                <Plus className="h-4 w-4" /> New request
              </NavLink>
            </Button>
          </div>
        }
      />

      {isEmpty ? <FirstRequestHero /> : null}
      {!isEmpty ? (
      <div className="grid gap-6 lg:grid-cols-3">
        <div className={cn("space-y-6", assistantOpen ? "lg:col-span-2" : "lg:col-span-3")}>
          <div className="grid gap-3 grid-cols-2 sm:gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
              className="col-span-2 lg:col-span-1"
              label="First-pass acceptance"
              value={metrics.firstPassPct === null ? "—" : `${metrics.firstPassPct}%`}
              icon={ShieldCheck}
              hint={
                metrics.firstPassPct === null
                  ? "No reviews yet"
                  : `${metrics.reworked} sent back for resubmission`
              }
              subStat={
                metrics.firstPassPct === null
                  ? undefined
                  : metrics.secondPassPct === null
                    ? { label: "No second-pass reviews yet", tone: "muted" }
                    : {
                        label: `${metrics.secondPassPct}% accepted on second pass · ${metrics.secondAccepted} of ${metrics.secondDecidedCount}`,
                        tone: "success",
                      }
              }
              footnote={
                refundedThisPeriod !== null && refundedThisPeriod > 0
                  ? {
                      label: `↻ ${refundedThisPeriod} ${refundedThisPeriod === 1 ? "request" : "requests"} refunded this period`,
                      tooltip:
                        "First-pass guarantee: when a submission needs rework, the request is refunded to your monthly allowance.",
                      tone: "primary",
                    }
                  : refundedThisPeriod === 0
                    ? {
                        label: "✓ First-pass guarantee active — no refunds needed",
                        tooltip:
                          "Every submission landed on the first try this period. If one ever needs rework, that request is refunded automatically.",
                        tone: "success",
                      }
                    : undefined
              }
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
              ctaHref="/requests?status=needs_customer_action"
              showReminder={canRemind}
            />
          </div>
        </div>

        {assistantOpen ? (
          <div className="hidden lg:col-span-1 lg:block">
            <div className="sticky top-4 h-[calc(100vh-6rem)]">
              <AssistantPanel open onClose={() => setAssistantOpen(false)} />
            </div>
          </div>
        ) : null}
      </div>

      ) : null}

      {/* Mobile: same panel rendered as a bottom sheet so it doesn't push page content. */}
      <Sheet open={assistantOpen} onOpenChange={setAssistantOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0 lg:hidden">
          <AssistantPanel open onClose={() => setAssistantOpen(false)} />
        </SheetContent>
      </Sheet>
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
    <section className="surface-card overflow-hidden">
      <header className="flex items-center justify-between px-5 py-4 hairline-b">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <Button asChild variant="ghost" size="sm" className="-mr-2 gap-1">
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
                      onClick={() => sendReminder(r.id, r.recipientName)}
                      aria-label="Send reminder"
                    >
                      <Bell className="h-4 w-4" />
                    </Button>
                  ) : null}
                  {showReminder === false ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const plan = minPlanFor("reminders");
                        toast.error(
                          `Reminders are on ${plan ? getPlanLimit(plan).name : "a higher plan"}`,
                        );
                      }}
                      aria-label="Send reminder (upgrade required)"
                      title="Available on Pro and above"
                    >
                      <Bell className="h-4 w-4 opacity-40" />
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

/**
 * Zero-state hero shown to brand-new workspaces with no requests yet.
 * Surfaces three example use cases as one-click actions and a path to the
 * 60-second demo so a fresh beta user has an obvious next move.
 */
function FirstRequestHero() {
  return (
    <section className="surface-card relative isolate overflow-hidden p-6 sm:p-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-ambient-sky opacity-70"
      />
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full glass px-3 py-1 text-xs font-medium text-foreground/80">
          <Sparkles className="h-3 w-3 text-primary" /> Welcome to PhotoBrief
        </span>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Send your first request
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Pick an example to start with — you can edit everything before you send.
          Your customer just taps the link, no app required.
        </p>

        <div className="mx-auto mt-7 grid max-w-xl gap-3 sm:grid-cols-3">
          <ExampleTemplateButton
            title="Roof inspection"
            subtitle="Pre-quote condition shots"
            href="/requests/new?template=roof_inspection"
          />
          <ExampleTemplateButton
            title="Junk removal"
            subtitle="Pile + access photos"
            href="/requests/new?template=junk_removal"
          />
          <ExampleTemplateButton
            title="Damage claim"
            subtitle="Loss documentation"
            href="/requests/new?template=damage_claim"
          />
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <NavLink to="/requests/new">
              <Plus className="mr-1 h-4 w-4" /> Start from scratch
            </NavLink>
          </Button>
          <Button asChild size="lg" variant="outline">
            <NavLink to="/help">Watch 60-sec demo</NavLink>
          </Button>
        </div>
      </div>
    </section>
  );
}

function ExampleTemplateButton({
  title,
  subtitle,
  href,
}: {
  title: string;
  subtitle: string;
  href: string;
}) {
  return (
    <NavLink
      to={href}
      className="group glass-strong flex flex-col items-start rounded-2xl p-4 text-left transition lift-on-hover"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Plus className="h-4 w-4" />
      </span>
      <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition group-hover:opacity-100">
        Use this <ArrowRight className="h-3 w-3" />
      </span>
    </NavLink>
  );
}
