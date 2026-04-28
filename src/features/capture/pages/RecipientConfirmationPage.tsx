import { CheckCircle2 } from "lucide-react";

export default function RecipientConfirmationPage() {
  return (
    <div className="mx-auto max-w-md rounded-2xl border bg-card p-8 text-center shadow-elev-md">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
        <CheckCircle2 className="h-7 w-7" />
      </span>
      <h1 className="mt-4 text-xl font-semibold text-foreground">All done — thank you!</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your photos are on the way to Bright Spark Plumbing. You'll hear back shortly with a quote.
      </p>
    </div>
  );
}
