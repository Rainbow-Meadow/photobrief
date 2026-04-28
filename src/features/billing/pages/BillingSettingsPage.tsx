import { PageHeader } from "@/components/layout/PageHeader";
import { planLimits } from "@/config/planLimits";
import { mockWorkspace } from "@/config/mockData";
import { Button } from "@/components/ui/button";
import { ReadinessProgress } from "@/components/shared/ReadinessProgress";
import { cn } from "@/lib/utils";

export default function BillingSettingsPage() {
  const current = planLimits.find((p) => p.id === mockWorkspace.plan) ?? planLimits[0];
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
                42 / {current.requestsPerMonth === "unlimited" ? "∞" : current.requestsPerMonth}
              </span>
            </div>
            <ReadinessProgress
              value={current.requestsPerMonth === "unlimited" ? 30 : (42 / current.requestsPerMonth) * 100}
              className="mt-1.5"
            />
          </div>
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">AI checks this month</span>
              <span className="font-medium text-foreground">
                312 / {current.aiChecksPerMonth === "unlimited" ? "∞" : current.aiChecksPerMonth}
              </span>
            </div>
            <ReadinessProgress
              value={current.aiChecksPerMonth === "unlimited" ? 35 : (312 / current.aiChecksPerMonth) * 100}
              className="mt-1.5"
            />
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        {planLimits.map((p) => (
          <div
            key={p.id}
            className={cn(
              "rounded-lg border bg-card p-5 shadow-elev-sm",
              p.id === current.id && "border-primary",
            )}
          >
            <h3 className="text-sm font-semibold text-foreground">{p.name}</h3>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              ${p.priceMonthly}
              <span className="text-sm font-normal text-muted-foreground">/mo</span>
            </p>
            <Button
              variant={p.id === current.id ? "outline" : "default"}
              size="sm"
              className="mt-4 w-full"
              disabled={p.id === current.id}
            >
              {p.id === current.id ? "Current" : `Switch to ${p.name}`}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
