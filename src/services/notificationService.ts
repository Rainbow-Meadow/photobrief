// Centralized notification abstraction.
//
// Pages MUST call notificationService.notify(...) for lifecycle events
// instead of toasting + emailing + push-notifying directly. This keeps
// channel wiring (in-app store, OneSignal push, email, SMS) in one place
// so we can swap implementations later (Phase 10+: real edge functions
// for `send-transactional-email`, OneSignal REST, Twilio SMS).
//
// Today: in-app store + sonner toast. Email/SMS/push are simulated and
// logged to console so the call sites are correct before the channels
// are connected.

import { toast } from "sonner";

// ============================================================
// Event contracts
// ============================================================

export type NotificationEvent =
  | "request_created"
  | "request_sent"
  | "request_opened"
  | "recipient_started"
  | "needs_customer_action"
  | "submission_ready"
  | "reminder_sent"
  | "reviewed";

export type NotificationChannel = "in_app" | "toast" | "email" | "sms" | "push";

export type NotificationAudience = "business" | "recipient";

export interface NotificationPayload {
  event: NotificationEvent;
  /** Who should receive this — drives channel selection. */
  audience: NotificationAudience;
  /** Short headline shown in the in-app inbox + toast. */
  title: string;
  /** Optional body / detail. */
  body?: string;
  /** Optional deep link the user can click from the in-app inbox. */
  href?: string;
  /** Domain refs for filtering / dedup. */
  requestId?: string;
  submissionId?: string;
  workspaceId?: string;
  /** Recipient contact when the audience is "recipient" — informs email/SMS. */
  recipientEmail?: string;
  recipientPhone?: string;
}

export interface InAppNotification extends NotificationPayload {
  id: string;
  createdAt: string;
  read: boolean;
}

// ============================================================
// Channel routing — which channels fire for which event.
// Centralized so we can flip channels on/off without touching pages.
// ============================================================

const ROUTING: Record<NotificationEvent, NotificationChannel[]> = {
  request_created: ["in_app"],
  request_sent: ["in_app", "toast", "email", "sms"],
  request_opened: ["in_app"],
  recipient_started: ["in_app"],
  needs_customer_action: ["in_app", "toast", "email"],
  submission_ready: ["in_app", "toast", "push"],
  reminder_sent: ["in_app", "toast", "email", "sms"],
  reviewed: ["in_app"],
};

// ============================================================
// In-app store — minimal pub/sub (no extra dep).
// ============================================================

type Listener = (items: InAppNotification[]) => void;

class NotificationStore {
  private items: InAppNotification[] = [];
  private listeners = new Set<Listener>();

  list(): InAppNotification[] {
    return this.items;
  }

  unreadCount(): number {
    return this.items.filter((n) => !n.read).length;
  }

  push(payload: NotificationPayload): InAppNotification {
    const item: InAppNotification = {
      ...payload,
      id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    this.items = [item, ...this.items].slice(0, 100); // cap memory
    this.emit();
    return item;
  }

  markRead(id: string) {
    let changed = false;
    this.items = this.items.map((n) => {
      if (n.id === id && !n.read) {
        changed = true;
        return { ...n, read: true };
      }
      return n;
    });
    if (changed) this.emit();
  }

  markAllRead() {
    if (this.items.every((n) => n.read)) return;
    this.items = this.items.map((n) => ({ ...n, read: true }));
    this.emit();
  }

  clear() {
    this.items = [];
    this.emit();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    for (const fn of this.listeners) fn(this.items);
  }
}

export const notificationStore = new NotificationStore();

// ============================================================
// Channel adapters — simulated for now. Each adapter is the single
// place a real provider plugs in later.
// ============================================================

async function deliverToast(p: NotificationPayload) {
  // Lifecycle toasts use info/success based on event semantics.
  const success: NotificationEvent[] = ["request_sent", "submission_ready", "reviewed"];
  if (success.includes(p.event)) {
    toast.success(p.title, p.body ? { description: p.body } : undefined);
  } else {
    toast(p.title, p.body ? { description: p.body } : undefined);
  }
}

async function deliverEmail(p: NotificationPayload) {
  // TODO(Phase 10): invoke send-transactional-email edge fn.
  // eslint-disable-next-line no-console
  console.info("[notify:email]", {
    to: p.recipientEmail ?? "<workspace owners>",
    subject: p.title,
    body: p.body,
    event: p.event,
  });
}

async function deliverSms(p: NotificationPayload) {
  if (!p.recipientPhone && p.audience === "recipient") return;
  // TODO(Phase 10): provider TBD (Twilio).
  // eslint-disable-next-line no-console
  console.info("[notify:sms]", {
    to: p.recipientPhone ?? "<workspace>",
    text: p.title,
    event: p.event,
  });
}

async function deliverPush(p: NotificationPayload) {
  // TODO(Phase 10): OneSignal REST API.
  // eslint-disable-next-line no-console
  console.info("[notify:push]", { title: p.title, body: p.body, event: p.event });
}

const ADAPTERS: Record<NotificationChannel, (p: NotificationPayload) => Promise<void>> = {
  in_app: async (p) => {
    notificationStore.push(p);
  },
  toast: deliverToast,
  email: deliverEmail,
  sms: deliverSms,
  push: deliverPush,
};

// ============================================================
// Public API
// ============================================================

export const notificationService = {
  /** Fire a lifecycle event through every channel configured for it. */
  async notify(payload: NotificationPayload): Promise<void> {
    const channels = ROUTING[payload.event] ?? ["in_app"];
    await Promise.all(channels.map((ch) => ADAPTERS[ch](payload)));
  },

  /** Inspect routing — useful for tests + admin UIs later. */
  channelsFor(event: NotificationEvent): NotificationChannel[] {
    return ROUTING[event];
  },

  store: notificationStore,
};
