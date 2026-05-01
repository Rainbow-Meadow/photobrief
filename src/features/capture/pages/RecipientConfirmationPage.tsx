import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import { CheckCircle2, Camera, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/layout/BrandMark";
import { loadRecipientContext, type RecipientContext } from "@/features/capture/recipientContext";

export default function RecipientConfirmationPage() {
  const { token } = useParams();
  const [ctx, setCtx] = useState<RecipientContext | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadRecipientContext(token)
      .then((c) => {
        if (!cancelled) setCtx(c);
      })
      .catch(() => {});
    // Clear the in-progress draft now that submission succeeded.
    if (token) {
      try {
        sessionStorage.removeItem(`pb:recipient:${token}`);
      } catch {
        // Non-fatal — private mode may block sessionStorage.
      }
    }
    return () => {
      cancelled = true;
    };
  }, [token]);

  const businessName = ctx?.businessName ?? "the team";
  const message =
    ctx?.completionBody ??
    `Your photos are on the way to ${businessName}. They'll review and reach out shortly with next steps.`;
  const canResubmit = !!ctx?.resubmit;
  const showLogo = !!ctx?.logoUrl;
  const showPhotobriefMark = !ctx?.hidePhotobriefBranding;

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <div className="rounded-3xl border bg-card p-8 text-center shadow-elev-md">
        {/* Branding header — business logo if present, else PhotoBrief mark */}
        <div className="flex flex-col items-center">
          {showLogo ? (
            <img
              src={ctx!.logoUrl}
              alt={businessName}
              className="mb-2 h-12 w-auto max-w-[180px] object-contain"
            />
          ) : null}
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-8 w-8" />
          </span>
        </div>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
          Photos delivered to {businessName}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{message}</p>

        {/* What happens next */}
        <div className="mt-6 rounded-2xl border bg-muted/30 p-4 text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            What happens next
          </p>
          <ol className="mt-2 space-y-1.5 text-sm text-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                1
              </span>
              <span>{businessName} reviews your photos.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                2
              </span>
              <span>If anything is missing, they'll reach out using the contact info they have for you.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                3
              </span>
              <span>You can close this tab — no account or app needed.</span>
            </li>
          </ol>
        </div>

        {canResubmit && token ? (
          <Button asChild variant="outline" size="sm" className="mt-5 w-full">
            <NavLink to={`/r/${token}`}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Add or retake photos
            </NavLink>
          </Button>
        ) : null}

        {showPhotobriefMark ? (
          <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <Camera className="h-3 w-3" />
            <span>Sent securely with</span>
            <BrandMark variant="wordmark" tone="auto" size={56} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
