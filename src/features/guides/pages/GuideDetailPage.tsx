import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Pencil, Save, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { GeneratedStepEditor } from "@/features/requests/components/GeneratedStepEditor";
import { GeneratedQuestionEditor } from "@/features/requests/components/GeneratedQuestionEditor";

import { useGuideAsync } from "@/hooks/useGuides";
import { useCurrentWorkspace } from "@/hooks/useCurrentWorkspace";
import { guidesService } from "@/services/guidesService";
import type { ContextQuestion, GuideStep, PhotoGuide } from "@/types/photobrief";
import { trackEvent } from "@/lib/analytics";

interface EditState {
  name: string;
  description: string;
  steps: GuideStep[];
  questions: ContextQuestion[];
}

function fromGuide(g: PhotoGuide): EditState {
  return {
    name: g.name,
    description: g.description ?? "",
    steps: g.steps.map((s) => ({ ...s })),
    questions: g.questions.map((q) => ({ ...q })),
  };
}

export default function GuideDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { workspace } = useCurrentWorkspace();
  const { data: guide, isLoading } = useGuideAsync(id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isCustom = useMemo(
    () => !!guide && !!guide.workspaceId && guide.workspaceId === workspace?.id,
    [guide, workspace],
  );

  useEffect(() => {
    if (guide && editing) setDraft(fromGuide(guide));
  }, [guide, editing]);

  useEffect(() => {
    if (guide) {
      trackEvent("guide_viewed", { guide_id: guide.id, guide_name: guide.name, source: "detail_page" });
    }
  }, [guide?.id]);

  const update = useMutation({
    mutationFn: async () => {
      if (!guide || !draft) throw new Error("No guide loaded");
      if (!draft.name.trim()) throw new Error("Give your guide a name");
      return guidesService.updateGuide({
        guideId: guide.id,
        name: draft.name.trim(),
        description: draft.description,
        steps: draft.steps,
        questions: draft.questions,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guide", id] });
      qc.invalidateQueries({ queryKey: ["workspace-guides"] });
      toast.success("Guide updated");
      setEditing(false);
    },
    onError: (err: any) =>
      toast.error(err?.message ?? "Couldn't update guide"),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!guide) throw new Error("No guide loaded");
      return guidesService.deleteGuide(guide.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-guides"] });
      toast.success("Guide deleted");
      navigate("/guides");
    },
    onError: (err: any) =>
      toast.error(err?.message ?? "Couldn't delete guide"),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading guide…</p>;
  }
  if (!guide) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Guide not found"
        description="This guide no longer exists."
      />
    );
  }

  const view = editing && draft ? draft : fromGuide(guide);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={view.name}
        description={view.description || guide.description || `${view.steps.length} steps · ${view.questions.length} questions`}
        actions={
          <div className="flex items-center gap-2">
            {!editing ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => navigate(`/requests/new?guide=${guide.id}`)}
                >
                  <Send className="h-4 w-4" /> Use this guide
                </Button>
                {isCustom ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5"
                      onClick={() => setEditing(true)}
                    >
                      <Pencil className="h-4 w-4" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-destructive hover:text-destructive"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5"
                    onClick={() => navigate(`/guides/new?from=${guide.id}`)}
                  >
                    <Pencil className="h-4 w-4" /> Customize a copy
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5"
                  onClick={() => setEditing(false)}
                >
                  <X className="h-4 w-4" /> Cancel
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={update.isPending}
                  onClick={() => update.mutate()}
                >
                  <Save className="h-4 w-4" />
                  {update.isPending ? "Saving…" : "Save changes"}
                </Button>
              </>
            )}
          </div>
        }
      />

      {editing && draft ? (
        <section className="space-y-4 rounded-xl border bg-card p-5 shadow-elev-sm">
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="g-name">Guide name</Label>
              <Input
                id="g-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-desc">Description</Label>
              <Textarea
                id="g-desc"
                rows={2}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </div>
          </div>
        </section>
      ) : null}

      <section className="space-y-3 rounded-xl border bg-card p-5 shadow-elev-sm">
        <header>
          <h2 className="text-sm font-semibold text-foreground">
            Capture steps ({view.steps.length})
          </h2>
        </header>
        {editing && draft ? (
          <GeneratedStepEditor
            steps={draft.steps}
            onChange={(steps) => setDraft({ ...draft, steps })}
          />
        ) : (
          <ol className="space-y-3">
            {view.steps.map((step, i) => (
              <li key={step.id} className="flex gap-3 rounded-md border bg-background p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{step.title}</p>
                  {step.instructions ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{step.instructions}</p>
                  ) : null}
                </div>
              </li>
            ))}
            {view.steps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No steps defined yet.</p>
            ) : null}
          </ol>
        )}
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-5 shadow-elev-sm">
        <header>
          <h2 className="text-sm font-semibold text-foreground">
            Context questions ({view.questions.length})
          </h2>
        </header>
        {editing && draft ? (
          <GeneratedQuestionEditor
            questions={draft.questions}
            onChange={(questions) => setDraft({ ...draft, questions })}
          />
        ) : view.questions.length > 0 ? (
          <ul className="space-y-2">
            {view.questions.map((q) => (
              <li key={q.id} className="rounded-md border bg-background p-3 text-sm text-foreground">
                {q.prompt}
                {q.required ? <span className="ml-1 text-destructive">*</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No questions for this guide.</p>
        )}
      </section>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this guide?</AlertDialogTitle>
            <AlertDialogDescription>
              "{view.name}" will be removed from your library. Existing requests already sent with this guide aren't affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => remove.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete guide
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
