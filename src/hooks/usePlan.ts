// Workspace-aware plan gating hook. Reads the live plan from the user's
// current workspace + subscription. Falls back to "free" while loading
// or when unauthenticated.
import { useMemo } from "react";
import { useCurrentWorkspace } from "@/hooks/useCurrentWorkspace";
import {
  canUseFeature,
  getPlanLimit,
  minPlanFor,
  type FeatureKey,
  type PlanLimit,
} from "@/config/planLimits";
import type { Plan } from "@/types/photobrief";

export interface UsePlan {
  plan: Plan;
  limit: PlanLimit;
  loading: boolean;
  can: (feature: FeatureKey, currentUsage?: number) => boolean;
  requiredPlanFor: (feature: FeatureKey) => Plan | undefined;
}

export function usePlan(): UsePlan {
  const { workspace, loading } = useCurrentWorkspace();
  return useMemo(
    () => ({
      plan: workspace.plan,
      limit: getPlanLimit(workspace.plan),
      loading,
      can: (feature, currentUsage) =>
        canUseFeature(workspace.plan, feature, currentUsage),
      requiredPlanFor: (feature) => minPlanFor(feature),
    }),
    [workspace.plan, loading],
  );
}
