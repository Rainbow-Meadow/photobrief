import { CheckCircle2, AlertTriangle, XCircle, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatRelativeTime } from "@/utils/format";
import type { ShotFeedbackSeverity, SubmissionShot } from "@/types/photobrief";

const severityMeta: Record<
  ShotFeedbackSeverity,
  { label: string; tone: "success" | "warning" | "destructive"; Icon: typeof CheckCircle2 }
> = {
  pass: { label: "Looks good", tone: "success", Icon: CheckCircle2 },
  warn: { label: "Needs attention", tone: "warning", Icon: AlertTriangle },
  fail: { label: "Reject / missing", tone: "destructive", Icon: XCircle },
};

interface Props {
  shot: SubmissionShot;
}

export function ShotCard({ shot }: Props) {
  const sev = shot.feedback?.severity ?? (shot.missing ? "fail" : "pass");
  const meta = severityMeta[sev];

  return (
    <article className="overflow-hidden rounded-lg border bg-card shadow-elev-sm">
      <div className="relative aspect-video w-full bg-muted">
        {shot.missing || !shot.imageUrl ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted-foreground">
            <ImageOff className="h-6 w-6" />
            <p className="text-xs">Not captured</p>
          </div>
        ) : (
          <img
            src={shot.imageUrl}
            alt={shot.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        )}
        <div className="absolute left-2 top-2">
          <span className="rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-medium text-foreground shadow-sm">
            #{shot.orderIndex + 1}
          </span>
        </div>
        <div className="absolute right-2 top-2">
          <StatusBadge label={meta.label} tone={meta.tone} />
        </div>
      </div>

      <div className="space-y-2 p-4">
        <header className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">{shot.title}</h3>
            {shot.capturedAt ? (
              <p className="text-xs text-muted-foreground">
                Captured {formatRelativeTime(shot.capturedAt)}
              </p>
            ) : null}
          </div>
        </header>

        {shot.feedback ? (
          <div
            className={cn(
              "rounded-md border px-3 py-2 text-xs",
              sev === "pass" && "border-success/30 bg-success/5 text-foreground",
              sev === "warn" && "border-warning/30 bg-warning/10 text-foreground",
              sev === "fail" && "border-destructive/30 bg-destructive/5 text-foreground",
            )}
          >
            <div className="flex items-center gap-1.5 font-medium">
              <meta.Icon
                className={cn(
                  "h-3.5 w-3.5",
                  sev === "pass" && "text-success",
                  sev === "warn" && "text-warning-foreground",
                  sev === "fail" && "text-destructive",
                )}
              />
              <span>{shot.feedback.headline}</span>
            </div>
            {shot.feedback.detail ? (
              <p className="mt-1 leading-snug text-muted-foreground">{shot.feedback.detail}</p>
            ) : null}
            {shot.feedback.checks && shot.feedback.checks.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-1">
                {shot.feedback.checks.map((c) => (
                  <li
                    key={c.type}
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px]",
                      c.severity === "pass" && "border-success/30 text-success",
                      c.severity === "warn" && "border-warning/40 text-warning-foreground",
                      c.severity === "fail" && "border-destructive/40 text-destructive",
                    )}
                  >
                    {c.label}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
