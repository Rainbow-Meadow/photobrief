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
  const plan: Plan = workspace?.plan ?? "free";
  return useMemo(
    () => ({
      plan,
      limit: getPlanLimit(plan),
      loading,
      can: (feature, currentUsage) =>
        canUseFeature(plan, feature, currentUsage),
      requiredPlanFor: (feature) => minPlanFor(feature),
    }),
    [plan, loading],
  );
}
