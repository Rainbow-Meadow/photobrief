import { useEffect, useState } from "react";
import { useSearchParams, NavLink } from "react-router-dom";
import { CheckCircle2, MailCheck, Sparkles } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GlassPanel } from "@/components/ui/glass-panel";
import { BrandMark } from "@/components/layout/BrandMark";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

const BUSINESS_TYPES = [
  "Roofing",
  "HVAC",
  "Plumbing",
  "Electrical",
  "General contractor",
  "Junk removal / hauling",
  "Pest control",
  "Insurance / claims",
  "Property management",
  "Other home services",
  "Other",
];

const VOLUMES = [
  "Under 25 / month",
  "25 – 100 / month",
  "100 – 500 / month",
  "500 – 2,000 / month",
  "2,000+ / month",
];

interface FormState {
  name: string;
  business_name: string;
  email: string;
  business_type: string;
  website: string;
  use_case: string;
  estimated_monthly_requests: string;
  notes: string;
}

const EMPTY: FormState = {
  name: "",
  business_name: "",
  email: "",
  business_type: "",
  website: "",
  use_case: "",
  estimated_monthly_requests: "",
  notes: "",
};

export default function WaitlistPage() {
  const [params] = useSearchParams();
  const interest = params.get("interest");
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<"new" | "already" | null>(null);

  useEffect(() => {
    trackEvent("waitlist_viewed", interest ? { interest } : undefined);
  }, [interest]);

  const update =
    <K extends keyof FormState>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  function validate(): string | null {
    if (!form.name.trim()) return "Please share your name.";
    if (!form.email.trim()) return "We need a work email.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return "That email doesn't look right.";
    }
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast({ title: "Please check the form", description: err, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("waitlist-submit", {
        body: {
          ...form,
          email: form.email.trim().toLowerCase(),
          notes: interest ? `${form.notes ? form.notes + "\n\n" : ""}interest=${interest}` : form.notes,
          source: interest ? `web:${interest}` : "web",
        },
      });
      if (error) throw error;
      const payload = data as { ok?: boolean; already?: boolean } | null;
      if (payload?.already) {
        trackEvent("waitlist_duplicate");
        setDone("already");
      } else {
        trackEvent("waitlist_submitted");
        setDone("new");
      }
    } catch (e) {
      toast({
        title: "Something went wrong",
        description: (e as Error).message ?? "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative isolate overflow-hidden">
      <SEOHead
        title="Join the PhotoBrief beta waitlist"
        description="PhotoBrief is invite-only while we onboard beta businesses. Join the waitlist and we'll reach out when your workspace is ready."
        canonicalPath="/waitlist"
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-ambient-mesh" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[60vh] bg-ambient-sky" aria-hidden />

      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:py-20">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark variant="stacked" tone="color" size={96} eager withGlow />
          <span className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Invite-only beta
          </span>
          <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Get early access to PhotoBrief
          </h1>
          <p className="mt-4 max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
            PhotoBrief is currently invite-only while we onboard beta businesses. Join the
            waitlist and we'll reach out when your workspace is ready.
          </p>
        </div>

        {done === "new" && (
          <GlassPanel variant="modal" elevation="lg" className="p-8 text-center animate-lift-in">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2 className="mt-5 text-xl font-semibold">You're on the list</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Thanks — we'll review your request and reach out if PhotoBrief is a fit for the beta.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <NavLink to="/">Back to home</NavLink>
            </Button>
          </GlassPanel>
        )}

        {done === "already" && (
          <GlassPanel variant="modal" elevation="lg" className="p-8 text-center animate-lift-in">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MailCheck className="h-7 w-7" />
            </div>
            <h2 className="mt-5 text-xl font-semibold">Looks like you're already on the list</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We've got your details. We'll reach out as soon as a spot opens up for your workspace.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <NavLink to="/">Back to home</NavLink>
            </Button>
          </GlassPanel>
        )}

        {done === null && (
          <GlassPanel variant="modal" elevation="lg" className="p-6 sm:p-8">
            <form onSubmit={onSubmit} className="grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="name" label="Your name" required>
                  <Input id="name" value={form.name} onChange={update("name")} autoComplete="name" required />
                </Field>
                <Field id="business_name" label="Business name">
                  <Input
                    id="business_name"
                    value={form.business_name}
                    onChange={update("business_name")}
                    autoComplete="organization"
                  />
                </Field>
              </div>

              <Field id="email" label="Work email" required>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={update("email")}
                  autoComplete="email"
                  required
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="business_type" label="Business type">
                  <select
                    id="business_type"
                    value={form.business_type}
                    onChange={update("business_type")}
                    className="flex h-11 w-full rounded-xl border border-glass-border bg-background/60 px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select…</option>
                    {BUSINESS_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="website" label="Website">
                  <Input
                    id="website"
                    value={form.website}
                    onChange={update("website")}
                    placeholder="https://"
                    autoComplete="url"
                  />
                </Field>
              </div>

              <Field
                id="use_case"
                label="What do you want customers to send photos for?"
              >
                <Textarea
                  id="use_case"
                  value={form.use_case}
                  onChange={update("use_case")}
                  rows={3}
                  placeholder="e.g. Roof inspection photos before we send a quote."
                />
              </Field>

              <Field id="estimated_monthly_requests" label="Estimated monthly customer photo requests">
                <select
                  id="estimated_monthly_requests"
                  value={form.estimated_monthly_requests}
                  onChange={update("estimated_monthly_requests")}
                  className="flex h-11 w-full rounded-xl border border-glass-border bg-background/60 px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select…</option>
                  {VOLUMES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>

              <Field id="notes" label="Anything else? (optional)">
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={update("notes")}
                  rows={3}
                  placeholder="Anything that would help us prioritize your spot."
                />
              </Field>

              <div className="flex items-center justify-between gap-4 pt-2">
                <p className="text-xs text-muted-foreground">
                  We're onboarding businesses carefully. We typically reply within a few days.
                </p>
                <Button type="submit" size="lg" disabled={submitting}>
                  {submitting ? "Submitting…" : "Join waitlist"}
                </Button>
              </div>
            </form>
          </GlassPanel>
        )}

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <NavLink to="/auth" className="font-medium text-primary hover:underline">
            Sign in
          </NavLink>
        </p>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  required,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 inline-block">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}
