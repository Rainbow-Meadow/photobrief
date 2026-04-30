import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Check, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentWorkspace } from "@/hooks/useCurrentWorkspace";
import { withSupabaseRetry, isTransientSupabaseError } from "@/lib/supabaseRetry";
import { onboardingDebug, edgeFunctionErrorDebug, supabaseErrorDebug } from "@/lib/onboardingDebug";
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
  const { workspace, loading: wsLoading, refetch, backendUnavailable } = useCurrentWorkspace();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const autoRepairTried = useRef(false);
  const [form, setForm] = useState<FormState>({
    workspaceName: "",
    industry: "",
    primaryColor: "#0A6BFF",
    introMessage: "Hi! Help us help you — a few quick photos.",
    completionMessage: "Thanks! We've got everything we need.",
  });

  useEffect(() => {
    onboardingDebug("onboarding.route_mount", {
      sessionPresent: !!user,
      currentUserId: user?.id ?? null,
      currentUserEmail: user?.email ?? null,
      workspaceFound: !!workspace?.id,
      onboardingStatus: "onboarding_page_visible",
    });
  }, [user?.id, user?.email, workspace?.id]);

  // Server-side fallback: provision the workspace + bootstrap rows if the
  // signup trigger somehow skipped them (or a transient Cloud failure left
  // the user with no default_workspace_id). Idempotent; safe to retry.
  const repairWorkspace = async (silent = false) => {
    setRepairing(true);
    try {
      onboardingDebug("onboarding.edge_function.start", {
        sessionPresent: !!user,
        currentUserId: user?.id ?? null,
        currentUserEmail: user?.email ?? null,
        requestName: "ensure-workspace",
        urlPath: "/functions/v1/ensure-workspace",
        method: "POST",
        triggeredBy: silent ? "auto_repair_once" : "manual_repair",
      });
      const { data, error } = await supabase.functions.invoke("ensure-workspace", {
        body: {},
      });
      onboardingDebug("onboarding.edge_function.done", {
        sessionPresent: !!user,
        currentUserId: user?.id ?? null,
        currentUserEmail: user?.email ?? null,
        requestName: "ensure-workspace",
        urlPath: "/functions/v1/ensure-workspace",
        method: "POST",
        workspaceFound: !!(data as { workspace_id?: string } | null)?.workspace_id,
        responseBody: data ?? null,
        error: await edgeFunctionErrorDebug(error),
        triggeredBy: silent ? "auto_repair_once" : "manual_repair",
      });
      if (error) throw error;
      await refetch();
      if (!silent) toast.success("Workspace ready");
    } catch (err) {
      onboardingDebug("onboarding.edge_function.thrown", {
        sessionPresent: !!user,
        currentUserId: user?.id ?? null,
        currentUserEmail: user?.email ?? null,
        requestName: "ensure-workspace",
        urlPath: "/functions/v1/ensure-workspace",
        method: "POST",
        thrownErrorMessage: err instanceof Error ? err.message : String(err),
        triggeredBy: silent ? "auto_repair_once" : "manual_repair",
      });
      const msg = err instanceof Error ? err.message : "Could not repair workspace";
      if (!silent) toast.error(msg);
    } finally {
      setRepairing(false);
    }
  };

  // Auto-repair once if the workspace truly can't be loaded (genuinely
  // missing default_workspace_id), but NOT during a transient backend
  // outage — calling ensure-workspace then would amplify the outage and
  // still fail.
  useEffect(() => {
    if (wsLoading || workspace?.id || !user?.id || autoRepairTried.current) return;
    if (backendUnavailable) return;
    autoRepairTried.current = true;
    void repairWorkspace(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsLoading, workspace?.id, user?.id, backendUnavailable]);

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

  // Resolve the workspace id even if useCurrentWorkspace is still spinning
  // on a transient 503 — read directly from profiles, then fall back to
  // the ensure-workspace edge function which will provision one if needed.
  const resolveWorkspaceId = async (): Promise<string | null> => {
    if (workspace?.id) {
      onboardingDebug("onboarding.resolve_workspace.cached", {
        sessionPresent: true,
        currentUserId: user?.id ?? null,
        currentUserEmail: user?.email ?? null,
        workspaceFound: true,
        workspaceId: workspace.id,
      });
      return workspace.id;
    }
    if (!user?.id) {
      onboardingDebug("onboarding.resolve_workspace.no_user", { sessionPresent: false });
      return null;
    }
    onboardingDebug("onboarding.resolve_workspace.profile_lookup.start", {
      sessionPresent: true,
      currentUserId: user.id,
      currentUserEmail: user.email ?? null,
      requestName: "profiles.default_workspace_id",
      urlPath: "public.profiles",
      method: "select",
      triggeredBy: "finish_setup",
    });
    const { data: prof } = await withSupabaseRetry(async () =>
      await supabase
        .from("profiles")
        .select("default_workspace_id")
        .eq("id", user.id)
        .maybeSingle(),
    );
    const profTyped = prof as { default_workspace_id?: string | null } | null;
    onboardingDebug("onboarding.resolve_workspace.profile_lookup.done", {
      sessionPresent: true,
      currentUserId: user.id,
      currentUserEmail: user.email ?? null,
      requestName: "profiles.default_workspace_id",
      urlPath: "public.profiles",
      method: "select",
      profileFound: !!profTyped,
      workspaceFound: !!profTyped?.default_workspace_id,
      triggeredBy: "finish_setup",
    });
    if (profTyped?.default_workspace_id) return profTyped.default_workspace_id;
    // Last resort: ask the edge function to provision and return one.
    onboardingDebug("onboarding.resolve_workspace.edge_function.start", {
      sessionPresent: true,
      currentUserId: user.id,
      currentUserEmail: user.email ?? null,
      requestName: "ensure-workspace",
      urlPath: "/functions/v1/ensure-workspace",
      method: "POST",
      triggeredBy: "finish_setup_missing_workspace",
    });
    const { data: fnData, error: fnError } = await supabase.functions.invoke("ensure-workspace", { body: {} });
    onboardingDebug("onboarding.resolve_workspace.edge_function.done", {
      sessionPresent: true,
      currentUserId: user.id,
      currentUserEmail: user.email ?? null,
      requestName: "ensure-workspace",
      urlPath: "/functions/v1/ensure-workspace",
      method: "POST",
      workspaceFound: !!(fnData as { workspace_id?: string } | null)?.workspace_id,
      responseBody: fnData ?? null,
      error: await edgeFunctionErrorDebug(fnError),
      triggeredBy: "finish_setup_missing_workspace",
    });
    if (fnError) throw fnError;
    return (fnData as { workspace_id?: string } | null)?.workspace_id ?? null;
  };

  const handleFinish = async () => {
    onboardingDebug("onboarding.finish.start", {
      sessionPresent: !!user,
      currentUserId: user?.id ?? null,
      currentUserEmail: user?.email ?? null,
      workspaceFound: !!workspace?.id,
      triggeredBy: "Finish setup button",
    });
    if (!user?.id) {
      toast.error("You need to be signed in.");
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
    setFinishError(null);
    try {
      const wsId = await resolveWorkspaceId();
      if (!wsId) {
        throw new Error("Couldn't load your workspace — please retry.");
      }
      onboardingDebug("onboarding.finish.workspace_resolved", {
        sessionPresent: true,
        currentUserId: user.id,
        currentUserEmail: user.email ?? null,
        workspaceFound: true,
        workspaceId: wsId,
      });

      // Workspace name + industry
      onboardingDebug("onboarding.workspace_update.start", {
        sessionPresent: true,
        currentUserId: user.id,
        currentUserEmail: user.email ?? null,
        requestName: "business_workspaces.update",
        urlPath: "public.business_workspaces",
        method: "update",
        workspaceId: wsId,
      });
      const { error: wsErr } = await withSupabaseRetry(async () =>
        await supabase
          .from("business_workspaces")
          .update({
            name: basics.data.workspaceName,
            industry: basics.data.industry,
          })
          .eq("id", wsId)
          .select("id")
          .maybeSingle(),
      );
      onboardingDebug("onboarding.workspace_update.done", {
        sessionPresent: true,
        currentUserId: user.id,
        currentUserEmail: user.email ?? null,
        requestName: "business_workspaces.update",
        urlPath: "public.business_workspaces",
        method: "update",
        workspaceId: wsId,
        error: supabaseErrorDebug(wsErr),
      });
      if (wsErr) throw wsErr;

      // Brand profile (a row was seeded by handle_new_user; update in place).
      onboardingDebug("onboarding.brand_profile_lookup.start", {
        sessionPresent: true,
        currentUserId: user.id,
        currentUserEmail: user.email ?? null,
        requestName: "brand_profiles.select",
        urlPath: "public.brand_profiles",
        method: "select",
        workspaceId: wsId,
      });
      const { data: existing, error: existErr } = await withSupabaseRetry(async () =>
        await supabase
          .from("brand_profiles")
          .select("id")
          .eq("workspace_id", wsId)
          .maybeSingle(),
      );
      onboardingDebug("onboarding.brand_profile_lookup.done", {
        sessionPresent: true,
        currentUserId: user.id,
        currentUserEmail: user.email ?? null,
        requestName: "brand_profiles.select",
        urlPath: "public.brand_profiles",
        method: "select",
        workspaceId: wsId,
        profileFound: !!existing,
        error: supabaseErrorDebug(existErr),
      });
      if (existErr) throw existErr;

      const brandPayload = {
        workspace_id: wsId,
        primary_color: brand.data.primaryColor,
        intro_message: brand.data.introMessage,
        completion_message: brand.data.completionMessage,
      };
      const existingId = (existing as { id?: string } | null)?.id;
      onboardingDebug("onboarding.brand_profile_write.start", {
        sessionPresent: true,
        currentUserId: user.id,
        currentUserEmail: user.email ?? null,
        requestName: existingId ? "brand_profiles.update" : "brand_profiles.insert",
        urlPath: "public.brand_profiles",
        method: existingId ? "update" : "insert",
        workspaceId: wsId,
      });
      const { error: bpErr } = await withSupabaseRetry(async () =>
        existingId
          ? await supabase
              .from("brand_profiles")
              .update(brandPayload)
              .eq("id", existingId)
              .select("id")
              .maybeSingle()
          : await supabase
              .from("brand_profiles")
              .insert(brandPayload)
              .select("id")
              .maybeSingle(),
      );
      onboardingDebug("onboarding.brand_profile_write.done", {
        sessionPresent: true,
        currentUserId: user.id,
        currentUserEmail: user.email ?? null,
        requestName: existingId ? "brand_profiles.update" : "brand_profiles.insert",
        urlPath: "public.brand_profiles",
        method: existingId ? "update" : "insert",
        workspaceId: wsId,
        error: supabaseErrorDebug(bpErr),
      });
      if (bpErr) throw bpErr;

      // Mark onboarding as complete.
      onboardingDebug("onboarding.profile_complete.start", {
        sessionPresent: true,
        currentUserId: user.id,
        currentUserEmail: user.email ?? null,
        requestName: "profiles.update.onboarded_at",
        urlPath: "public.profiles",
        method: "update",
      });
      const { error: profErr } = await withSupabaseRetry(async () =>
        await supabase
          .from("profiles")
          .update({ onboarded_at: new Date().toISOString() })
          .eq("id", user.id)
          .select("id")
          .maybeSingle(),
      );
      onboardingDebug("onboarding.profile_complete.done", {
        sessionPresent: true,
        currentUserId: user.id,
        currentUserEmail: user.email ?? null,
        requestName: "profiles.update.onboarded_at",
        urlPath: "public.profiles",
        method: "update",
        onboardingStatus: profErr ? "failed" : "complete",
        error: supabaseErrorDebug(profErr),
      });
      if (profErr) throw profErr;

      await refetch();
      toast.success("You're all set");
      onboardingDebug("onboarding.redirect", {
        sessionPresent: true,
        currentUserId: user.id,
        currentUserEmail: user.email ?? null,
        onboardingStatus: "complete",
        redirectDestination: "/dashboard",
        triggeredBy: "finish_success",
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const errObj = err as { code?: string; message?: string } | undefined;
      const transient = isTransientSupabaseError(errObj);
      const msg = transient
        ? "We're having trouble reaching the backend. Wait a moment and try again."
        : errObj?.message ?? "Could not save your workspace";
      setFinishError(msg);
      onboardingDebug("onboarding.finish.error", {
        sessionPresent: !!user,
        currentUserId: user?.id ?? null,
        currentUserEmail: user?.email ?? null,
        onboardingStatus: "failed",
        thrownErrorMessage: errObj?.message ?? String(err),
        errorCode: errObj?.code ?? null,
        transient,
        redirectDestination: null,
      });
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const progress = useMemo(() => Math.round((step / STEPS.length) * 100), [step]);

  return (
    <div className="relative isolate min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-ambient-mesh" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[60vh] bg-ambient-sky" aria-hidden />

      <div className="mx-auto w-full max-w-2xl space-y-8 px-4 py-10">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-eyebrow">Welcome to PhotoBrief</p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Set up your workspace
            </h1>
            <p className="text-sm text-muted-foreground">
              A few quick details so request links look like you. You can change
              everything later in settings.
            </p>
          </div>
          {/* Lens-ring progress dial */}
          <div className="relative hidden h-16 w-16 shrink-0 sm:block" aria-hidden>
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(hsl(var(--primary)) ${progress}%, hsl(var(--muted)) ${progress}%)`,
                WebkitMask: "radial-gradient(circle, transparent 56%, #000 57%)",
                mask: "radial-gradient(circle, transparent 56%, #000 57%)",
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums text-foreground">
              {progress}%
            </div>
          </div>
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
                    "flex h-7 w-7 items-center justify-center rounded-full border text-[11px] transition-colors",
                    done && "border-primary btn-primary-glass text-primary-foreground",
                    active && "border-primary text-primary ring-2 ring-primary/20",
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
          className="h-1 w-full overflow-hidden rounded-full bg-muted/60"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full btn-primary-glass transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

      {!wsLoading && !workspace?.id ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="flex-1 space-y-2">
            <p className="font-medium text-foreground">
              {backendUnavailable
                ? "We can't reach the backend right now"
                : "We can't reach your workspace right now"}
            </p>
            <p className="text-muted-foreground">
              {backendUnavailable
                ? "Our database is temporarily unavailable. This is a service-side issue — your account is safe. Wait a moment and retry; please don't repeatedly refresh."
                : "This usually clears in a few seconds. You can keep filling in the form and we'll save it once the connection recovers."}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" size="sm" variant="outline" onClick={() => void refetch()} disabled={repairing}>
                Retry
              </Button>
              {/* Only offer Repair when we know the workspace is genuinely
                  missing — never during a transient outage, because the
                  edge function would just fail and add backend load. */}
              {!backendUnavailable ? (
                <Button type="button" size="sm" onClick={() => void repairWorkspace(false)} disabled={repairing}>
                  {repairing ? (
                    <span className="inline-flex items-center">
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Repairing…
                    </span>
                  ) : (
                    "Repair workspace"
                  )}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="glass-strong rounded-3xl p-6 sm:p-7 animate-lift-in">
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

        {finishError ? (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-foreground"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
            <div className="flex-1 space-y-1.5">
              <p>{finishError}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void handleFinish()}
                disabled={saving}
              >
                Try again
              </Button>
            </div>
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
              disabled={saving || !user?.id}
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
    </div>
  );
}
