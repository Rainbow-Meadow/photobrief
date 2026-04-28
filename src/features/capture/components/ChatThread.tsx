import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

interface ChatThreadProps {
  children: ReactNode;
  /** Re-scroll to bottom whenever this value changes (e.g. messages.length). */
  autoScrollKey?: string | number;
}

/** Scrollable message column with auto-scroll to bottom. */
export function ChatThread({ children, autoScrollKey }: ChatThreadProps) {
  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [autoScrollKey]);

  return (
    <div className="space-y-4 pb-6">
      {children}
      <div ref={endRef} />
    </div>
  );
}
