import { CheckCircle2, Lightbulb, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "tip" | "warn" | "success";

const styles: Record<Variant, { wrap: string; icon: string; Icon: typeof Lightbulb }> = {
  tip: {
    wrap: "border-primary/20 bg-primary/5 text-foreground",
    icon: "text-primary",
    Icon: Lightbulb,
  },
  warn: {
    wrap: "border-amber-500/30 bg-amber-500/5 text-foreground",
    icon: "text-amber-600 dark:text-amber-400",
    Icon: AlertTriangle,
  },
  success: {
    wrap: "border-emerald-500/30 bg-emerald-500/5 text-foreground",
    icon: "text-emerald-600 dark:text-emerald-400",
    Icon: CheckCircle2,
  },
};

const labels: Record<Variant, string> = {
  tip: "Quick tip",
  warn: "Heads-up",
  success: "What you should see",
};

export function Callout({
  variant = "tip",
  title,
  children,
  className,
}: {
  variant?: Variant;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const s = styles[variant];
  const Icon = s.Icon;
  return (
    <div className={cn("flex gap-3 rounded-lg border p-3 text-sm", s.wrap, className)}>
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", s.icon)} />
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title ?? labels[variant]}
        </p>
        <div className="text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
