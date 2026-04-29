import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Check, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentWorkspace } from "@/hooks/useCurrentWorkspace";
import { withSupabaseRetry, isTransientSupabaseError } from "@/lib/supabaseRetry";
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
import { cn } from "@/lib/utils";

const INDUSTRIES = [
  { value: "plumbing", label: "Plumbing" },
  { value: "hvac", label: "HVAC" },
  { value: "electrical", label: "Electrical" },
  { value: "landscaping", label: "Landscaping" },
  { value: "junk_removal", label: "Junk removal" },
  { value: "cleaning", label: "Cleaning" },
  { value: "roofing", label: "Roofing" },
  { value: "general_contracting", label: "General contracting" },
  { value: "real_estate", label: "Real estate" },
  { value: "insurance", label: "Insurance / claims" },
  { value: "other", label: "Other" },
];

const HEX = /^#([0-9a-fA-F]{6})$/;

const basicsSchema = z.object({
  workspaceName: z
    .string()
    .trim()
    .min(2, "Business name must be at least 2 characters")
    .max(80, "Business name must be under 80 characters"),
  industry: z.string().trim().min(1, "Pick an industry"),
});

const brandSchema = z.object({
  primaryColor: z.string().regex(HEX, "Use a hex color like #0A6BFF"),
  introMessage: z
    .string()
    .trim()
    .min(5, "Intro message is too short")
    .max(280, "Keep the intro under 280 characters"),
  completionMessage: z
    .string()
    .trim()
    .min(5, "Completion message is too short")
    .max(280, "Keep the completion message under 280 characters"),
});

interface FormState {
  workspaceName: string;
  industry: string;
  primaryColor: string;
  introMessage: string;
  completionMessage: string;
}

const STEPS = [
  { id: 1, label: "Business basics" },
  { id: 2, label: "Brand & voice" },
  { id: 3, label: "Review" },
] as const;

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { workspace, loading: wsLoading, refetch } = useCurrentWorkspace();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({
    workspaceName: "",
    industry: "",
    primaryColor: "#0A6BFF",
    introMessage: "Hi! Help us help you — a few quick photos.",
    completionMessage: "Thanks! We've got everything we need.",
  });

  // Seed initial values from the workspace + brand profile created by the
  // signup trigger so we don't blow away anything the user has already set.
  useEffect(() => {
    if (wsLoading || !workspace?.id) return;
    let cancelled = false;
    (async () => {
      const { data: bp } = await supabase
        .from("brand_profiles")
        .select("primary_color, intro_message, completion_message")
        .eq("workspace_id", workspace.id)
        .maybeSingle();
      if (cancelled) return;
      setForm((f) => ({
        workspaceName: workspace.name?.replace(/'s workspace$/, "") ?? f.workspaceName,
        industry: workspace.industry ?? f.industry,
        primaryColor: bp?.primary_color ?? f.primaryColor,
        introMessage: bp?.intro_message ?? f.introMessage,
        completionMessage: bp?.completion_message ?? f.completionMessage,
      }));
    })();
    return () => {
      cancelled = true;
    };
  }, [wsLoading, workspace?.id, workspace?.name, workspace?.industry]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const goNext = () => {
    if (step === 1) {
      const result = basicsSchema.safeParse(form);
      if (!result.success) {
        toast.error(result.error.issues[0]?.message ?? "Check the form");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const result = brandSchema.safeParse(form);
      if (!result.success) {
        toast.error(result.error.issues[0]?.message ?? "Check the form");
        return;
      }
      setStep(3);
    }
  };

  const goBack = () => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2) : s));

  const handleFinish = async () => {
    if (!user?.id || !workspace?.id) {
      toast.error("Workspace not loaded — please retry.");
      return;
    }
    // Re-validate everything just before write.
    const basics = basicsSchema.safeParse(form);
    const brand = brandSchema.safeParse(form);
    if (!basics.success || !brand.success) {
      toast.error("Some fields need attention");
      setStep(!basics.success ? 1 : 2);
      return;
    }

    setSaving(true);
    try {
      // Workspace name + industry
      const { error: wsErr } = await supabase
        .from("business_workspaces")
        .update({
          name: basics.data.workspaceName,
          industry: basics.data.industry,
        })
        .eq("id", workspace.id);
      if (wsErr) throw wsErr;

      // Brand profile (a row was seeded by handle_new_user; update in place).
      const { data: existing } = await supabase
        .from("brand_profiles")
        .select("id")
        .eq("workspace_id", workspace.id)
        .maybeSingle();

      const brandPayload = {
        workspace_id: workspace.id,
        primary_color: brand.data.primaryColor,
        intro_message: brand.data.introMessage,
        completion_message: brand.data.completionMessage,
      };
      const { error: bpErr } = existing?.id
        ? await supabase.from("brand_profiles").update(brandPayload).eq("id", existing.id)
        : await supabase.from("brand_profiles").insert(brandPayload);
      if (bpErr) throw bpErr;

      // Mark onboarding as complete.
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ onboarded_at: new Date().toISOString() })
        .eq("id", user.id);
      if (profErr) throw profErr;

      await refetch();
      toast.success("You're all set");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save your workspace";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const progress = useMemo(() => Math.round((step / STEPS.length) * 100), [step]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 px-4 py-10">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Welcome to PhotoBrief
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Set up your workspace
        </h1>
        <p className="text-sm text-muted-foreground">
          A few quick details so request links look like you. You can change
          everything later in settings.
        </p>
      </header>

      {/* Stepper */}
      <ol className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
        {STEPS.map((s, idx) => {
          const done = step > s.id;
          const active = step === s.id;
          return (
            <li key={s.id} className="flex flex-1 items-center gap-3">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border text-[11px]",
                  done && "border-primary bg-primary text-primary-foreground",
                  active && "border-primary text-primary",
                  !done && !active && "border-muted-foreground/30",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : s.id}
              </span>
              <span className={cn(active && "text-foreground")}>{s.label}</span>
              {idx < STEPS.length - 1 ? (
                <span className="ml-1 hidden h-px flex-1 bg-border sm:block" />
              ) : null}
            </li>
          );
        })}
      </ol>

      <div
        className="h-1 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-elev-sm">
        {step === 1 ? (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="workspaceName">Business name</Label>
              <Input
                id="workspaceName"
                value={form.workspaceName}
                onChange={(e) => update("workspaceName", e.target.value)}
                placeholder="Bright Spark Plumbing"
                maxLength={80}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Shown to recipients on their request page.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="industry">Industry</Label>
              <Select
                value={form.industry}
                onValueChange={(v) => update("industry", v)}
              >
                <SelectTrigger id="industry">
                  <SelectValue placeholder="Pick the closest match" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((i) => (
                    <SelectItem key={i.value} value={i.value}>
                      {i.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                We'll suggest guide templates that fit.
              </p>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="primaryColor">Brand color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="primaryColor"
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => update("primaryColor", e.target.value)}
                  className="h-10 w-16 cursor-pointer p-1"
                />
                <Input
                  aria-label="Hex color"
                  value={form.primaryColor}
                  onChange={(e) => update("primaryColor", e.target.value)}
                  maxLength={7}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="intro">Intro message</Label>
              <Textarea
                id="intro"
                value={form.introMessage}
                onChange={(e) => update("introMessage", e.target.value)}
                rows={2}
                maxLength={280}
              />
              <p className="text-xs text-muted-foreground">
                The first thing recipients see when they open your link.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="completion">Completion message</Label>
              <Textarea
                id="completion"
                value={form.completionMessage}
                onChange={(e) => update("completionMessage", e.target.value)}
                rows={2}
                maxLength={280}
              />
              <p className="text-xs text-muted-foreground">
                Shown after they finish. Add a thank-you or next step.
              </p>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-foreground">
              Looks good?
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Business name</dt>
                <dd className="text-right font-medium text-foreground">
                  {form.workspaceName}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Industry</dt>
                <dd className="text-right font-medium text-foreground">
                  {INDUSTRIES.find((i) => i.value === form.industry)?.label ??
                    form.industry}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Brand color</dt>
                <dd className="flex items-center gap-2 font-mono text-xs text-foreground">
                  <span
                    className="h-4 w-4 rounded border"
                    style={{ backgroundColor: form.primaryColor }}
                  />
                  {form.primaryColor}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-muted-foreground">Intro message</dt>
                <dd className="rounded-md border bg-muted/40 p-2 text-foreground">
                  {form.introMessage}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-muted-foreground">Completion message</dt>
                <dd className="rounded-md border bg-muted/40 p-2 text-foreground">
                  {form.completionMessage}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={goBack}
            disabled={step === 1 || saving}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          {step < 3 ? (
            <Button type="button" onClick={goNext} className="gap-1.5">
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleFinish}
              disabled={saving || wsLoading}
              className="gap-1.5"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Finish setup
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
