import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import { Bell, Copy, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { useRequest, useRequests } from "@/hooks/useRequests";
import { requestStatusOptions } from "@/config/statusOptions";
import { messagingService, type RequestMessage } from "@/services/messagingService";
import { usePlan } from "@/hooks/usePlan";
import { useSmsConfig } from "@/hooks/useSmsConfig";
import { ChannelPicker, type SendChannel } from "@/components/messaging/ChannelPicker";
import { formatRelativeTime } from "@/utils/format";

export default function RequestDetailPage() {
  const { id } = useParams();
  const fallback = useRequests()[0];
  const request = useRequest(id) ?? fallback;
  const status = requestStatusOptions[request.status];
  const { can } = usePlan();
  const canRemind = can("reminders");
  const { smsReady, defaultChannel } = useSmsConfig();

  const hasEmail = !!request?.recipientEmail;
  const hasPhone = !!request?.recipientPhone;

  const [messages, setMessages] = useState<RequestMessage[]>([]);
  const [busy, setBusy] = useState<null | "send" | "remind">(null);
  const [channel, setChannelState] = useState<SendChannel>("email");
  const [channelHydrated, setChannelHydrated] = useState(false);

  const channelStorageKey = request?.id
    ? `pb:request-channel:${request.id}`
    : null;

  // Validate a channel against current SMS readiness + recipient contact fields.
  function coerceChannel(candidate: SendChannel): SendChannel {
    let next = candidate;
    if ((next === "sms" || next === "both") && !smsReady) next = "email";
    if (next === "sms" && !hasPhone) next = hasEmail ? "email" : "sms";
    if (next === "both" && (!hasEmail || !hasPhone)) {
      next = hasEmail ? "email" : "sms";
    }
    if (next === "email" && !hasEmail && hasPhone && smsReady) next = "sms";
    return next;
  }

  // Hydrate from localStorage (per request) on mount / when request changes.
  // Falls back to the workspace default if nothing stored or stored value
  // is no longer viable for this recipient.
  useEffect(() => {
    if (!channelStorageKey) return;
    setChannelHydrated(false);
    let stored: SendChannel | null = null;
    try {
      const raw = localStorage.getItem(channelStorageKey);
      if (raw === "email" || raw === "sms" || raw === "both") stored = raw;
    } catch {
      // ignore (e.g. private mode)
    }
    const fallback: SendChannel = smsReady ? defaultChannel : "email";
    setChannelState(coerceChannel(stored ?? fallback));
    setChannelHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelStorageKey, smsReady, defaultChannel, hasEmail, hasPhone]);

  // Persist user choice (only after hydration so we don't overwrite with
  // the default before we've read the stored value).
  function setChannel(next: SendChannel) {
    setChannelState(next);
    if (channelStorageKey) {
      try {
        localStorage.setItem(channelStorageKey, next);
      } catch {
        // ignore quota / private-mode errors
      }
    }
  }
  // Avoid "unused" warnings if hydration flag is later wired to UI gating.
  void channelHydrated;

  useEffect(() => {
    if (!request?.id) return;
    messagingService.list(request.id).then(setMessages).catch(() => undefined);
  }, [request?.id]);

  const link = `${window.location.origin}/r/${request.token}`;

  async function copyLink() {
    await navigator.clipboard.writeText(link);
    toast.success("Link copied");
  }

  async function sendInitial() {
    setBusy("send");
    try {
      await messagingService.send({ requestId: request.id, kind: "initial", channel });
      toast.success("Request sent");
      const updated = await messagingService.list(request.id);
      setMessages(updated);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function sendReminder() {
    if (!canRemind) {
      toast.error("Reminders are on Pro and above");
      return;
    }
    setBusy("remind");
    try {
      await messagingService.send({ requestId: request.id, kind: "reminder", channel });
      toast.success("Reminder sent");
      const updated = await messagingService.list(request.id);
      setMessages(updated);
    } catch (e) {
      const err = e as Error & { requiredPlan?: string };
      toast.error(err.requiredPlan ? `Reminders require the ${err.requiredPlan} plan` : err.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={request.recipientName}
        description={request.guideName}
        actions={<StatusBadge label={status.label} tone={status.tone} />}
      />

      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Recipient link</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Share this link via SMS, email, or your CRM. Recipient does not need an account.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="flex-1 min-w-[220px] truncate rounded-md border bg-muted px-3 py-2 text-xs">
            {link}
          </code>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={copyLink}>
            <Copy className="h-4 w-4" /> Copy
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <NavLink to={`/r/${request.token}`} target="_blank">
              Preview
            </NavLink>
          </Button>
          <Button size="sm" className="gap-1.5" onClick={sendInitial} disabled={busy === "send"}>
            {busy === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5"
            onClick={sendReminder}
            disabled={busy === "remind"}
          >
            {busy === "remind" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            Send reminder
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Send via:</span>
          <ChannelPicker
            value={channel}
            onChange={setChannel}
            smsAvailable={smsReady}
            hasEmail={hasEmail}
            hasPhone={hasPhone}
          />
          {!smsReady && (
            <NavLink
              to="/settings/sms"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Set up SMS
            </NavLink>
          )}
        </div>
      </section>

      <section className="surface-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Activity</h2>
        {messages.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No messages sent yet. Tap "Send" above to share the link.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {messages.map((m) => {
              const inbound = m.direction === "inbound";
              return (
                <li
                  key={m.id}
                  className={`flex items-start justify-between rounded-md border p-3 text-sm ${
                    inbound ? "border-primary/30 bg-primary/5" : "bg-card"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-medium capitalize text-foreground">
                      {inbound ? "Reply" : m.kind}{" "}
                      {m.channel === "sms" ? "SMS" : m.channel === "both" ? "email + SMS" : "email"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {inbound
                        ? `From ${(m.metadata as { from_number?: string })?.from_number ?? m.toAddress ?? "—"}`
                        : m.toAddress ?? "—"}{" "}
                      · {formatRelativeTime(m.sentAt)}
                    </p>
                    {m.body ? (
                      <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{m.body}</p>
                    ) : null}
                  </div>
                  <span className="ml-3 shrink-0 text-xs text-muted-foreground">
                    {inbound
                      ? "Inbound"
                      : (m.metadata as { delivery?: string })?.delivery === "sent"
                        ? "Delivered"
                        : "Logged"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
