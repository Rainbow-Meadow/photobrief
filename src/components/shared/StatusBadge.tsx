import { cn } from "@/lib/utils";

type Tone = "neutral" | "info" | "warning" | "success" | "muted" | "destructive";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-secondary text-secondary-foreground",
  info: "bg-accent text-accent-foreground",
  warning: "bg-warning/15 text-warning-foreground border border-warning/30",
  success: "bg-success/15 text-success border border-success/30",
  muted: "bg-muted text-muted-foreground",
  destructive: "bg-destructive/15 text-destructive border border-destructive/30",
};

interface StatusBadgeProps {
  label: string;
  tone?: Tone;
  className?: string;
}

export function StatusBadge({ label, tone = "neutral", className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
