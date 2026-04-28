import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFoundingPro } from "@/hooks/useFoundingPro";

interface Props {
  variant?: "default" | "onDark" | "inline";
  className?: string;
}

/**
 * "Founding Pro" availability pill — surfaces remaining seats from the
 * `founding_pro_remaining()` RPC. Hidden once all 50 seats are claimed.
 */
export function FoundingProBadge({ variant = "default", className }: Props) {
  const { remaining, total, available, loading } = useFoundingPro();
  if (loading || !available) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        variant === "onDark" && "border border-white/20 bg-white/10 text-white",
        variant === "default" &&
          "border border-primary/30 bg-primary/10 text-primary",
        variant === "inline" && "bg-warning/10 text-warning",
        className,
      )}
    >
      <Sparkles className="h-3 w-3" />
      Founding Pro · {remaining}/{total} left
    </span>
  );
}
