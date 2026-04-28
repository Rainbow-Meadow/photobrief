import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface ChatMessageProps {
  from: "assistant" | "user" | "system";
  children: ReactNode;
  className?: string;
  /** Render bubble with no padding (for cards). */
  bare?: boolean;
}

/**
 * Single chat row with avatar + bubble. Reusable for assistant text,
 * user text, photos, and embedded action cards.
 */
export function ChatMessage({ from, children, className, bare }: ChatMessageProps) {
  if (from === "system") {
    return (
      <div className={cn("py-2 text-center text-xs text-muted-foreground", className)}>
        {children}
      </div>
    );
  }

  const isUser = from === "user";
  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row",
        className,
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-muted text-muted-foreground"
            : "bg-gradient-primary text-primary-foreground shadow-elev-sm",
        )}
        aria-hidden
      >
        {isUser ? (
          <span className="text-xs font-semibold">You</span>
        ) : (
          <MessageSquare className="h-4 w-4" />
        )}
      </span>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl shadow-elev-sm",
          isUser
            ? "rounded-tr-sm bg-primary text-primary-foreground"
            : "rounded-tl-sm border bg-card text-foreground",
          bare ? "p-0 overflow-hidden" : "px-4 py-3",
          // Cards need to expand wider than text bubbles
          bare && "w-full max-w-[92%]",
        )}
      >
        {children}
      </div>
    </div>
  );
}
