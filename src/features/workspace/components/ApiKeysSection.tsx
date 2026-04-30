import { useEffect, useState } from "react";
import { Copy, Key, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shared/EmptyState";
import { apiKeysService, type ApiKey } from "@/services/apiKeysService";
import { toast } from "@/hooks/use-toast";

interface Props {
  workspaceId: string;
  canManage: boolean;
}

export function ApiKeysSection({ workspaceId, canManage }: Props) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<{ name: string; key: string } | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      setKeys(await apiKeysService.list(workspaceId));
    } catch (err: any) {
      toast({ title: "Could not load API keys", description: err?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const { key, record } = await apiKeysService.create(workspaceId, name.trim());
      setRevealedKey({ name: record.name, key });
      setName("");
      await refresh();
    } catch (err: any) {
      toast({
        title: "Could not create API key",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Revoke this key? Anything using it will stop working immediately.")) return;
    try {
      await apiKeysService.revoke(id);
      await refresh();
      toast({ title: "API key revoked" });
    } catch (err: any) {
      toast({ title: "Revoke failed", description: err?.message, variant: "destructive" });
    }
  };

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast({ title: "Copied to clipboard" });
  };

  const active = keys.filter((k) => !k.revoked_at);

  return (
    <section className="surface-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">API keys</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Use to create photo brief requests programmatically from your CRM, intake form, or
            workflow automation.
          </p>
        </div>
        <Key className="h-4 w-4 text-muted-foreground" />
      </div>

      {revealedKey && (
        <div className="mt-4 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
          <p className="font-medium text-foreground">Save this key now — we won't show it again.</p>
          <p className="mt-1 text-xs text-muted-foreground">{revealedKey.name}</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-background px-2 py-1 font-mono text-xs">
              {revealedKey.key}
            </code>
            <Button size="sm" variant="outline" onClick={() => copy(revealedKey.key)}>
              <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRevealedKey(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {canManage && (
        <form className="mt-4 flex items-end gap-2" onSubmit={handleCreate}>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="api-key-name">New key label</Label>
            <Input
              id="api-key-name"
              placeholder="e.g. Zapier integration"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={creating || !name.trim()}>
            {creating ? "Creating..." : "Create key"}
          </Button>
        </form>
      )}

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : active.length === 0 ? (
          <EmptyState icon={Key} title="No API keys" description="Create one to start sending requests via API." />
        ) : (
          active.map((k) => (
            <div key={k.id} className="flex items-center justify-between rounded-md border bg-card p-3 text-sm">
              <div>
                <p className="font-medium text-foreground">{k.name}</p>
                <p className="text-xs text-muted-foreground">
                  <code className="font-mono">{k.key_prefix}…</code> · created{" "}
                  {new Date(k.created_at).toLocaleDateString()}
                  {k.last_used_at
                    ? ` · last used ${new Date(k.last_used_at).toLocaleDateString()}`
                    : " · never used"}
                </p>
              </div>
              {canManage && (
                <Button variant="ghost" size="sm" onClick={() => handleRevoke(k.id)} className="gap-1.5">
                  <Trash2 className="h-4 w-4" /> Revoke
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      <details className="mt-4 rounded-md border bg-muted/30 p-3 text-xs">
        <summary className="cursor-pointer font-medium text-foreground">Usage example</summary>
        <pre className="mt-2 overflow-x-auto rounded bg-background p-2 font-mono text-[11px] leading-relaxed">
{`curl -X POST \\
  https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/api-create-request \\
  -H "Authorization: Bearer pb_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "recipient_name": "Alex Smith",
    "recipient_email": "alex@example.com"
  }'`}
        </pre>
      </details>
    </section>
  );
}
