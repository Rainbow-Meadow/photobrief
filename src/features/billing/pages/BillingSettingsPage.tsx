import { CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  planLimits,
  featureCatalog,
  type FeatureKey,
  type Quota,
} from "@/config/planLimits";
import { workspaceService } from "@/services/workspaceService";
import { Button } from "@/components/ui/button";
import { ReadinessProgress } from "@/components/shared/ReadinessProgress";
import { cn } from "@/lib/utils";

function formatQuota(q: Quota): string {
  return q === "unlimited" ? "∞" : String(q);
}

function pct(used: number, cap: Quota): number {
  if (cap === "unlimited") return 30;
  if (cap === 0) return 100;
  return Math.min(100, (used / cap) * 100);
}

// Order shown in the comparison row at the bottom of the page.
const featureRows: FeatureKey[] = [
  "branded_links",
  "custom_messages",
  "custom_guides",
  "ai_request_builder",
  "ai_guide_generator",
  "advanced_ai_checks",
  "missing_shot_followup",
  "pdf_export",
  "reminders",
  "internal_notes",
  "assignments",
  "team_inbox",
  "saved_templates",
  "bulk_actions",
  "white_label",
  "multi_workspace",
  "custom_domain",
  "api_webhooks",
  "priority_support",
];

export default function BillingSettingsPage() {
  const workspace = workspaceService.current();
  const current = planLimits.find((p) => p.id === workspace.plan) ?? planLimits[0];

  // Mock usage — wired to real counts in a later phase.
  const usage = { requests: 42, aiChecks: 312 };

  return (
    <div className="space-y-6">
      <PageHeader title="Billing" description="Plan, usage, and limits." />

      <section className="rounded-lg border bg-card p-5 shadow-elev-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Current plan
        </p>
        <h2 className="mt-1 text-xl font-semibold text-foreground">{current.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{current.tagline}</p>

        <div className="mt-5 space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Requests this month</span>
              <span className="font-medium text-foreground">
                {usage.requests} / {formatQuota(current.quotas.requestsPerMonth)}
              </span>
            </div>
            <ReadinessProgress
              value={pct(usage.requests, current.quotas.requestsPerMonth)}
              className="mt-1.5"
            />
          </div>
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">AI checks this month</span>
              <span className="font-medium text-foreground">
                {usage.aiChecks} / {formatQuota(current.quotas.aiChecksPerMonth)}
              </span>
            </div>
            <ReadinessProgress
              value={pct(usage.aiChecks, current.quotas.aiChecksPerMonth)}
              className="mt-1.5"
            />
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {planLimits.map((p) => (
          <div
            key={p.id}
            className={cn(
              "flex flex-col rounded-lg border bg-card p-5 shadow-elev-sm",
              p.id === current.id && "border-primary",
              p.highlight && "ring-2 ring-primary/30",
            )}
          >
            {p.highlight ? (
              <span className="mb-2 inline-flex w-fit rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                Most popular
              </span>
            ) : null}
            <h3 className="text-sm font-semibold text-foreground">{p.name}</h3>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              ${p.priceMonthly}
              <span className="text-sm font-normal text-muted-foreground">/mo</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{p.tagline}</p>
            <Button
              variant={p.id === current.id ? "outline" : p.highlight ? "default" : "outline"}
              size="sm"
              className="mt-4 w-full"
              disabled={p.id === current.id}
            >
              {p.id === current.id ? "Current" : `Switch to ${p.name}`}
            </Button>
          </div>
        ))}
      </div>

      <section className="rounded-lg border bg-card p-5 shadow-elev-sm">
        <h3 className="text-sm font-semibold text-foreground">Compare features</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Feature</th>
                {planLimits.map((p) => (
                  <th key={p.id} className="px-2 py-2 text-center font-medium">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {featureRows.map((f) => (
                <tr key={f}>
                  <td className="py-2 pr-3 text-foreground">{featureCatalog[f].label}</td>
                  {planLimits.map((p) => (
                    <td key={p.id} className="px-2 py-2 text-center">
                      {p.capabilities[f] ? (
                        <CheckCircle2 className="mx-auto h-4 w-4 text-success" />
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
