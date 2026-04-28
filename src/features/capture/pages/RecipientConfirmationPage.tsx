import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
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
    return () => {
      cancelled = true;
    };
  }, [token]);

  const businessName = ctx?.businessName ?? "the team";
  const message =
    ctx?.completionBody ??
    `Your photos are on the way to ${businessName}. You'll hear back shortly.`;

  return (
    <div className="mx-auto max-w-md rounded-2xl border bg-card p-8 text-center shadow-elev-md">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
        <CheckCircle2 className="h-7 w-7" />
      </span>
      <h1 className="mt-4 text-xl font-semibold text-foreground">All done — thank you!</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
