import { useEffect, useState } from "react";
import { Plus, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { UpgradePromptCard } from "@/components/shared/UpgradePromptCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { usePlan } from "@/hooks/usePlan";
import { useCurrentWorkspace } from "@/hooks/useCurrentWorkspace";
import {
  messageTemplatesService,
  type MessageTemplate,
} from "@/services/messageTemplatesService";
import { getPlanLimit } from "@/config/planLimits";

export default function MessageTemplatesPage() {
  const { can, plan, limit } = usePlan();
  const canTemplates = can("saved_templates");
  const { workspace } = useCurrentWorkspace();
  const wsId = workspace?.id;

  const [items, setItems] = useState<MessageTemplate[]>([]);
  const [name, setName] = useState("");
  const [kind, setKind] =
    useState<MessageTemplate["kind"]>("initial");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const cap = limit.quotas.savedTemplates;
  const atCap =
    canTemplates &&
    cap !== "unlimited" &&
    typeof cap === "number" &&
    items.length >= cap;

  async function refresh() {
    if (!wsId) return;
    try {
      setItems(await messageTemplatesService.list(wsId));
    } catch (e) {
      // silent
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsId]);

  async function handleCreate() {
    if (!wsId || !name.trim() || !body.trim()) return;
    setBusy(true);
    try {
      await messageTemplatesService.create({
        workspaceId: wsId,
        name: name.trim(),
        kind,
        subject: subject.trim() || null,
        body: body.trim(),
      });
      toast.success("Template saved");
      setName("");
      setSubject("");
      setBody("");
      setKind("initial");
      await refresh();
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("PLAN_FEATURE_LOCKED")) {
        toast.error(`Saved templates require the ${getPlanLimit("pro").name} plan`);
      } else {
        toast.error(msg || "Could not save template");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this template?")) return;
    try {
      await messageTemplatesService.remove(id);
      toast.success("Template deleted");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not delete");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Message templates"
        description={`Reusable outreach copy for requests, reminders, and follow-ups. Plan: ${plan}.`}
        bordered={false}
      />

      {!canTemplates ? (
        <UpgradePromptCard feature="saved_templates" />
      ) : (
        <>
          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-foreground">New template</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {cap === "unlimited"
                ? "Unlimited templates on your plan."
                : `Plan limit: ${cap} template${cap === 1 ? "" : "s"}.`}
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_160px]">
              <div className="space-y-1.5">
                <Label htmlFor="tpl-name">Name</Label>
                <Input
                  id="tpl-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Friendly first ask"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Kind</Label>
                <Select value={kind} onValueChange={(v) => setKind(v as MessageTemplate["kind"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="initial">Initial outreach</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="followup">Follow-up</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <Label htmlFor="tpl-subject">Subject (optional)</Label>
              <Input
                id="tpl-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Quick photos for your quote"
              />
            </div>
            <div className="mt-3 space-y-1.5">
              <Label htmlFor="tpl-body">Body</Label>
              <Textarea
                id="tpl-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                placeholder="Hi {{recipient_name}}, thanks for reaching out…"
              />
              <p className="text-xs text-muted-foreground">
                Tip: use <code>{`{{recipient_name}}`}</code> and <code>{`{{guide_name}}`}</code> as placeholders.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Button
                onClick={handleCreate}
                disabled={busy || !name.trim() || !body.trim() || atCap}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" /> Save template
              </Button>
              {atCap ? (
                <p className="text-xs text-muted-foreground">
                  You've reached the {cap}-template limit on your plan.
                </p>
              ) : null}
            </div>
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold text-foreground">
              Your templates ({items.length})
            </h2>
            <div className="mt-4 space-y-2">
              {items.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No templates yet"
                  description="Save your best outreach copy and reuse it on every request."
                  compact
                />
              ) : (
                items.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-md border bg-card px-4 py-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{t.name}</p>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {t.kind}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(t.id)}
                        className="gap-1.5"
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </Button>
                    </div>
                    {t.subject ? (
                      <p className="mt-2 text-xs font-medium text-foreground">
                        Subject: {t.subject}
                      </p>
                    ) : null}
                    <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                      {t.body}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
