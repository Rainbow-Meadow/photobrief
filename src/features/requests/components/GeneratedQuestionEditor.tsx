import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ContextQuestion, ContextQuestionInputType } from "@/types/photobrief";

const INPUT_TYPES: ContextQuestionInputType[] = [
  "short_text",
  "long_text",
  "single_select",
  "multi_select",
  "number",
];

interface GeneratedQuestionEditorProps {
  questions: ContextQuestion[];
  onChange: (questions: ContextQuestion[]) => void;
}

export function GeneratedQuestionEditor({ questions, onChange }: GeneratedQuestionEditorProps) {
  const update = (idx: number, patch: Partial<ContextQuestion>) => {
    onChange(questions.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };
  const remove = (idx: number) => {
    onChange(questions.filter((_, i) => i !== idx).map((q, i) => ({ ...q, orderIndex: i })));
  };
  const add = () => {
    onChange([
      ...questions,
      {
        id: `q_${Date.now()}`,
        orderIndex: questions.length,
        prompt: "New question",
        inputType: "short_text",
        required: false,
      },
    ]);
  };

  return (
    <div className="space-y-3">
      {questions.length === 0 && (
        <p className="text-xs text-muted-foreground">No context questions. Add one if you need more info.</p>
      )}
      {questions.map((q, idx) => (
        <div key={q.id} className="rounded-lg border bg-background p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              <Input
                value={q.prompt}
                onChange={(e) => update(idx, { prompt: e.target.value })}
                className="h-8 text-sm"
              />
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <Select
                    value={q.inputType}
                    onValueChange={(v) =>
                      update(idx, { inputType: v as ContextQuestionInputType })
                    }
                  >
                    <SelectTrigger className="h-8 w-36 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INPUT_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="text-xs">
                          {t.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`qreq-${q.id}`} className="text-xs text-muted-foreground">
                    Required
                  </Label>
                  <Switch
                    id={`qreq-${q.id}`}
                    checked={q.required}
                    onCheckedChange={(v) => update(idx, { required: v })}
                  />
                </div>
              </div>
              {(q.inputType === "single_select" || q.inputType === "multi_select") && (
                <Input
                  value={(q.options ?? []).join(", ")}
                  onChange={(e) =>
                    update(idx, {
                      options: e.target.value
                        .split(",")
                        .map((o) => o.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Comma-separated options"
                  className="h-8 text-xs"
                />
              )}
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => remove(idx)}
              aria-label="Remove question"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={add}>
        <Plus className="h-4 w-4" /> Add question
      </Button>
    </div>
  );
}
