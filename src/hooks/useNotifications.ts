// In-app notifications — reads from the DB notifications table and the
// in-memory toast store. The bell shows the union: realtime DB events
// (e.g. recipient submitted, AI review completed) + ephemeral session
// toasts queued by notificationService.
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentWorkspace } from "@/hooks/useCurrentWorkspace";
import { useAuth } from "@/hooks/useAuth";
import {
  notificationStore,
  type InAppNotification,
} from "@/services/notificationService";

export function useNotifications() {
  const { user } = useAuth();
  const { workspace } = useCurrentWorkspace();
  const wsId = workspace?.id;
  const queryClient = useQueryClient();
  const [sessionItems, setSessionItems] = useState<InAppNotification[]>(() =>
    notificationStore.list(),
  );

  useEffect(() => notificationStore.subscribe(setSessionItems), []);

  const { data: dbItems = [] } = useQuery({
    queryKey: ["notifications", wsId, user?.id],
    queryFn: async () => {
      if (!wsId || !user?.id) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("workspace_id", wsId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!wsId && !!user?.id,
  });

  // Realtime: invalidate when notifications change for this workspace.
  useEffect(() => {
    if (!wsId) return;
    const channel = supabase
      .channel(`notifications-${wsId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `workspace_id=eq.${wsId}` },
        () => queryClient.invalidateQueries({ queryKey: ["notifications", wsId, user?.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [wsId, user?.id, queryClient]);

  const merged: InAppNotification[] = [
    ...dbItems.map((n: any) => ({
      id: n.id,
      event: n.type as any,
      audience: "business" as const,
      title: n.title,
      body: n.body ?? undefined,
      createdAt: n.created_at,
      read: !!n.read,
      workspaceId: n.workspace_id,
    })),
    ...sessionItems,
  ];

  const markRead = async (id: string) => {
    notificationStore.markRead(id);
    if (!wsId || !user?.id) return;
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["notifications", wsId, user?.id] });
  };
  const markAllRead = async () => {
    notificationStore.markAllRead();
    if (!wsId || !user?.id) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("workspace_id", wsId)
      .eq("user_id", user.id)
      .eq("read", false);
    queryClient.invalidateQueries({ queryKey: ["notifications", wsId, user?.id] });
  };

  return {
    items: merged,
    unreadCount: merged.filter((n) => !n.read).length,
    markRead,
    markAllRead,
    clear: () => notificationStore.clear(),
  };
}
