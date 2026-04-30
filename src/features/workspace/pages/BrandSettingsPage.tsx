import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UpgradePromptCard } from "@/components/shared/UpgradePromptCard";
import { usePlan } from "@/hooks/usePlan";
import { useCurrentWorkspace } from "@/hooks/useCurrentWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface BrandForm {
  display_name: string;
  primary_color: string;
  logo_url: string | null;
  request_heading: string;
  intro_message: string;
  completion_message: string;
  contact_email: string;
  contact_phone: string;
  hide_photobrief_branding: boolean;
}

const EMPTY: BrandForm = {
  display_name: "",
  primary_color: "#0A6BFF",
  logo_url: null,
  request_heading: "",
  intro_message: "Hi! Help us help you — a few quick photos.",
  completion_message: "Thanks! We've got everything we need.",
  contact_email: "",
  contact_phone: "",
  hide_photobrief_branding: false,
};

export default function BrandSettingsPage() {
  const { can } = usePlan();
  const canBrand = can("branding");
  const canWhiteLabel = can("white_label");
  const { workspace, loading: wsLoading } = useCurrentWorkspace();

  const [form, setForm] = useState<BrandForm>(EMPTY);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Load existing brand_profile + workspace name
  useEffect(() => {
    if (wsLoading || !workspace?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: bp }, { data: ws }] = await Promise.all([
        supabase
          .from("brand_profiles")
          .select(
            "id, primary_color, logo_url, request_heading, intro_message, completion_message, contact_email, contact_phone, hide_photobrief_branding",
          )
          .eq("workspace_id", workspace.id)
          .maybeSingle(),
        supabase
          .from("business_workspaces")
          .select("name")
          .eq("id", workspace.id)
          .maybeSingle(),
      ]);
      if (cancelled) return;

      setProfileId(bp?.id ?? null);
      setForm({
        display_name: ws?.name ?? "",
        primary_color: bp?.primary_color ?? EMPTY.primary_color,
        logo_url: bp?.logo_url ?? null,
        request_heading: bp?.request_heading ?? "",
        intro_message: bp?.intro_message ?? EMPTY.intro_message,
        completion_message: bp?.completion_message ?? EMPTY.completion_message,
        contact_email: bp?.contact_email ?? "",
        contact_phone: bp?.contact_phone ?? "",
        hide_photobrief_branding: !!bp?.hide_photobrief_branding,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [wsLoading, workspace?.id]);

  const update = <K extends keyof BrandForm>(key: K, value: BrandForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleLogoUpload = async (file: File) => {
    if (!workspace?.id) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Logo too large",
        description: "Please upload an image under 5 MB.",
        variant: "destructive",
      });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const path = `${workspace.id}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("brand-assets")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("brand-assets").getPublicUrl(path);
      update("logo_url", data.publicUrl);
      toast({ title: "Logo uploaded", description: "Don't forget to save your changes." });
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err?.message ?? "Could not upload logo.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!workspace?.id) return;
    setSaving(true);
    try {
      // 1. Update workspace name (display name)
      if (form.display_name.trim()) {
        const { error: wsErr } = await supabase
          .from("business_workspaces")
          .update({ name: form.display_name.trim() })
          .eq("id", workspace.id);
        if (wsErr) throw wsErr;
      }

      // 2. Upsert brand_profile
      const payload = {
        workspace_id: workspace.id,
        primary_color: form.primary_color,
        logo_url: form.logo_url,
        request_heading: form.request_heading || null,
        intro_message: form.intro_message,
        completion_message: form.completion_message,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        hide_photobrief_branding: canWhiteLabel ? form.hide_photobrief_branding : false,
      };

      const { error: bpErr } = profileId
        ? await supabase.from("brand_profiles").update(payload).eq("id", profileId)
        : await supabase.from("brand_profiles").insert(payload);
      if (bpErr) throw bpErr;

      toast({ title: "Brand saved", description: "Your recipient pages will use these settings." });
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err?.message ?? "Could not save brand settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const disabled = !canBrand || loading || wsLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Brand"
        description="How your recipient pages look and sound to customers."
        bordered={false}
      />

      {!canBrand ? <UpgradePromptCard feature="branding" className="max-w-3xl" /> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ---------- FORM ---------- */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="space-y-6 surface-card p-5"
          aria-disabled={disabled}
        >
          <fieldset disabled={disabled} className="space-y-6 disabled:opacity-60">
            {/* Identity */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Identity</h3>

              <div className="space-y-1.5">
                <Label htmlFor="display_name">Business name</Label>
                <Input
                  id="display_name"
                  placeholder="Bright Spark Plumbing"
                  value={form.display_name}
                  onChange={(e) => update("display_name", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Shown on recipient pages, emails, and PDF exports.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                    {form.logo_url ? (
                      <img
                        src={form.logo_url}
                        alt="Brand logo preview"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        No logo
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileInput}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleLogoUpload(f);
                        e.target.value = "";
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInput.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      {form.logo_url ? "Replace logo" : "Upload logo"}
                    </Button>
                    {form.logo_url ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() => update("logo_url", null)}
                      >
                        <X className="mr-1.5 h-3.5 w-3.5" /> Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, WEBP, or SVG. Max 5 MB. Square works best.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="primary_color">Brand color</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="primary_color"
                    type="color"
                    value={form.primary_color}
                    onChange={(e) => update("primary_color", e.target.value)}
                    className="h-10 w-16 p-1"
                  />
                  <Input
                    type="text"
                    value={form.primary_color}
                    onChange={(e) => update("primary_color", e.target.value)}
                    className="max-w-[140px] font-mono text-sm"
                    placeholder="#0A6BFF"
                  />
                </div>
              </div>
            </section>

            {/* Messaging */}
            <section className="space-y-4 border-t pt-6">
              <h3 className="text-sm font-semibold text-foreground">Recipient messaging</h3>

              <div className="space-y-1.5">
                <Label htmlFor="request_heading">Request page heading</Label>
                <Input
                  id="request_heading"
                  placeholder="Send us a few photos"
                  value={form.request_heading}
                  onChange={(e) => update("request_heading", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  The big title on the recipient's request page. Leave blank for the default.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="intro_message">Intro message</Label>
                <Textarea
                  id="intro_message"
                  rows={2}
                  value={form.intro_message}
                  onChange={(e) => update("intro_message", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Shown when the customer opens the link.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="completion_message">Completion message</Label>
                <Textarea
                  id="completion_message"
                  rows={2}
                  value={form.completion_message}
                  onChange={(e) => update("completion_message", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Shown after the customer submits.
                </p>
              </div>
            </section>

            {/* Contact */}
            <section className="space-y-4 border-t pt-6">
              <h3 className="text-sm font-semibold text-foreground">Contact details</h3>
              <p className="-mt-2 text-xs text-muted-foreground">
                Shown on the recipient page so customers can reach you with questions.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="contact_email">Contact email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    placeholder="hello@yourbusiness.com"
                    value={form.contact_email}
                    onChange={(e) => update("contact_email", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact_phone">Contact phone</Label>
                  <Input
                    id="contact_phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={form.contact_phone}
                    onChange={(e) => update("contact_phone", e.target.value)}
                  />
                </div>
              </div>
            </section>

            <div className="flex items-center justify-end gap-2 border-t pt-6">
              <Button type="submit" disabled={saving || uploading}>
                {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                Save changes
              </Button>
            </div>
          </fieldset>
        </form>

        {/* ---------- LIVE PREVIEW ---------- */}
        <aside className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Live preview</h3>
          <div
            className="overflow-hidden rounded-xl border bg-card shadow-elev-sm"
            style={{ borderColor: form.primary_color }}
          >
            <div
              className="flex items-center gap-3 px-5 py-4"
              style={{ backgroundColor: form.primary_color, color: "#fff" }}
            >
              {form.logo_url ? (
                <img
                  src={form.logo_url}
                  alt=""
                  className="h-9 w-9 rounded-md bg-white/90 object-contain p-1"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/20 text-xs font-semibold">
                  {(form.display_name || "B").slice(0, 1).toUpperCase()}
                </div>
              )}
              <p className="text-sm font-semibold">
                {form.display_name || "Your business"}
              </p>
            </div>

            <div className="space-y-3 p-5">
              <p className="text-base font-semibold text-foreground">
                {form.request_heading || "Send us a few photos"}
              </p>
              <p className="text-sm text-muted-foreground">{form.intro_message}</p>

              <div className="rounded-lg border border-dashed bg-muted/40 p-4 text-center text-xs text-muted-foreground">
                [ Photo capture steps appear here ]
              </div>

              <button
                type="button"
                className={cn(
                  "w-full rounded-md px-3 py-2 text-sm font-semibold text-white",
                )}
                style={{ backgroundColor: form.primary_color }}
              >
                Start capture
              </button>

              {(form.contact_email || form.contact_phone) && (
                <p className="text-center text-[11px] text-muted-foreground">
                  Questions?{" "}
                  {form.contact_email ? (
                    <span className="text-foreground">{form.contact_email}</span>
                  ) : null}
                  {form.contact_email && form.contact_phone ? " · " : ""}
                  {form.contact_phone ? (
                    <span className="text-foreground">{form.contact_phone}</span>
                  ) : null}
                </p>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            This is what customers see when they open your request link.
          </p>
        </aside>
      </div>

      {/* White-label */}
      <div className="max-w-3xl space-y-3">
        <h3 className="text-sm font-semibold text-foreground">White-label</h3>
        {canWhiteLabel ? (
          <label className="flex items-start gap-3 surface-card p-4 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={form.hide_photobrief_branding}
              onChange={(e) => update("hide_photobrief_branding", e.target.checked)}
            />
            <div className="space-y-1">
              <p className="font-medium text-foreground">Hide PhotoBrief branding</p>
              <p className="text-xs text-muted-foreground">
                Removes the "PhotoBrief" wordmark from recipient pages. Save changes to apply.
              </p>
            </div>
          </label>
        ) : (
          <UpgradePromptCard feature="white_label" variant="inline" />
        )}
      </div>
    </div>
  );
}
