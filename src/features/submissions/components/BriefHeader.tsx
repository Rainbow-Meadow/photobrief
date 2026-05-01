import { Sparkles, Copy, FileDown, ArrowRight, Mail, Phone, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/shared/ScoreRing";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submissionStatusOptions } from "@/config/statusOptions";
import { formatRelativeTime } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { Submission, SubmissionStatus } from "@/types/photobrief";

interface BriefHeaderProps {
  submission: Submission;
  onStatusChange: (next: SubmissionStatus) => void;
  onCopySummary: () => void;
  onExportPdf: () => void;
  canPdf: boolean;
  onPrimaryAction: () => void;
  primaryActionLabel?: string;
}

/**
 * BriefHeader — the "money screen" hero for a completed submission.
 *
 * Surfaces the four things a small business cares about in the first
 * viewport: who sent it, how complete it is, what the AI thinks, and what
 * to do next. Per-shot review still lives below this component.
 *
 * Pure presentation — every action is supplied by the parent so the page
 * keeps owning data flow and mutations.
 */
export function BriefHeader({
  submission,
  onStatusChange,
  onCopySummary,
  onExportPdf,
  canPdf,
  onPrimaryAction,
  primaryActionLabel = "Mark reviewed",
}: BriefHeaderProps) {
  const status = submissionStatusOptions[submission.status];
  const details = submission.extractedDetails ?? [];
  const hasContact = !!submission.recipientContact;
  const isEmailContact = hasContact && submission.recipientContact!.includes("@");

  return (
    <section className="surface-card-elevated relative isolate overflow-hidden p-5 sm:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-ambient-sky opacity-60"
      />

      <div className="grid gap-6 lg:grid-cols-[auto_1fr_auto] lg:items-start">
        {/* Readiness ring */}
        <div className="flex shrink-0 items-center gap-4 lg:flex-col lg:items-start">
          <ScoreRing score={submission.readinessScore} size={96} />
          <div className="lg:hidden">
            <p className="text-base font-semibold text-foreground">{submission.recipientName}</p>
            <p className="text-xs text-muted-foreground">
              {submission.requestType ?? submission.guideName}
            </p>
          </div>
        </div>

        {/* Identity + summary */}
        <div className="min-w-0 space-y-3">
          <div className="hidden lg:block">
            <p className="text-base font-semibold text-foreground">{submission.recipientName}</p>
            <p className="text-xs text-muted-foreground">
              {submission.requestType ?? submission.guideName}
              {submission.assigneeName ? ` · Assigned to ${submission.assigneeName}` : " · Unassigned"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            {hasContact ? (
              <span className="inline-flex items-center gap-1">
                {isEmailContact ? (
                  <Mail className="h-3 w-3" />
                ) : (
                  <Phone className="h-3 w-3" />
                )}
                {submission.recipientContact}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3 w-3" /> Submitted{" "}
              {formatRelativeTime(submission.submittedAt)}
            </span>
          </div>

          {/* AI summary */}
          <div className="glass rounded-2xl px-4 py-3">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="h-3 w-3" /> AI summary
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground">
              {submission.aiSummary || "No summary available yet."}
            </p>
          </div>

          {/* Extracted details — chip list */}
          {details.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {details.slice(0, 6).map((d) => (
                <span
                  key={d.label}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-[11px] text-foreground",
                  )}
                  title={
                    typeof d.confidence === "number"
                      ? `${Math.round(d.confidence * 100)}% confidence`
                      : undefined
                  }
                >
                  <span className="font-semibold text-muted-foreground">{d.label}:</span>
                  <span>{d.value}</span>
                </span>
              ))}
              {details.length > 6 ? (
                <span className="inline-flex items-center rounded-full border bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                  +{details.length - 6} more
                </span>
              ) : null}
            </div>
          ) : null}

          {/* Suggested next action — primary CTA */}
          {submission.suggestedNextAction ? (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                Suggested next action
              </p>
              <p className="mt-1 text-sm text-foreground">{submission.suggestedNextAction}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={onPrimaryAction} className="gap-1.5">
                  {primaryActionLabel} <ArrowRight className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="outline" onClick={onCopySummary} className="gap-1.5">
                  <Copy className="h-3.5 w-3.5" /> Copy summary
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onExportPdf}
                  className="gap-1.5"
                  title={canPdf ? undefined : "Available on Pro"}
                >
                  <FileDown className="h-3.5 w-3.5" /> Export PDF
                  {!canPdf ? (
                    <span className="ml-1 text-[10px] uppercase tracking-wide text-primary">
                      Pro
                    </span>
                  ) : null}
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Status control */}
        <div className="flex flex-row items-center gap-2 lg:flex-col lg:items-end">
          <Select
            value={submission.status}
            onValueChange={(v) => onStatusChange(v as SubmissionStatus)}
          >
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue>
                <StatusBadge label={status.label} tone={status.tone} />
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(submissionStatusOptions).map(([key, opt]) => (
                <SelectItem key={key} value={key}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
}
