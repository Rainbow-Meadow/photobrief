// Live workspace + subscription for the signed-in user.
import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isTransientSupabaseError, withSupabaseRetry as withRetry } from "@/lib/supabaseRetry";
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

interface WorkspaceContextValue {
  workspace: CurrentWorkspace | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function CurrentWorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [workspace, setWorkspace] = useState<CurrentWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!user) {
      setWorkspace(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const { data: profile, error: profileErr } = await withRetry(async () =>
      await supabase
        .from("profiles")
        .select("default_workspace_id")
        .eq("id", user.id)
        .maybeSingle(),
    );
    if (profileErr) {
      if (!isTransientSupabaseError(profileErr)) setWorkspace(null);
      setError(profileErr.message ?? "Could not load workspace");
      setLoading(false);
      return;
    }

    const wsId = (profile as { default_workspace_id?: string } | null)?.default_workspace_id;
    if (!wsId) {
      setWorkspace(null);
      setLoading(false);
      return;
    }

    const [{ data: ws, error: wsErr }, { data: sub, error: subErr }] = await Promise.all([
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

    const loadErr = wsErr ?? subErr;
    if (loadErr) {
      if (!isTransientSupabaseError(loadErr)) setWorkspace(null);
      setError(loadErr.message ?? "Could not load workspace");
      setLoading(false);
      return;
    }

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

  const value = useMemo(
    () => ({ workspace, loading: loading || authLoading, error, refetch }),
    [workspace, loading, authLoading, error, refetch],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useCurrentWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context) return context;
  return {
    workspace: null,
    loading: true,
    error: "Workspace provider is missing",
    refetch: async () => {},
  };
}
