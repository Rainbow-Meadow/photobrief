import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { GeneratedStepEditor } from "@/features/requests/components/GeneratedStepEditor";
import { GeneratedQuestionEditor } from "@/features/requests/components/GeneratedQuestionEditor";
import { UpgradePromptCard } from "@/components/shared/UpgradePromptCard";

import { guidesService } from "@/services/guidesService";
import { useCurrentWorkspace } from "@/hooks/useCurrentWorkspace";
import { usePlan } from "@/hooks/usePlan";
import { draftFromGuide } from "@/types/requestDraft";
import type { ContextQuestion, GuideStep } from "@/types/photobrief";
import { trackEvent } from "@/lib/analytics";

interface BuilderState {
  name: string;
  description: string;
  steps: GuideStep[];
  questions: ContextQuestion[];
}

const EMPTY_STATE: BuilderState = {
  name: "",
  description: "",
  steps: [],
  questions: [],
};

export default function GuideBuilderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const seedTemplateId = searchParams.get("from");
  const { workspace } = useCurrentWorkspace();
  const { can } = usePlan();
  const canCustom = can("custom_guides");
  const qc = useQueryClient();

  const initial = useMemo<BuilderState>(() => {
    if (!seedTemplateId) return EMPTY_STATE;
    const seed = guidesService.getById(seedTemplateId);
    if (!seed) return EMPTY_STATE;
    const draft = draftFromGuide(seed);
    return {
      name: `${seed.name} (custom)`,
      description: seed.description ?? "",
      steps: draft.steps,
      questions: draft.questions,
    };
  }, [seedTemplateId]);

  const [state, setState] = useState<BuilderState>(initial);
  useEffect(() => {
    setState(initial);
  }, [initial]);

  const save = useMutation({
    mutationFn: async () => {
      if (!workspace?.id) throw new Error("Workspace not loaded");
      if (!state.name.trim()) throw new Error("Give your guide a name");
      if (state.steps.length === 0) throw new Error("Add at least one capture step");
      return guidesService.saveDraftAsGuide({
        workspaceId: workspace.id,
        draft: {
          draftId: `builder_${Date.now()}`,
          source: "template",
          baseGuideId: seedTemplateId ?? undefined,
          title: state.name.trim(),
          introMessage: "",
          completionMessage: "",
          steps: state.steps,
          questions: state.questions,
          readinessRules: [],
          recipientName: "",
          recipientContact: "",
        },
      });
    },
    onSuccess: (guide) => {
      qc.invalidateQueries({ queryKey: ["workspace-guides"] });
      trackEvent("guide_created", { guide_id: guide.id, steps: guide.steps?.length ?? 0, questions: guide.questions?.length ?? 0 });
      toast.success("Guide saved", { description: `"${guide.name}" is ready to use.` });
      navigate(`/guides/${guide.id}`);
    },
    onError: (err: any) => {
      const message = err?.message ?? "Couldn't save guide";
      if (message.includes("PLAN_FEATURE_LOCKED")) {
        toast.error("Custom guides require Pro", {
          description: "Upgrade your plan to create your own guides.",
        });
      } else {
        toast.error(message);
      }
    },
  });

  if (!canCustom) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="New guide"
          description="Custom guides are available on Pro and higher plans."
          actions={
            <Button variant="ghost" size="sm" onClick={() => navigate("/guides")} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Back to library
            </Button>
          }
        />
        <UpgradePromptCard feature="custom_guides" variant="inline" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="New guide"
        description="Define the photo steps and context questions you'll send to recipients."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/guides")} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Cancel
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              disabled={save.isPending}
              onClick={() => save.mutate()}
            >
              <Save className="h-4 w-4" />
              {save.isPending ? "Saving…" : "Save guide"}
            </Button>
          </div>
        }
      />

      <section className="rounded-xl border bg-card p-5 shadow-elev-sm">
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="guide-name">Guide name</Label>
            <Input
              id="guide-name"
              placeholder="e.g. Water heater quote intake"
              value={state.name}
              onChange={(e) => setState({ ...state, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="guide-desc">Description (optional)</Label>
            <Textarea
              id="guide-desc"
              placeholder="What this guide is used for. Visible to your team only."
              value={state.description}
              onChange={(e) => setState({ ...state, description: e.target.value })}
              rows={2}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-5 shadow-elev-sm">
        <header>
          <h2 className="text-sm font-semibold text-foreground">
            Capture steps ({state.steps.length})
          </h2>
          <p className="text-xs text-muted-foreground">
            Each step becomes one photo prompt for the recipient.
          </p>
        </header>
        <GeneratedStepEditor
          steps={state.steps}
          onChange={(steps) => setState({ ...state, steps })}
        />
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-5 shadow-elev-sm">
        <header>
          <h2 className="text-sm font-semibold text-foreground">
            Context questions ({state.questions.length})
          </h2>
          <p className="text-xs text-muted-foreground">
            Optional short prompts asked alongside the photos.
          </p>
        </header>
        <GeneratedQuestionEditor
          questions={state.questions}
          onChange={(questions) => setState({ ...state, questions })}
        />
      </section>
    </div>
  );
}
