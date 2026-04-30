// Custom domain section. Stores a single CNAME-style domain on the workspace.
// DNS verification is intentionally out of scope here — this just stores the
// preference so recipient links can be rewritten when the domain resolves.
import { useEffect, useState } from "react";
import { Globe, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  workspaceId: string;
}

const DOMAIN_RE = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)+[a-zA-Z]{2,}$/;

export function CustomDomainSection({ workspaceId }: Props) {
  const [domain, setDomain] = useState("");
  const [original, setOriginal] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("business_workspaces")
        .select("custom_domain")
        .eq("id", workspaceId)
        .maybeSingle();
      if (cancelled) return;
      const v = data?.custom_domain ?? "";
      setDomain(v);
      setOriginal(v);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const handleSave = async () => {
    const trimmed = domain.trim().toLowerCase();
    if (trimmed && !DOMAIN_RE.test(trimmed)) {
      toast.error("Enter a valid domain (e.g. links.yourbrand.com)");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("business_workspaces")
      .update({ custom_domain: trimmed || null })
      .eq("id", workspaceId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setOriginal(trimmed || null);
    toast.success("Custom domain saved");
  };

  const dirty = (domain.trim().toLowerCase() || null) !== (original || null);

  return (
    <section className="space-y-3 surface-card p-5">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Custom domain</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Send recipients to links on your own domain (e.g.{" "}
        <code className="rounded bg-muted px-1 py-0.5">links.yourbrand.com</code>).
        Point a CNAME at <code className="rounded bg-muted px-1 py-0.5">cname.photobrief.app</code>{" "}
        and we'll route traffic to your workspace.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="custom-domain">Domain</Label>
        <div className="flex gap-2">
          <Input
            id="custom-domain"
            placeholder="links.yourbrand.com"
            value={domain}
            disabled={loading}
            onChange={(e) => setDomain(e.target.value)}
          />
          <Button
            onClick={handleSave}
            disabled={!dirty || saving || loading}
            className="gap-1.5"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Save
          </Button>
        </div>
      </div>
    </section>
  );
}
