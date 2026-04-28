import { cn } from "@/lib/utils";

interface ReadinessProgressProps {
  value: number; // 0-100
  className?: string;
}

export function ReadinessProgress({ value, className }: ReadinessProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const tone =
    clamped >= 85 ? "bg-success" : clamped >= 60 ? "bg-warning" : "bg-destructive";
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn("h-full rounded-full transition-all", tone)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
