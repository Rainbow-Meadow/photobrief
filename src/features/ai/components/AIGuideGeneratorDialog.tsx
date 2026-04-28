import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { aiService } from "@/services/aiService";
import { guidesService } from "@/services/guidesService";
import { useCurrentWorkspace } from "@/hooks/useCurrentWorkspace";
import { trackEvent } from "@/lib/analytics";
import type { RequestDraft } from "@/types/requestDraft";

interface Props {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}

export function AIGuideGeneratorDialog({ open, onOpenChange }: Props) {
  const { workspace } = useCurrentWorkspace();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState<RequestDraft | null>(null);
  const [reply, setReply] = useState<string>("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<"draft" | "save" | null>(null);

  function reset() {
    setPrompt("");
    setDraft(null);
    setReply("");
    setName("");
    setBusy(null);
  }

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setBusy("draft");
    try {
      const out = await aiService.generateGuideFromPrompt({ prompt: prompt.trim() });
      setDraft(out.draft);
      setReply(out.assistantReply);
      setName(out.draft.title ?? "Untitled guide");
      trackEvent("guide_used", {
        guide_id: out.sourceGuideId,
        guide_name: out.draft.title ?? "AI draft",
        source: "ai_generator",
      });
    } catch (e: any) {
      const err = e as Error & { requiredPlan?: string };
      toast.error(
        err.requiredPlan
          ? `AI Guide Generator requires the ${err.requiredPlan} plan`
          : err.message ?? "Could not draft guide",
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleSave() {
    if (!draft || !workspace?.id) return;
    setBusy("save");
    try {
      const finalDraft: RequestDraft = { ...draft, title: name.trim() || draft.title };
      const guide = await guidesService.saveDraftAsGuide({
        workspaceId: workspace.id,
        draft: finalDraft,
      });
      toast.success(`Created "${guide.name}"`);
      onOpenChange(false);
      reset();
      navigate(`/guides/${guide.id}`);
    } catch (e: any) {
      const err = e as Error & { requiredPlan?: string; message?: string };
      const msg = err?.message ?? "";
      if (msg.includes("PLAN_FEATURE_LOCKED") || err.requiredPlan) {
        toast.error("Custom guides require the Pro plan or higher");
      } else {
        toast.error(msg || "Could not save guide");
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Guide Generator
          </DialogTitle>
          <DialogDescription>
            Describe what you need photos of — we'll draft a complete capture guide you can edit and save.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ai-guide-prompt">What do you need photos of?</Label>
            <Textarea
              id="ai-guide-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder="e.g. I'm a roofer and need 6 photos from homeowners to quote a small repair: overall house, the damaged area, close-ups of any leaks, the attic if accessible…"
              disabled={busy !== null}
            />
            <p className="text-xs text-muted-foreground">
              The more context you give (industry, what you'll do with the photos, must-have shots), the better the draft.
            </p>
          </div>

          {!draft ? (
            <Button
              onClick={handleGenerate}
              disabled={busy !== null || prompt.trim().length < 10}
              className="gap-1.5"
            >
              {busy === "draft" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              Draft guide
            </Button>
          ) : (
            <div className="space-y-3 rounded-md border bg-muted/30 p-4">
              {reply ? <p className="text-sm text-foreground/90">{reply}</p> : null}
              <div className="space-y-1.5">
                <Label htmlFor="ai-guide-name">Guide name</Label>
                <Input
                  id="ai-guide-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={busy !== null}
                />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {draft.steps.length} {draft.steps.length === 1 ? "step" : "steps"}
                </p>
                <ul className="space-y-1.5 text-sm">
                  {draft.steps.slice(0, 8).map((s, i) => (
                    <li key={s.id} className="flex items-start gap-2">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{s.title}</p>
                        {s.instructions ? (
                          <p className="text-xs text-muted-foreground">{s.instructions}</p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                  {draft.steps.length > 8 ? (
                    <li className="pl-7 text-xs text-muted-foreground">
                      +{draft.steps.length - 8} more
                    </li>
                  ) : null}
                </ul>
              </div>
              {draft.questions.length > 0 ? (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {draft.questions.length} question{draft.questions.length === 1 ? "" : "s"}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {draft.questions.slice(0, 6).map((q) => (
                      <Badge key={q.id} variant="outline" className="font-normal">
                        {q.prompt}
                      </Badge>
                    ))}
                    {draft.questions.length > 6 ? (
                      <Badge variant="outline" className="font-normal">
                        +{draft.questions.length - 6} more
                      </Badge>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <DialogFooter>
          {draft ? (
            <>
              <Button variant="ghost" onClick={() => setDraft(null)} disabled={busy !== null}>
                Start over
              </Button>
              <Button onClick={handleSave} disabled={busy !== null || !name.trim()} className="gap-1.5">
                {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save & open in editor
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
