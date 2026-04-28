import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";


interface AssistantMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

const SUGGESTIONS = [
  "Create a junk removal quote request",
  "Show requests needing customer action",
  "Send reminder to Devon Park",
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AssistantPanel({ open, onClose }: Props) {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: "intro",
      role: "assistant",
      content:
        "Hi! I can help you draft requests, find work that's stuck, and send reminders. Try one of the suggestions below.",
    },
  ]);

  if (!open) return null;

  function handleCommand(rawText: string) {
    const text = rawText.trim();
    if (!text) return;

    const userMsg: AssistantMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      content: text,
    };

    const lower = text.toLowerCase();
    let reply: AssistantMessage;

    if (/(create|new|draft|build).*(request|quote|brief)/.test(lower) || lower.startsWith("create ")) {
      reply = {
        id: `a_${Date.now()}`,
        role: "assistant",
        content: `Got it — I'll prefill a draft based on "${text}". Open the request builder to review and send.`,
        actionLabel: "Open request builder",
        actionHref: "/requests/new",
      };
    } else if (/(needs?\s+(customer\s+)?action|stuck|stalled|waiting)/.test(lower)) {
      reply = {
        id: `a_${Date.now()}`,
        role: "assistant",
        content: "Filtering the inbox to requests waiting on the customer.",
        actionLabel: "View filtered inbox",
        onAction: () => {
          navigate("/requests?status=needs_customer_action");
          onClose();
        },
      };
    } else if (/(remind|nudge|follow\s*up)/.test(lower)) {
      reply = {
        id: `a_${Date.now()}`,
        role: "assistant",
        content:
          "Open the inbox and tap the bell on any request that's waiting on the customer to send a reminder.",
        actionLabel: "View open requests",
        onAction: () => {
          navigate("/requests?status=needs_customer_action");
          onClose();
        },
      };
    } else if (/(show|list|find).*(request|brief)/.test(lower)) {
      reply = {
        id: `a_${Date.now()}`,
        role: "assistant",
        content: "Opening the requests inbox.",
        actionLabel: "Go to inbox",
        onAction: () => {
          navigate("/requests");
          onClose();
        },
      };
    } else {
      reply = {
        id: `a_${Date.now()}`,
        role: "assistant",
        content:
          "I can create a new request, surface work that's stuck, or send a reminder. Try one of the suggestions.",
      };
    }

    setMessages((prev) => [...prev, userMsg, reply]);
    setInput("");
  }

  return (
    <aside className="flex h-full w-full flex-col rounded-lg border bg-card shadow-elev-md">
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-accent p-1.5 text-accent-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Assistant</p>
            <p className="text-xs text-muted-foreground">Ask for a request, a filter, or a reminder.</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close assistant">
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[90%] rounded-lg px-3 py-2 text-sm",
              m.role === "assistant"
                ? "bg-muted text-foreground"
                : "ml-auto bg-primary text-primary-foreground",
            )}
          >
            <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
            {m.role === "assistant" && (m.actionHref || m.onAction) ? (
              <div className="mt-2">
                {m.actionHref ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      navigate(m.actionHref!);
                      onClose();
                    }}
                  >
                    {m.actionLabel}
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={m.onAction}>
                    {m.actionLabel}
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="border-t px-4 py-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleCommand(s)}
              className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleCommand(input);
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the assistant…"
            className="flex-1"
          />
          <Button type="submit" size="icon" aria-label="Send">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </aside>
  );
}
