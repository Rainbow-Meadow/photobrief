// Workspace-aware plan gating hook. All UI gates should use `can(feature)`
// instead of comparing plan strings directly.
import { useMemo } from "react";
import { workspaceService } from "@/services/workspaceService";
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
  can: (feature: FeatureKey, currentUsage?: number) => boolean;
  requiredPlanFor: (feature: FeatureKey) => Plan | undefined;
}

export function usePlan(): UsePlan {
  const workspace = workspaceService.current();
  return useMemo(
    () => ({
      plan: workspace.plan,
      limit: getPlanLimit(workspace.plan),
      can: (feature, currentUsage) => canUseFeature(workspace.plan, feature, currentUsage),
      requiredPlanFor: (feature) => minPlanFor(feature),
    }),
    [workspace.plan],
  );
}
