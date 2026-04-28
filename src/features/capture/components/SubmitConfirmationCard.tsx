import { CheckCircle2 } from "lucide-react";
import { microcopy } from "@/config/microcopy";

interface SubmitConfirmationCardProps {
  businessName: string;
  completionCopy?: string;
}

export function SubmitConfirmationCard({ businessName, completionCopy }: SubmitConfirmationCardProps) {
  return (
    <div className="text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
        <CheckCircle2 className="h-6 w-6" />
      </span>
      <p className="mt-3 text-sm font-semibold text-foreground">
        {microcopy.recipient.confirmationTitle}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {completionCopy ?? `Your photos are on the way to ${businessName}. You'll hear back shortly.`}
      </p>
    </div>
  );
}
