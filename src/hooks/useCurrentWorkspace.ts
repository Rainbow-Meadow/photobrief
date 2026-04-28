// Live workspace + subscription for the signed-in user.
// Returns `workspace: null` when the user is unauthenticated or has no
// default workspace. Callers must handle the null case (loading vs missing).
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
    const { data: profile } = await supabase
      .from("profiles")
      .select("default_workspace_id")
      .eq("id", user.id)
      .maybeSingle();

    const wsId = profile?.default_workspace_id;
    if (!wsId) {
      setWorkspace(null);
      setLoading(false);
      return;
    }

    const [{ data: ws }, { data: sub }] = await Promise.all([
      supabase
        .from("business_workspaces")
        .select("id, name, industry, plan_tier")
        .eq("id", wsId)
        .maybeSingle(),
      supabase
        .from("subscriptions")
        .select(
          "plan_tier, billing_interval, current_period_start, current_period_end, cancel_at_period_end, is_founding_pro, stripe_customer_id, stripe_subscription_id",
        )
        .eq("workspace_id", wsId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (ws) {
      setWorkspace({
        id: ws.id,
        name: ws.name,
        industry: ws.industry,
        plan: (sub?.plan_tier ?? ws.plan_tier ?? "free") as Plan,
        isFoundingPro: !!sub?.is_founding_pro,
        billingInterval: (sub?.billing_interval ?? "monthly") as BillingInterval,
        currentPeriodStart: sub?.current_period_start ?? null,
        currentPeriodEnd: sub?.current_period_end ?? null,
        cancelAtPeriodEnd: !!sub?.cancel_at_period_end,
        stripeCustomerId: sub?.stripe_customer_id ?? null,
        stripeSubscriptionId: sub?.stripe_subscription_id ?? null,
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
