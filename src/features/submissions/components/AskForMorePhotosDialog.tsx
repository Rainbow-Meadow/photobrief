import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { SubmissionShot } from "@/types/photobrief";

interface Props {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  shots: SubmissionShot[];
  missingItems: string[];
  recipientName: string;
  onSend: (payload: { shotIds: string[]; missingItems: string[]; message: string }) => void;
}

export function AskForMorePhotosDialog({
  open,
  onOpenChange,
  shots,
  missingItems,
  recipientName,
  onSend,
}: Props) {
  const suggested = shots.filter((s) => s.missing || s.feedback?.severity !== "pass");
  const [shotIds, setShotIds] = useState<string[]>(suggested.map((s) => s.id));
  const [extraIds, setExtraIds] = useState<string[]>(missingItems);
  const [message, setMessage] = useState(
    `Hi ${recipientName.split(" ")[0]}, thanks for the photos! We need a couple more before we can quote — see the list below.`,
  );

  useEffect(() => {
    if (open) {
      setShotIds(suggested.map((s) => s.id));
      setExtraIds(missingItems);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = (id: string) =>
    setShotIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  const toggleExtra = (id: string) =>
    setExtraIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ask for more photos</DialogTitle>
          <DialogDescription>
            Pick what you still need — we'll send {recipientName.split(" ")[0]} a follow-up message.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {suggested.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Shots to retake
              </p>
              {suggested.map((s) => (
                <label
                  key={s.id}
                  className="flex items-start gap-3 rounded-md border bg-card p-3 text-sm"
                >
                  <Checkbox
                    checked={shotIds.includes(s.id)}
                    onCheckedChange={() => toggle(s.id)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{s.title}</p>
                    {s.feedback?.headline ? (
                      <p className="text-xs text-muted-foreground">{s.feedback.headline}</p>
                    ) : null}
                  </div>
                </label>
              ))}
            </div>
          ) : null}

          {missingItems.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Missing items
              </p>
              {missingItems.map((m) => (
                <label key={m} className="flex items-center gap-3 rounded-md border bg-card p-3 text-sm">
                  <Checkbox
                    checked={extraIds.includes(m)}
                    onCheckedChange={() => toggleExtra(m)}
                  />
                  <span>{m}</span>
                </label>
              ))}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="more-photos-msg">Message to recipient</Label>
            <Textarea
              id="more-photos-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSend({ shotIds, missingItems: extraIds, message });
              onOpenChange(false);
            }}
            disabled={shotIds.length === 0 && extraIds.length === 0}
          >
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
