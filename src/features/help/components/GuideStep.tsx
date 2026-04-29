import { Callout } from "./Callout";
import { AnnotatedScreenshot, type Pin } from "./AnnotatedScreenshot";
import { cn } from "@/lib/utils";

export type GuideStepProps = {
  number: number;
  title: string;
  body?: React.ReactNode;
  screenshot?: {
    src?: string;
    alt: string;
    caption?: string;
    pins?: Pin[];
    ratio?: "16/10" | "16/9" | "4/3" | "9/16" | "3/4";
  };
  whatYouSee?: React.ReactNode;
  tip?: React.ReactNode;
  warn?: React.ReactNode;
  className?: string;
};

export function GuideStep({
  number,
  title,
  body,
  screenshot,
  whatYouSee,
  tip,
  warn,
  className,
}: GuideStepProps) {
  return (
    <section className={cn("rounded-2xl border bg-card p-5 shadow-sm sm:p-6", className)}>
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {number}
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <h3 className="text-base font-semibold leading-snug text-foreground sm:text-lg">
            {title}
          </h3>
          {body && (
            <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{body}</div>
          )}
        </div>
      </div>

      {screenshot && (
        <div className="mt-4">
          <AnnotatedScreenshot {...screenshot} />
        </div>
      )}

      {(whatYouSee || tip || warn) && (
        <div className="mt-4 grid gap-2">
          {whatYouSee && <Callout variant="success">{whatYouSee}</Callout>}
          {tip && <Callout variant="tip">{tip}</Callout>}
          {warn && <Callout variant="warn">{warn}</Callout>}
        </div>
      )}
    </section>
  );
}
