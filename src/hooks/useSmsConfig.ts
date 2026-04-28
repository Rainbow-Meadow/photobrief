import { useEffect, useState } from "react";

import { useCurrentWorkspace } from "@/hooks/useCurrentWorkspace";
import { smsConfigService, type SmsConfig } from "@/services/smsConfigService";

/**
 * Lightweight read-only hook for components that just need to know
 * whether SMS is available + the workspace's default channel.
 */
export function useSmsConfig() {
  const { workspace } = useCurrentWorkspace();
  const [config, setConfig] = useState<SmsConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!workspace?.id) {
      setConfig(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    smsConfigService
      .get(workspace.id)
      .then((c) => {
        if (!cancelled) setConfig(c);
      })
      .catch(() => {
        if (!cancelled) setConfig(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workspace?.id]);

  const smsReady = !!(
    config?.enabled &&
    config.verifiedAt &&
    config.fromNumber
  );

  return {
    config,
    loading,
    smsReady,
    defaultChannel: smsReady ? config!.defaultChannel : ("email" as const),
  };
}
