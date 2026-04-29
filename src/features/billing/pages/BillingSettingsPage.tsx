import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  planLimits,
  featureCatalog,
  type FeatureKey,
  type Quota,
} from "@/config/planLimits";
import { useCurrentWorkspace } from "@/hooks/useCurrentWorkspace";
import { useUsage } from "@/hooks/useUsage";
import { Button } from "@/components/ui/button";
import { ReadinessProgress } from "@/components/shared/ReadinessProgress";
import { PricingCardGrid } from "@/components/pricing/PricingCardGrid";
import { FoundingProBadge } from "@/components/pricing/FoundingProBadge";
import { StripeEmbeddedCheckout } from "@/components/billing/StripeEmbeddedCheckout";
import { StripeTopupCheckout } from "@/components/billing/StripeTopupCheckout";
import { TopupPackCards } from "@/components/billing/TopupPackCards";
import { PaymentTestModeBanner } from "@/components/billing/PaymentTestModeBanner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { isPaymentsConfigured } from "@/lib/stripe";
import type { Plan, BillingInterval } from "@/types/photobrief";
import type { TopupPack } from "@/config/topupPacks";
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
  const { workspace, loading: wsLoading, refetch: refetchWorkspace } = useCurrentWorkspace();
  const { usage, loading: usageLoading, refetch: refetchUsage, topup } = useUsage();
  const current = planLimits.find((p) => p.id === workspace?.plan) ?? planLimits[0];
  const [opening, setOpening] = useState<"portal" | null>(null);
  const [checkout, setCheckout] = useState<{ plan: Plan; interval: BillingInterval } | null>(null);
  const [topupCheckout, setTopupCheckout] = useState<TopupPack | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // After Stripe Checkout returns, refetch and clear the URL flag.
  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      toast({
        title: "Payment received",
        description: "Your plan is updating — this may take a few seconds.",
      });
      refetchWorkspace();
      refetchUsage();
      const next = new URLSearchParams(searchParams);
      next.delete("checkout");
      next.delete("session_id");
      setSearchParams(next, { replace: true });
    }
    if (searchParams.get("topup") === "success") {
      toast({
        title: "Top-up purchased",
        description: "Your extra request credits will appear within a few seconds.",
      });
      setTopupCheckout(null);
      // Webhook may take a moment — refetch a couple of times.
      refetchUsage();
      setTimeout(() => refetchUsage(), 2500);
      const next = new URLSearchParams(searchParams);
      next.delete("topup");
      next.delete("session_id");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, refetchWorkspace, refetchUsage, setSearchParams]);

  const openPortal = async () => {
    if (!workspace?.id) return;
    setOpening("portal");
    const { data, error } = await supabase.functions.invoke("customer-portal", {
      body: { workspace_id: workspace.id },
    });
    setOpening(null);
    if (error || !data?.url) {
      toast({
        title: "Couldn't open billing portal",
        description: error?.message ?? "Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }
    window.open(data.url, "_blank", "noopener,noreferrer");
  };

  if (wsLoading || !workspace) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Loading billing…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PaymentTestModeBanner />
      <PageHeader title="Billing" description="Plan, usage, and limits." bordered={false} />

      {/* Current plan + usage --------------------------------------------- */}
      <section className="overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-muted/30 shadow-elev-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_1fr] lg:gap-10">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Current plan
              </p>
              {workspace.isFoundingPro ? (
                <FoundingProBadge variant="inline" />
              ) : null}
            </div>
            <h2 className="mt-1 text-2xl font-semibold text-foreground">
              {wsLoading ? "Loading…" : current.name}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{current.tagline}</p>
            {workspace.cancelAtPeriodEnd ? (
              <p className="mt-2 text-xs font-medium text-warning">
                Cancels at end of current period
                {workspace.currentPeriodEnd
                  ? ` (${new Date(workspace.currentPeriodEnd).toLocaleDateString()})`
                  : ""}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button onClick={openPortal} disabled={opening === "portal" || !workspace.stripeCustomerId}>
                {opening === "portal" ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : null}
                Manage subscription
              </Button>
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={openPortal}
                disabled={opening === "portal" || !workspace.stripeCustomerId}
              >
                Open invoices <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <UsageMeter
              label="Requests this month"
              used={usage.requests}
              cap={current.quotas.requestsPerMonth}
              loading={usageLoading}
              topupRemaining={topup.remaining}
            />
            <UsageMeter
              label="AI checks this month"
              used={usage.aiChecks}
              cap={current.quotas.aiChecksPerMonth}
              loading={usageLoading}
            />
            {topup.remaining > 0 ? (
              <p className="rounded-lg bg-success/10 px-3 py-2 text-xs text-success-foreground">
                <Sparkles className="mr-1 inline h-3.5 w-3.5" />
                <span className="font-medium">+{topup.remaining}</span> top-up requests available
                {topup.expiresAt
                  ? ` until ${new Date(topup.expiresAt).toLocaleDateString()}`
                  : ""}
                .
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {/* Top-up credits --------------------------------------------------- */}
      {workspace.plan !== "free" ? (
        <section className="rounded-2xl border bg-card p-5 shadow-elev-sm sm:p-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">Top-up credits</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Out of requests but not ready to upgrade? Buy a one-time pack — credits stack on
                top of your plan and are valid until the end of your current billing period.
              </p>
            </div>
          </div>
          <div className="mt-5">
            <TopupPackCards
              onSelect={(pack) => {
                if (!isPaymentsConfigured()) {
                  toast({
                    title: "Payments not configured",
                    description: "Reload the preview after enabling payments.",
                    variant: "destructive",
                  });
                  return;
                }
                setTopupCheckout(pack);
              }}
              pendingPriceId={topupCheckout?.priceId ?? null}
            />
          </div>
        </section>
      ) : null}

      {/* Plan switcher ---------------------------------------------------- */}
      <section>
        <PricingCardGrid
          ctaTarget="billing"
          currentPlan={workspace.plan}
          compact
          heading="Change plan"
          subheading="Upgrade or downgrade any time. Annual saves 20%."
          pendingPlan={checkout?.plan ?? null}
          showFoundingBanner={false}
          onSelectPlan={(plan, interval) => {
            if (!isPaymentsConfigured()) {
              toast({
                title: "Payments not configured",
                description: "VITE_PAYMENTS_CLIENT_TOKEN is missing. Reload the preview after enabling payments.",
                variant: "destructive",
              });
              return;
            }
            setCheckout({ plan, interval });
          }}
        />
      </section>

      {/* Embedded Checkout dialog --------------------------------------- */}
      <Dialog open={!!checkout} onOpenChange={(open) => !open && setCheckout(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Upgrade to{" "}
              {checkout
                ? planLimits.find((p) => p.id === checkout.plan)?.name
                : ""}
            </DialogTitle>
          </DialogHeader>
          {checkout ? (
            <StripeEmbeddedCheckout
              workspaceId={workspace.id}
              plan={checkout.plan}
              interval={checkout.interval}
            />
          ) : null}
        </DialogContent>
      </Dialog>

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

      {/* Top-up Embedded Checkout dialog --------------------------------- */}
      <Dialog open={!!topupCheckout} onOpenChange={(open) => !open && setTopupCheckout(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {topupCheckout
                ? `Buy ${topupCheckout.size} extra requests`
                : "Top-up checkout"}
            </DialogTitle>
          </DialogHeader>
          {topupCheckout ? (
            <StripeTopupCheckout
              workspaceId={workspace.id}
              pack={topupCheckout}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UsageMeter({
  label,
  used,
  cap,
  loading,
  topupRemaining = 0,
}: {
  label: string;
  used: number;
  cap: Quota;
  loading?: boolean;
  topupRemaining?: number;
}) {
  const value = pct(used, cap);
  const danger = value >= 90 && topupRemaining === 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-medium tabular-nums", danger ? "text-destructive" : "text-foreground")}>
          {loading ? "…" : used} / {formatQuota(cap)}
          {topupRemaining > 0 ? (
            <span className="ml-1 text-success">+{topupRemaining}</span>
          ) : null}
        </span>
      </div>
      <ReadinessProgress value={loading ? 0 : value} className="mt-1.5" />
    </div>
  );
}
