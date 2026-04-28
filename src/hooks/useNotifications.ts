import { useEffect, useState } from "react";
import { notificationStore, type InAppNotification } from "@/services/notificationService";

/** Subscribe to the in-app notification store. */
export function useNotifications() {
  const [items, setItems] = useState<InAppNotification[]>(() => notificationStore.list());

  useEffect(() => {
    return notificationStore.subscribe(setItems);
  }, []);

  return {
    items,
    unreadCount: items.filter((n) => !n.read).length,
    markRead: (id: string) => notificationStore.markRead(id),
    markAllRead: () => notificationStore.markAllRead(),
    clear: () => notificationStore.clear(),
  };
}
