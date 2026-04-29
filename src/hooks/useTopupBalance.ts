// Per-workspace top-up credit balance. Sums remaining credits across all
// active packs that haven't expired.
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentWorkspace } from "@/hooks/useCurrentWorkspace";

export interface TopupBalance {
  remaining: number;
  expiresAt: string | null;
}

export function useTopupBalance() {
  const { workspace, loading: wsLoading } = useCurrentWorkspace();
  const [balance, setBalance] = useState<TopupBalance>({ remaining: 0, expiresAt: null });
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!workspace?.id) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("current_topup_balance", {
      _workspace_id: workspace.id,
    });
    if (error) {
      console.error("current_topup_balance error", error);
      setBalance({ remaining: 0, expiresAt: null });
    } else {
      const row = Array.isArray(data) ? data[0] : data;
      setBalance({
        remaining: row?.remaining ?? 0,
        expiresAt: row?.expires_at ?? null,
      });
    }
    setLoading(false);
  }, [workspace?.id]);

  useEffect(() => {
    if (wsLoading) return;
    refetch();
  }, [wsLoading, refetch]);

  return { balance, loading: loading || wsLoading, refetch };
}
