
import { Camera, MessageCircleQuestion, Pencil, Save, Link as LinkIcon, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { GeneratedStepEditor } from "./GeneratedStepEditor";
import { GeneratedQuestionEditor } from "./GeneratedQuestionEditor";
import type { RequestDraft } from "@/types/requestDraft";

interface RequestDraftPreviewProps {
  draft: RequestDraft;
  onChange: (draft: RequestDraft) => void;
  onCreate: () => void;
  onSaveAsGuide: () => void;
  isSaving?: boolean;
}

/**
 * Editable preview of the AI- or template-generated request.
 * Lets the business tweak title, intro, completion, steps, questions,
 * and recipient before creating the request link.
 */
export function RequestDraftPreview({
  draft,
  onChange,
  onCreate,
  onSaveAsGuide,
  isSaving,
}: RequestDraftPreviewProps) {
  const set = <K extends keyof RequestDraft>(key: K, value: RequestDraft[K]) =>
    onChange({ ...draft, [key]: value });

  const canCreate = draft.recipientName.trim() && draft.recipientContact.trim();

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Request title
            </Label>
            <Input
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              className="text-base font-semibold"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Recipient name</Label>
            <Input
              value={draft.recipientName}
              onChange={(e) => set("recipientName", e.target.value)}
              placeholder="e.g. Maria Alvarez"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Email or phone</Label>
            <Input
              value={draft.recipientContact}
              onChange={(e) => set("recipientContact", e.target.value)}
              placeholder="email@example.com or 555-0142"
            />
          </div>
        </div>
      </div>

      <Accordion
        type="multiple"
        defaultValue={["messages", "steps", "questions"]}
        className="space-y-3"
      >
        <AccordionItem value="messages" className="rounded-xl border bg-card px-4">
          <AccordionTrigger className="text-sm font-medium">
            <span className="flex items-center gap-2">
              <Pencil className="h-4 w-4" /> Intro & completion messages
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Intro message</Label>
              <Textarea
                value={draft.introMessage}
                onChange={(e) => set("introMessage", e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Completion message</Label>
              <Textarea
                value={draft.completionMessage}
                onChange={(e) => set("completionMessage", e.target.value)}
                rows={2}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="steps" className="rounded-xl border bg-card px-4">
          <AccordionTrigger className="text-sm font-medium">
            <span className="flex items-center gap-2">
              <Camera className="h-4 w-4" /> Capture steps ({draft.steps.length})
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <GeneratedStepEditor
              steps={draft.steps}
              onChange={(steps) => set("steps", steps)}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="questions" className="rounded-xl border bg-card px-4">
          <AccordionTrigger className="text-sm font-medium">
            <span className="flex items-center gap-2">
              <MessageCircleQuestion className="h-4 w-4" /> Context questions ({draft.questions.length})
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <GeneratedQuestionEditor
              questions={draft.questions}
              onChange={(questions) => set("questions", questions)}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="readiness" className="rounded-xl border bg-card px-4">
          <AccordionTrigger className="text-sm font-medium">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Readiness rules
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                Preview
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <p className="mb-3 text-xs text-muted-foreground">
              Used to compute the readiness score on each submission. Editable in a later phase.
            </p>
            <ul className="space-y-2">
              {draft.readinessRules.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-xs"
                >
                  <span className="text-foreground">{r.description}</span>
                  <span className="font-medium text-muted-foreground">{r.weight}%</span>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          className="gap-1.5"
          onClick={onCreate}
          disabled={!canCreate || isSaving}
        >
          <LinkIcon className="h-4 w-4" /> Create Request Link
        </Button>
        <Button
          variant="outline"
          className="gap-1.5"
          onClick={() => {
            document.getElementById("draft-preview-top")?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <Pencil className="h-4 w-4" /> Edit Steps
        </Button>
        <Button variant="outline" className="gap-1.5" onClick={onSaveAsGuide}>
          <Save className="h-4 w-4" /> Save as Guide
        </Button>
        {!canCreate && (
          <span className="text-xs text-muted-foreground">
            Add a recipient name and email/phone to enable the link.
          </span>
        )}
      </div>
    </div>
  );
}
