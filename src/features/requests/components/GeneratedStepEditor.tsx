import { GripVertical, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GuideStep, ShotType } from "@/types/photobrief";

const SHOT_TYPES: ShotType[] = ["wide", "close_up", "label", "serial", "video", "document"];

interface GeneratedStepEditorProps {
  steps: GuideStep[];
  onChange: (steps: GuideStep[]) => void;
}

/** Inline editor for the generated capture steps. */
export function GeneratedStepEditor({ steps, onChange }: GeneratedStepEditorProps) {
  const update = (idx: number, patch: Partial<GuideStep>) => {
    onChange(steps.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };
  const remove = (idx: number) => {
    onChange(steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, orderIndex: i })));
  };
  const add = () => {
    onChange([
      ...steps,
      {
        id: `step_${Date.now()}`,
        orderIndex: steps.length,
        title: "New photo step",
        instructions: "Describe what the recipient should capture.",
        shotType: "wide",
        overlayType: "full_area",
        aiChecks: ["blur"],
        required: true,
      },
    ]);
  };

  return (
    <div className="space-y-3">
      {steps.map((s, idx) => (
        <div key={s.id} className="rounded-lg border bg-background p-3">
          <div className="flex items-start gap-2">
            <span className="mt-1.5 text-muted-foreground">
              <GripVertical className="h-4 w-4" />
            </span>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Step {idx + 1}
                </span>
                <Input
                  value={s.title}
                  onChange={(e) => update(idx, { title: e.target.value })}
                  className="h-8 text-sm font-medium"
                />
              </div>
              <Textarea
                value={s.instructions}
                onChange={(e) => update(idx, { instructions: e.target.value })}
                rows={2}
                className="text-xs"
              />
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Shot</Label>
                  <Select
                    value={s.shotType}
                    onValueChange={(v) => update(idx, { shotType: v as ShotType })}
                  >
                    <SelectTrigger className="h-8 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SHOT_TYPES.map((st) => (
                        <SelectItem key={st} value={st} className="text-xs">
                          {st.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`req-${s.id}`} className="text-xs text-muted-foreground">
                    Required
                  </Label>
                  <Switch
                    id={`req-${s.id}`}
                    checked={s.required}
                    onCheckedChange={(v) => update(idx, { required: v })}
                  />
                </div>
              </div>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => remove(idx)}
              aria-label="Remove step"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={add}>
        <Plus className="h-4 w-4" /> Add step
      </Button>
    </div>
  );
}
