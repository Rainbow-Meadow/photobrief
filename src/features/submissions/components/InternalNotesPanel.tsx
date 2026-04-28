import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UpgradePromptCard } from "@/components/shared/UpgradePromptCard";
import { formatRelativeTime } from "@/utils/format";
import { usePlan } from "@/hooks/usePlan";
import type { InternalNote } from "@/types/photobrief";

interface Props {
  notes: InternalNote[];
  onAdd: (body: string) => void;
}

export function InternalNotesPanel({ notes, onAdd }: Props) {
  const { can } = usePlan();
  const unlocked = can("internal_notes");
  const [draft, setDraft] = useState("");

  if (!unlocked) {
    return <UpgradePromptCard feature="internal_notes" />;
  }

  return (
    <div className="space-y-3">
      {notes.length === 0 ? (
        <p className="text-xs text-muted-foreground">No notes yet. Anything you write here stays internal.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="rounded-md border bg-muted/40 p-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">
                  {n.authorInitials}
                </span>
                <p className="text-xs font-medium text-foreground">{n.authorName}</p>
                <span className="text-[11px] text-muted-foreground">{formatRelativeTime(n.createdAt)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-snug text-foreground/90">
                {n.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder="Add a note for the team…"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={!draft.trim()}
            onClick={() => {
              onAdd(draft.trim());
              setDraft("");
            }}
          >
            Post note
          </Button>
        </div>
      </div>
    </div>
  );
}
