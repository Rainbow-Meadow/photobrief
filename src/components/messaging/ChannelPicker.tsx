import { Mail, MessageSquare, Layers } from "lucide-react";

import { cn } from "@/lib/utils";

export type SendChannel = "email" | "sms" | "both";

interface ChannelPickerProps {
  value: SendChannel;
  onChange: (channel: SendChannel) => void;
  /** When false, only Email is selectable (SMS not configured for workspace). */
  smsAvailable: boolean;
  /** Disable when recipient lacks the required field. */
  hasEmail?: boolean;
  hasPhone?: boolean;
  className?: string;
}

const OPTIONS: Array<{
  key: SendChannel;
  label: string;
  icon: typeof Mail;
}> = [
  { key: "email", label: "Email", icon: Mail },
  { key: "sms", label: "SMS", icon: MessageSquare },
  { key: "both", label: "Both", icon: Layers },
];

export function ChannelPicker({
  value,
  onChange,
  smsAvailable,
  hasEmail = true,
  hasPhone = true,
  className,
}: ChannelPickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Send channel"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border bg-muted p-0.5",
        className,
      )}
    >
      {OPTIONS.map(({ key, label, icon: Icon }) => {
        const disabled =
          (key !== "email" && !smsAvailable) ||
          (key === "email" && !hasEmail) ||
          (key === "sms" && !hasPhone) ||
          (key === "both" && (!hasEmail || !hasPhone));
        const selected = value === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
              selected
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
              disabled && "cursor-not-allowed opacity-40 hover:text-muted-foreground",
            )}
            title={
              disabled
                ? key === "sms" || key === "both"
                  ? !smsAvailable
                    ? "Connect Twilio in Settings → SMS to enable"
                    : !hasPhone
                      ? "Recipient has no phone number"
                      : "Recipient has no email"
                  : "Recipient has no email"
                : undefined
            }
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
