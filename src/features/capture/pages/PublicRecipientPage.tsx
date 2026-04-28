import { useParams, NavLink } from "react-router-dom";
import { Camera, MessageSquare, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Public recipient page — Phase 1 preview.
 * Renders a chat-first intro card. The full ChatThread + capture cards
 * land in Phase 4 (capture engine) and Phase 6 (chat-first conversion).
 */
export default function PublicRecipientPage() {
  const { token } = useParams();
  return (
    <div className="space-y-4">
      {/* Assistant intro message — placeholder for ChatThread/AssistantMessage components */}
      <div className="flex gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground">
          <MessageSquare className="h-4 w-4" />
        </span>
        <div className="flex-1 rounded-2xl rounded-tl-sm border bg-card p-4 shadow-elev-sm">
          <p className="text-sm font-medium text-foreground">Hi! Bright Spark Plumbing here.</p>
          <p className="mt-1 text-sm text-foreground/90">
            Thanks for reaching out about the leak. I'll walk you through a few quick photos so we can
            quote you accurately. Should take about 2 minutes — no app to download.
          </p>
        </div>
      </div>

      {/* Photo prompt card preview */}
      <div className="flex gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground">
          <MessageSquare className="h-4 w-4" />
        </span>
        <div className="flex-1 space-y-3">
          <div className="rounded-2xl rounded-tl-sm border bg-card p-4 shadow-elev-sm">
            <p className="text-sm text-foreground">First, a wide shot of the area under the leak.</p>
          </div>
          <div className="rounded-2xl border-2 border-dashed bg-card p-6 text-center shadow-elev-sm">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Camera className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-medium text-foreground">Take or upload a photo</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Step 1 of 5</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Button size="sm" className="gap-1.5">
                <Camera className="h-4 w-4" /> Take photo
              </Button>
              <Button variant="outline" size="sm">Upload</Button>
            </div>
          </div>
        </div>
      </div>

      <p className="pt-2 text-center text-xs text-muted-foreground">
        Phase 1 preview — token <code>{token}</code>. Full chat capture flow lands in Phase 6.
      </p>

      <div className="pt-2 text-center">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <NavLink to={`/r/${token}/done`}>
            Skip to confirmation preview <ArrowRight className="h-3.5 w-3.5" />
          </NavLink>
        </Button>
      </div>
    </div>
  );
}
