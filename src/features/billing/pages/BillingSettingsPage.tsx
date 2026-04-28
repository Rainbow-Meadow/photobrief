import { CheckCircle2, ExternalLink } from "lucide-react";
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
import { PricingCardGrid } from "@/components/pricing/PricingCardGrid";
import { FoundingProBadge } from "@/components/pricing/FoundingProBadge";
import { cn } from "@/lib/utils";

function formatQuota(q: Quota): string {
  return q === "unlimited" ? "∞" : String(q);
}

function pct(used: number, cap: Quota): number {
  if (cap === "unlimited") return 30;
  if (cap === 0) return 100;
  return Math.min(100, (used / cap) * 100);
}

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
    <div className="space-y-8">
      <PageHeader title="Billing" description="Plan, usage, and limits." />

      {/* Current plan + usage --------------------------------------------- */}
      <section className="overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-muted/30 shadow-elev-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_1fr] lg:gap-10">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Current plan
              </p>
              <FoundingProBadge variant="inline" />
            </div>
            <h2 className="mt-1 text-2xl font-semibold text-foreground">{current.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{current.tagline}</p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button>Manage subscription</Button>
              <Button variant="outline" className="gap-1.5">
                Open invoices <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <UsageMeter
              label="Requests this month"
              used={usage.requests}
              cap={current.quotas.requestsPerMonth}
            />
            <UsageMeter
              label="AI checks this month"
              used={usage.aiChecks}
              cap={current.quotas.aiChecksPerMonth}
            />
            <UsageMeter
              label="Saved templates"
              used={1}
              cap={current.quotas.savedTemplates}
            />
          </div>
        </div>
      </section>

      {/* Plan switcher ---------------------------------------------------- */}
      <section>
        <PricingCardGrid
          ctaTarget="billing"
          currentPlan={workspace.plan}
          compact
          heading="Change plan"
          subheading="Upgrade or downgrade any time. Annual saves 20%."
        />
      </section>

      {/* Comparison table ------------------------------------------------- */}
      <section className="rounded-2xl border bg-card p-5 shadow-elev-sm">
        <h3 className="text-sm font-semibold text-foreground">Compare features</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Feature</th>
                {planLimits.map((p) => (
                  <th
                    key={p.id}
                    className={cn(
                      "px-2 py-2 text-center font-medium",
                      p.id === current.id && "text-primary",
                    )}
                  >
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
                    <td
                      key={p.id}
                      className={cn(
                        "px-2 py-2 text-center",
                        p.id === current.id && "bg-primary/[0.04]",
                      )}
                    >
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

function UsageMeter({ label, used, cap }: { label: string; used: number; cap: Quota }) {
  const value = pct(used, cap);
  const danger = value >= 90;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-medium tabular-nums", danger ? "text-destructive" : "text-foreground")}>
          {used} / {formatQuota(cap)}
        </span>
      </div>
      <ReadinessProgress value={value} className="mt-1.5" />
    </div>
  );
}
