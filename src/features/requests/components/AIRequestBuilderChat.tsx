import { useState } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface AiBuilderMessage {
  id: string;
  from: "user" | "assistant";
  text: string;
  pending?: boolean;
}

interface AIRequestBuilderChatProps {
  messages: AiBuilderMessage[];
  isGenerating: boolean;
  onSubmit: (prompt: string) => void;
}

const SUGGESTIONS = [
  "I need photos for a junk removal quote.",
  "Photos for a leak under the kitchen sink.",
  "Site survey for a backyard landscaping project.",
  "Appliance repair intake — dishwasher won't drain.",
];

/** Conversational input panel for the AI request builder. */
export function AIRequestBuilderChat({ messages, isGenerating, onSubmit }: AIRequestBuilderChatProps) {
  const [value, setValue] = useState("");

  const submit = (text?: string) => {
    const out = (text ?? value).trim();
    if (!out) return;
    onSubmit(out);
    setValue("");
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex-1 space-y-3 rounded-xl border bg-card p-4 min-h-[280px]">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-8 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </span>
            <p className="text-sm font-medium text-foreground">
              Describe what photos you need
            </p>
            <p className="max-w-xs text-xs text-muted-foreground">
              I'll draft a request with steps, questions, and a friendly intro message you can edit.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => submit(s)}
                  className="rounded-full border bg-background px-3 py-1 text-xs text-foreground/80 hover:bg-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={cn("flex gap-2", m.from === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                  m.from === "user"
                    ? "rounded-tr-sm bg-primary text-primary-foreground"
                    : "rounded-tl-sm border bg-background text-foreground",
                )}
              >
                {m.pending ? (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Drafting…
                  </span>
                ) : (
                  m.text
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-end gap-2"
      >
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. I need photos for a junk removal quote."
          rows={2}
          disabled={isGenerating}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <Button type="submit" size="icon" disabled={isGenerating || !value.trim()}>
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
