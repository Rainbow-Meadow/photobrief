import { useState } from "react";
import { Loader2, Play, Sparkles, Copy, Check, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { GlassPanel } from "@/components/ui/glass-panel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AIEnvelopeResponse {
  task: "submission_summary" | "guide_generation";
  escalate: boolean;
  tier: string;
  model: string;
  attempts: { model: string; ok: boolean; ms: number; error?: string }[];
  durationMs: number;
  envelope: {
    result: any;
    confidence: number;
    flags: string[];
    recipient_feedback: string | null;
    business_summary: string | null;
    missing_items: string[];
    suggested_next_action: string | null;
  };
  result: any;
}

type RunSlot = "baseline" | "escalated";

interface RunState {
  loading: boolean;
  data?: AIEnvelopeResponse;
  error?: string;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminAIRerunPage() {
  const [tab, setTab] = useState<"summary" | "guide">("summary");

  // Summary inputs
  const [submissionId, setSubmissionId] = useState("");

  // Guide inputs
  const [prompt, setPrompt] = useState(
    "I do roof repairs. I want photos of the damaged area, the surrounding roof, and any visible water damage inside.",
  );
  const [category, setCategory] = useState("Roofing");

  const [baseline, setBaseline] = useState<RunState>({ loading: false });
  const [escalated, setEscalated] = useState<RunState>({ loading: false });

  async function runOnce(escalate: boolean) {
    const slotSetter = escalate ? setEscalated : setBaseline;
    slotSetter({ loading: true });

    const task = tab === "summary" ? "submission_summary" : "guide_generation";
    const input =
      tab === "summary"
        ? { submissionId: submissionId.trim() }
        : { prompt: prompt.trim(), category: category.trim() || undefined };

    if (tab === "summary" && !submissionId.trim()) {
      slotSetter({ loading: false, error: "Submission ID required" });
      return;
    }
    if (tab === "guide" && !prompt.trim()) {
      slotSetter({ loading: false, error: "Prompt required" });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("admin-ai-rerun", {
        body: { task, escalate, input },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      slotSetter({ loading: false, data: data as AIEnvelopeResponse });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Run failed";
      slotSetter({ loading: false, error: msg });
      toast.error(msg);
    }
  }

  async function runBoth() {
    setBaseline({ loading: true });
    setEscalated({ loading: true });
    await Promise.all([runOnce(false), runOnce(true)]);
  }

  function reset() {
    setBaseline({ loading: false });
    setEscalated({ loading: false });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <PageHeader
        eyebrow="Platform admin"
        title="AI rerun & escalation diff"
        description="Re-run guide or summary tasks through the model router and compare baseline vs. escalated envelope outputs."
      />

      {/* Input panel */}
      <GlassPanel className="p-5">
        <Tabs value={tab} onValueChange={(v) => { setTab(v as any); reset(); }}>
          <TabsList>
            <TabsTrigger value="summary">Submission summary</TabsTrigger>
            <TabsTrigger value="guide">Guide generation</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-4 space-y-3">
            <div>
              <Label htmlFor="submission-id" className="text-xs uppercase tracking-wide text-muted-foreground">
                Submission ID (UUID)
              </Label>
              <Input
                id="submission-id"
                value={submissionId}
                onChange={(e) => setSubmissionId(e.target.value)}
                placeholder="00000000-0000-0000-0000-000000000000"
                className="mt-1 font-mono text-xs"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Loads photos, AI checks, and recipient answers from this submission.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="guide" className="mt-4 space-y-3">
            <div>
              <Label htmlFor="guide-prompt" className="text-xs uppercase tracking-wide text-muted-foreground">
                Business owner prompt
              </Label>
              <Textarea
                id="guide-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="mt-1 text-sm"
              />
            </div>
            <div className="max-w-xs">
              <Label htmlFor="guide-category" className="text-xs uppercase tracking-wide text-muted-foreground">
                Category (optional)
              </Label>
              <Input
                id="guide-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 text-sm"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button onClick={runBoth} disabled={baseline.loading || escalated.loading} className="gap-1.5">
            <Play className="h-4 w-4" /> Run baseline + escalation
          </Button>
          <Button
            variant="outline"
            onClick={() => runOnce(false)}
            disabled={baseline.loading}
            className="gap-1.5"
          >
            {baseline.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Baseline only
          </Button>
          <Button
            variant="outline"
            onClick={() => runOnce(true)}
            disabled={escalated.loading}
            className="gap-1.5"
          >
            {escalated.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Escalation only
          </Button>
          <Button variant="ghost" onClick={reset} className="ml-auto">Clear results</Button>
        </div>
      </GlassPanel>

      {/* Diff grid */}
      <div className="grid gap-5 lg:grid-cols-2">
        <RunColumn
          slot="baseline"
          title="Baseline run"
          subtitle={tab === "summary" ? "vision tier" : "default tier"}
          state={baseline}
          compareTo={escalated.data}
        />
        <RunColumn
          slot="escalated"
          title="Escalated run"
          subtitle="escalation tier (premium)"
          state={escalated}
          compareTo={baseline.data}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Run column
// ---------------------------------------------------------------------------

function RunColumn({
  slot,
  title,
  subtitle,
  state,
  compareTo,
}: {
  slot: RunSlot;
  title: string;
  subtitle: string;
  state: RunState;
  compareTo?: AIEnvelopeResponse;
}) {
  return (
    <GlassPanel
      className={cn(
        "p-5",
        slot === "escalated" && "border-accent/40",
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
            {slot === "escalated" ? <Sparkles className="h-4 w-4 text-accent-foreground" /> : null}
            {title}
          </h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {state.data ? (
          <div className="flex flex-col items-end gap-1 text-right">
            <Badge variant="outline" className="font-mono text-[10px]">{state.data.model}</Badge>
            <span className="text-[10px] text-muted-foreground">
              {state.data.durationMs} ms · {state.data.attempts.length} attempt{state.data.attempts.length === 1 ? "" : "s"}
            </span>
          </div>
        ) : null}
      </header>

      {state.loading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Running…
        </div>
      ) : state.error ? (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>{state.error}</p>
        </div>
      ) : !state.data ? (
        <p className="mt-6 text-sm text-muted-foreground">No run yet.</p>
      ) : (
        <EnvelopeView data={state.data} compareTo={compareTo} />
      )}
    </GlassPanel>
  );
}

// ---------------------------------------------------------------------------
// Envelope view + diff highlighting
// ---------------------------------------------------------------------------

function EnvelopeView({
  data,
  compareTo,
}: {
  data: AIEnvelopeResponse;
  compareTo?: AIEnvelopeResponse;
}) {
  const env = data.envelope;
  const other = compareTo?.envelope;

  const diffConfidence = other ? env.confidence - other.confidence : 0;

  return (
    <div className="mt-4 space-y-4">
      {/* Confidence + flags */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Confidence</p>
          <p className="text-lg font-semibold tabular-nums">
            {(env.confidence * 100).toFixed(0)}%
            {compareTo ? (
              <span
                className={cn(
                  "ml-2 text-xs font-medium",
                  diffConfidence > 0 && "text-success",
                  diffConfidence < 0 && "text-destructive",
                  diffConfidence === 0 && "text-muted-foreground",
                )}
              >
                {diffConfidence > 0 ? "+" : ""}
                {(diffConfidence * 100).toFixed(0)} pts
              </span>
            ) : null}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-1">
          {env.flags.length === 0 ? (
            <span className="text-xs text-muted-foreground">No flags</span>
          ) : (
            env.flags.map((f) => (
              <Badge
                key={f}
                variant="outline"
                className={cn(
                  "text-[10px]",
                  other && !other.flags.includes(f) && "border-warning/50 bg-warning/10",
                )}
              >
                {f}
              </Badge>
            ))
          )}
        </div>
      </div>

      <Field
        label="Business summary"
        value={env.business_summary}
        changed={!!other && other.business_summary !== env.business_summary}
      />
      <Field
        label="Suggested next action"
        value={env.suggested_next_action}
        changed={!!other && other.suggested_next_action !== env.suggested_next_action}
      />
      <Field
        label="Recipient feedback"
        value={env.recipient_feedback}
        changed={!!other && other.recipient_feedback !== env.recipient_feedback}
      />

      <ListField
        label="Missing items"
        items={env.missing_items}
        otherItems={other?.missing_items}
      />

      {/* Attempts log */}
      {data.attempts.length > 0 ? (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Router attempts
          </p>
          <ul className="mt-1 space-y-1">
            {data.attempts.map((a, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded border bg-muted/30 px-2 py-1 text-[11px] font-mono"
              >
                <span className="truncate">{a.model}</span>
                <span className={cn(a.ok ? "text-success" : "text-destructive")}>
                  {a.ok ? `ok · ${a.ms}ms` : `fail · ${a.error ?? "error"}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Raw result JSON */}
      <RawJSON label="result" value={env.result} />
    </div>
  );
}

function Field({
  label,
  value,
  changed,
}: {
  label: string;
  value: string | null | undefined;
  changed?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2",
        changed ? "border-warning/50 bg-warning/10" : "bg-muted/20",
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap text-sm leading-snug text-foreground">
        {value || <span className="italic text-muted-foreground">—</span>}
      </p>
    </div>
  );
}

function ListField({
  label,
  items,
  otherItems,
}: {
  label: string;
  items: string[];
  otherItems?: string[];
}) {
  const otherSet = new Set(otherItems ?? []);
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      {items.length === 0 ? (
        <p className="mt-1 text-xs italic text-muted-foreground">None</p>
      ) : (
        <ul className="mt-1 flex flex-wrap gap-1">
          {items.map((it, i) => {
            const isNew = otherItems && !otherSet.has(it);
            return (
              <li
                key={i}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[11px]",
                  isNew ? "border-warning/50 bg-warning/10" : "bg-muted/30",
                )}
              >
                {it}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function RawJSON({ label, value }: { label: string; value: any }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const json = JSON.stringify(value, null, 2);

  async function copy() {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="rounded-md border bg-muted/20">
      <div className="flex items-center justify-between px-3 py-1.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
        >
          {open ? "▾" : "▸"} Raw {label}
        </button>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
        >
          {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {open ? (
        <pre className="max-h-72 overflow-auto border-t bg-background/50 px-3 py-2 text-[11px] leading-snug">
          {json}
        </pre>
      ) : null}
    </div>
  );
}
