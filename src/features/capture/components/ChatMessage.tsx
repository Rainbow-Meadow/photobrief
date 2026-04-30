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
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1",
          isUser
            ? "bg-muted text-muted-foreground ring-border"
            : "btn-primary-glass text-primary-foreground ring-primary/30",
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
          "max-w-[85%] rounded-2xl",
          isUser
            ? "rounded-tr-sm bubble-user"
            : "rounded-tl-sm bubble-assistant text-foreground",
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
