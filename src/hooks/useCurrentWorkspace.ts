// Live workspace + subscription for the signed-in user.
// Returns `workspace: null` when the user is unauthenticated or has no
// default workspace. Callers must handle the null case (loading vs missing).
//
// IMPORTANT: PostgREST occasionally returns 503 ("Database client error" /
// schema cache reload) for a few seconds after auth.users churn. Without
// retry, useCurrentWorkspace would silently fall back to a null workspace,
// which downstream causes usePlan() → "free" — meaning paying users would
// be locked out of their plan features for the duration of the reload.
// We retry with exponential backoff on transient failures.
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Plan, BillingInterval } from "@/types/photobrief";

export interface CurrentWorkspace {
  id: string;
  name: string;
  industry: string | null;
  plan: Plan;
  isFoundingPro: boolean;
  billingInterval: BillingInterval;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

const TRANSIENT_CODES = new Set(["PGRST001", "PGRST002", "503"]);

function isTransient(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const msg = error.message ?? "";
  return (
    TRANSIENT_CODES.has(code) ||
    msg.includes("schema cache") ||
    msg.includes("Database client error") ||
    msg.includes("503")
  );
}

async function withRetry<T>(
  fn: () => Promise<{ data: T | null; error: { code?: string; message?: string } | null }>,
  maxAttempts = 4,
): Promise<{ data: T | null; error: { code?: string; message?: string } | null }> {
  let lastResult: Awaited<ReturnType<typeof fn>> | undefined;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    lastResult = await fn();
    if (!lastResult.error || !isTransient(lastResult.error)) return lastResult;
    // 250ms, 750ms, 2.25s
    await new Promise((r) => setTimeout(r, 250 * Math.pow(3, attempt)));
  }
  return lastResult!;
}

export function useCurrentWorkspace() {
  const { user, loading: authLoading } = useAuth();
  const [workspace, setWorkspace] = useState<CurrentWorkspace | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) {
      setWorkspace(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: profile } = await withRetry(async () =>
      await supabase
        .from("profiles")
        .select("default_workspace_id")
        .eq("id", user.id)
        .maybeSingle(),
    );

    const wsId = (profile as { default_workspace_id?: string } | null)?.default_workspace_id;
    if (!wsId) {
      setWorkspace(null);
      setLoading(false);
      return;
    }

    const [{ data: ws }, { data: sub }] = await Promise.all([
      withRetry(async () =>
        await supabase
          .from("business_workspaces")
          .select("id, name, industry, plan_tier")
          .eq("id", wsId)
          .maybeSingle(),
      ),
      withRetry(async () =>
        await supabase
          .from("subscriptions")
          .select(
            "plan_tier, billing_interval, current_period_start, current_period_end, cancel_at_period_end, is_founding_pro, stripe_customer_id, stripe_subscription_id",
          )
          .eq("workspace_id", wsId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ),
    ]);

    if (ws) {
      const wsTyped = ws as {
        id: string;
        name: string;
        industry: string | null;
        plan_tier: Plan | null;
      };
      const subTyped = sub as {
        plan_tier?: Plan;
        billing_interval?: BillingInterval;
        current_period_start?: string | null;
        current_period_end?: string | null;
        cancel_at_period_end?: boolean;
        is_founding_pro?: boolean;
        stripe_customer_id?: string | null;
        stripe_subscription_id?: string | null;
      } | null;
      setWorkspace({
        id: wsTyped.id,
        name: wsTyped.name,
        industry: wsTyped.industry,
        plan: (subTyped?.plan_tier ?? wsTyped.plan_tier ?? "free") as Plan,
        isFoundingPro: !!subTyped?.is_founding_pro,
        billingInterval: (subTyped?.billing_interval ?? "monthly") as BillingInterval,
        currentPeriodStart: subTyped?.current_period_start ?? null,
        currentPeriodEnd: subTyped?.current_period_end ?? null,
        cancelAtPeriodEnd: !!subTyped?.cancel_at_period_end,
        stripeCustomerId: subTyped?.stripe_customer_id ?? null,
        stripeSubscriptionId: subTyped?.stripe_subscription_id ?? null,
      });
    } else {
      setWorkspace(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    refetch();
  }, [authLoading, refetch]);

  return { workspace, loading: loading || authLoading, refetch };
}
