// Per-workspace usage counters for the current billing period.
// Reads from the `current_period_usage` Postgres RPC and refetches on demand.
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentWorkspace } from "@/hooks/useCurrentWorkspace";
import { getPlanLimit } from "@/config/planLimits";

export type UsageEventType = "request_created" | "ai_check_run";

export interface UsageSnapshot {
  requests: number;
  aiChecks: number;
}

export function useUsage() {
  const { workspace, loading: wsLoading } = useCurrentWorkspace();
  const [usage, setUsage] = useState<UsageSnapshot>({ requests: 0, aiChecks: 0 });
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!workspace?.id) return;
    setLoading(true);
    const [{ data: req }, { data: ai }] = await Promise.all([
      supabase.rpc("current_period_usage", {
        _workspace_id: workspace.id,
        _event_type: "request_created",
      }),
      supabase.rpc("current_period_usage", {
        _workspace_id: workspace.id,
        _event_type: "ai_check_run",
      }),
    ]);
    setUsage({
      requests: typeof req === "number" ? req : 0,
      aiChecks: typeof ai === "number" ? ai : 0,
    });
    setLoading(false);
  }, [workspace?.id]);

  useEffect(() => {
    if (wsLoading) return;
    refetch();
  }, [wsLoading, refetch]);

  const limit = getPlanLimit(workspace?.plan ?? "free");
  const requestCap = limit.quotas.requestsPerMonth;
  const aiCap = limit.quotas.aiChecksPerMonth;

  const requestsRemaining =
    requestCap === "unlimited" ? Infinity : Math.max(0, requestCap - usage.requests);
  const requestsAtLimit = requestCap !== "unlimited" && usage.requests >= requestCap;

  return {
    usage,
    loading: loading || wsLoading,
    refetch,
    requestsRemaining,
    requestsAtLimit,
    quotas: limit.quotas,
  };
}

/** Log a usage event manually (the DB trigger handles request_created). */
export async function logUsageEvent(
  workspaceId: string,
  eventType: UsageEventType,
  relatedId?: string,
  metadata: Record<string, unknown> = {},
) {
  await supabase.from("usage_events").insert({
    workspace_id: workspaceId,
    event_type: eventType,
    related_id: relatedId ?? null,
    metadata: metadata as never,
  });
}
