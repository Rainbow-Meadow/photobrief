// Live workspace + subscription for the signed-in user.
import { createContext, createElement, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isTransientSupabaseError, withSupabaseRetry as withRetry } from "@/lib/supabaseRetry";
import { onboardingDebug, supabaseErrorDebug } from "@/lib/onboardingDebug";
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
  /** True when the last lookup failed with a transient backend error
   *  (PGRST001/PGRST002/503/network). Distinguishes "we couldn't reach
   *  the backend" from "the user genuinely has no workspace yet". */
  backendUnavailable: boolean;
  refetch: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function CurrentWorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [workspace, setWorkspace] = useState<CurrentWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backendUnavailable, setBackendUnavailable] = useState(false);

  const refetch = useCallback(async () => {
    if (!user) {
      onboardingDebug("workspace.no_user", { sessionPresent: false });
      setWorkspace(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setBackendUnavailable(false);
    onboardingDebug("workspace.profile_lookup.start", {
      sessionPresent: true,
      currentUserId: user.id,
      currentUserEmail: user.email ?? null,
      requestName: "profiles.default_workspace_id",
      urlPath: "public.profiles",
      method: "select",
    });
    const { data: profile, error: profileErr } = await withRetry(async () =>
      await supabase
        .from("profiles")
        .select("default_workspace_id")
        .eq("id", user.id)
        .maybeSingle(),
    );
    onboardingDebug("workspace.profile_lookup.done", {
      sessionPresent: true,
      currentUserId: user.id,
      currentUserEmail: user.email ?? null,
      requestName: "profiles.default_workspace_id",
      urlPath: "public.profiles",
      method: "select",
      profileFound: !!profile,
      workspaceFound: !!(profile as { default_workspace_id?: string } | null)?.default_workspace_id,
      error: supabaseErrorDebug(profileErr),
    });
    if (profileErr) {
      const transient = isTransientSupabaseError(profileErr);
      if (transient) setBackendUnavailable(true);
      // Keep prior workspace cached during a transient blip so the UI
      // doesn't flash an "empty" state. Only clear on a real failure.
      if (!transient) setWorkspace(null);
      setError(profileErr.message ?? "Could not load workspace");
      setLoading(false);
      return;
    }

    const wsId = (profile as { default_workspace_id?: string } | null)?.default_workspace_id;
    if (!wsId) {
      onboardingDebug("workspace.no_default_workspace", {
        sessionPresent: true,
        currentUserId: user.id,
        currentUserEmail: user.email ?? null,
        profileFound: !!profile,
        workspaceFound: false,
      });
      setWorkspace(null);
      setLoading(false);
      return;
    }

    onboardingDebug("workspace.details_lookup.start", {
      sessionPresent: true,
      currentUserId: user.id,
      currentUserEmail: user.email ?? null,
      requestName: "business_workspaces + subscriptions",
      urlPath: "public.business_workspaces/public.subscriptions",
      method: "select",
      workspaceId: wsId,
    });
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
    onboardingDebug("workspace.details_lookup.done", {
      sessionPresent: true,
      currentUserId: user.id,
      currentUserEmail: user.email ?? null,
      requestName: "business_workspaces + subscriptions",
      urlPath: "public.business_workspaces/public.subscriptions",
      method: "select",
      workspaceId: wsId,
      workspaceFound: !!ws,
      subscriptionFound: !!sub,
      workspaceError: supabaseErrorDebug(wsErr),
      subscriptionError: supabaseErrorDebug(subErr),
    });

    const loadErr = wsErr ?? subErr;
    if (loadErr) {
      const transient = isTransientSupabaseError(loadErr);
      if (transient) setBackendUnavailable(true);
      if (!transient) setWorkspace(null);
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
    () => ({ workspace, loading: loading || authLoading, error, backendUnavailable, refetch }),
    [workspace, loading, authLoading, error, backendUnavailable, refetch],
  );

  return createElement(WorkspaceContext.Provider, { value }, children);
}

export function useCurrentWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context) return context;
  return {
    workspace: null,
    loading: true,
    error: "Workspace provider is missing",
    backendUnavailable: false,
    refetch: async () => {},
  };
}
