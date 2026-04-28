import {
  Send,
  Eye,
  Camera,
  RotateCcw,
  MessageSquare,
  CheckCircle2,
  Sparkles,
  StickyNote,
  Bell,
  HelpCircle,
  Archive,
  type LucideIcon,
} from "lucide-react";
import { formatRelativeTime } from "@/utils/format";
import type { ActivityEvent, ActivityEventType } from "@/types/photobrief";

const iconFor: Record<ActivityEventType, LucideIcon> = {
  request_sent: Send,
  recipient_opened: Eye,
  shot_uploaded: Camera,
  shot_retaken: RotateCcw,
  answers_submitted: MessageSquare,
  submission_received: CheckCircle2,
  ai_review_completed: Sparkles,
  reviewer_note: StickyNote,
  reminder_sent: Bell,
  more_photos_requested: HelpCircle,
  marked_reviewed: CheckCircle2,
  archived: Archive,
};

interface Props {
  events: ActivityEvent[];
}

export function ActivityTimeline({ events }: Props) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }

  const sorted = [...events].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );

  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {sorted.map((event) => {
        const Icon = iconFor[event.type] ?? CheckCircle2;
        return (
          <li key={event.id} className="relative">
            <span className="absolute -left-[26px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground ring-4 ring-card">
              <Icon className="h-3 w-3" />
            </span>
            <p className="text-sm font-medium text-foreground">{event.label}</p>
            <p className="text-xs text-muted-foreground">
              {event.actor ? `${event.actor} · ` : ""}
              {formatRelativeTime(event.at)}
            </p>
            {event.detail ? (
              <p className="mt-1 text-xs text-muted-foreground">{event.detail}</p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
