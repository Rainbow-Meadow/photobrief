// Outbound webhook subscriptions UI.
// Lists, creates, toggles, and deletes webhook subscriptions for the current
// workspace. Gated by the `api_webhooks` capability. Workspace member RLS
// enforces tenant boundaries; the actual delivery happens in the
// `webhook-dispatch` edge function.
import { useEffect, useMemo, useState } from "react";
import { Plus, Power, PowerOff, Trash2, Webhook } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface WebhookRow {
  id: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  created_at: string;
}

const SUPPORTED_EVENTS = [
  "submission.created",
  "submission.reviewed",
  "request.created",
  "request.completed",
];

function generateSecret() {
  const buf = new Uint8Array(24);
  crypto.getRandomValues(buf);
  return "whsec_" + Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

interface Props {
  workspaceId: string;
}

export function WebhookSubscriptionsSection({ workspaceId }: Props) {
  const [rows, setRows] = useState<WebhookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [pickedEvents, setPickedEvents] = useState<string[]>([
    "submission.created",
    "submission.reviewed",
  ]);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("webhook_subscriptions")
      .select("id, url, secret, events, active, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (!error && data) setRows(data as WebhookRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (workspaceId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const toggleEvent = (ev: string) =>
    setPickedEvents((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev],
    );

  const handleCreate = async () => {
    if (!url.trim()) return;
    try {
      new URL(url.trim());
    } catch {
      toast.error("Enter a valid https:// URL");
      return;
    }
    if (pickedEvents.length === 0) {
      toast.error("Pick at least one event");
      return;
    }
    setBusy(true);
    const secret = generateSecret();
    const { error } = await supabase.from("webhook_subscriptions").insert({
      workspace_id: workspaceId,
      url: url.trim(),
      secret,
      events: pickedEvents,
      active: true,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Webhook added");
    setUrl("");
    setPickedEvents(["submission.created", "submission.reviewed"]);
    setOpen(false);
    refresh();
  };

  const toggleActive = async (row: WebhookRow) => {
    const { error } = await supabase
      .from("webhook_subscriptions")
      .update({ active: !row.active })
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    refresh();
  };

  const remove = async (row: WebhookRow) => {
    if (!window.confirm("Delete this webhook?")) return;
    const { error } = await supabase
      .from("webhook_subscriptions")
      .delete()
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Webhook deleted");
    refresh();
  };

  const empty = useMemo(() => !loading && rows.length === 0, [loading, rows]);

  return (
    <section className="space-y-3 surface-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Webhook className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Webhooks</h3>
        </div>
        <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add webhook
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Send a JSON POST to your URL whenever a selected event happens. Each
        delivery is signed with the webhook secret in the
        <code className="mx-1 rounded bg-muted px-1 py-0.5 text-[11px]">X-PhotoBrief-Signature</code>
        header.
      </p>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : empty ? (
        <p className="text-xs text-muted-foreground">No webhooks yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background p-3 text-xs"
            >
              <div className="min-w-0 space-y-0.5">
                <p className="truncate font-mono text-[12px] text-foreground">{row.url}</p>
                <p className="text-muted-foreground">
                  {row.events.join(", ")} ·{" "}
                  {row.active ? (
                    <span className="text-success">Active</span>
                  ) : (
                    <span className="text-muted-foreground">Paused</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleActive(row)}
                  className="gap-1.5"
                >
                  {row.active ? (
                    <>
                      <PowerOff className="h-3.5 w-3.5" /> Pause
                    </>
                  ) : (
                    <>
                      <Power className="h-3.5 w-3.5" /> Resume
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(row)}
                  className="gap-1.5 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add webhook</DialogTitle>
            <DialogDescription>
              We'll generate a signing secret automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="hook-url">Endpoint URL</Label>
              <Input
                id="hook-url"
                placeholder="https://your-app.com/webhooks/photobrief"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Events</Label>
              <div className="grid grid-cols-2 gap-2">
                {SUPPORTED_EVENTS.map((ev) => (
                  <label
                    key={ev}
                    className="flex items-center gap-2 rounded-md border p-2 text-xs cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={pickedEvents.includes(ev)}
                      onChange={() => toggleEvent(ev)}
                    />
                    <span className="font-mono">{ev}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={busy}>
              Add webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
