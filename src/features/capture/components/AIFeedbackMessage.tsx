import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CapturedPhoto } from "@/types/chat";
import type { AICheckSeverity } from "@/types/photobrief";

interface AIFeedbackMessageProps {
  photo: CapturedPhoto;
  verdict: AICheckSeverity;
}

const verdictMeta: Record<
  AICheckSeverity,
  { Icon: typeof CheckCircle2; label: string; tone: string }
> = {
  pass: {
    Icon: CheckCircle2,
    label: "Looks great",
    tone: "text-success",
  },
  warn: {
    Icon: AlertTriangle,
    label: "Could be better",
    tone: "text-warning",
  },
  fail: {
    Icon: XCircle,
    label: "Let's try again",
    tone: "text-destructive",
  },
  unavailable: {
    Icon: HelpCircle,
    label: "AI review unavailable",
    tone: "text-muted-foreground",
  },
};

const checkIcon = (sev: AICheckSeverity) => {
  if (sev === "pass") return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
  if (sev === "warn") return <AlertTriangle className="h-3.5 w-3.5 text-warning" />;
  if (sev === "unavailable") return <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />;
  return <XCircle className="h-3.5 w-3.5 text-destructive" />;
};

export function AIFeedbackMessage({ photo, verdict }: AIFeedbackMessageProps) {
  const { Icon, label, tone } = verdictMeta[verdict];
  // Only show messages that aren't a passing detector ("Label detected" etc.)
  const meaningful = photo.checks.filter(
    (c) => c.severity !== "pass" || c.message.trim().length > 0,
  );
  return (
    <div className="space-y-2">
      <div className={cn("flex items-center gap-1.5 text-sm font-semibold", tone)}>
        <Icon className="h-4 w-4" /> {label}
      </div>
      <ul className="space-y-1.5">
        {meaningful.map((c, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
            <span className="mt-0.5">{checkIcon(c.severity)}</span>
            <span>{c.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
