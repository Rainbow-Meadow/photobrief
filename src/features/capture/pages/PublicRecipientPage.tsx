import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ChatThread } from "@/features/capture/components/ChatThread";
import { ChatMessage } from "@/features/capture/components/ChatMessage";
import { PhotoPromptCard } from "@/features/capture/components/PhotoPromptCard";
import { CaptureUploadCard } from "@/features/capture/components/CaptureUploadCard";
import { AIFeedbackMessage } from "@/features/capture/components/AIFeedbackMessage";
import { RetakeDecisionCard } from "@/features/capture/components/RetakeDecisionCard";
import { QuestionCard } from "@/features/capture/components/QuestionCard";
import { ReviewSummaryCard } from "@/features/capture/components/ReviewSummaryCard";
import { SubmitConfirmationCard } from "@/features/capture/components/SubmitConfirmationCard";
import { ReadinessProgress } from "@/components/shared/ReadinessProgress";
import { RecipientBrandingProvider } from "@/features/capture/RecipientBrandingContext";
import {
  loadRecipientContext,
  type RecipientContext,
} from "@/features/capture/recipientContext";
import { useChatFlow } from "@/hooks/useChatFlow";
import { submissionsService } from "@/services/submissionsService";

/**
 * Public recipient page — chat-first capture flow.
 * Loads the request + guide + branding by token, runs the chat flow,
 * and persists media + answers to Cloud on submit.
 */
export default function PublicRecipientPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [ctx, setCtx] = useState<RecipientContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadRecipientContext(token)
      .then((c) => {
        if (!cancelled) setCtx(c);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Could not load this request");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (error) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
        Sorry — that link doesn't look valid. {error}
      </div>
    );
  }
  if (!ctx) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return <RecipientChat ctx={ctx} token={token} navigate={navigate} />;
}

function RecipientChat({
  ctx,
  token,
  navigate,
}: {
  ctx: RecipientContext;
  token: string | undefined;
  navigate: (to: string) => void;
}) {
  const flow = useChatFlow({
    guide: ctx.guide,
    businessName: ctx.businessName,
    introBody: ctx.introBody,
  });

  const handleSubmit = async () => {
    flow.submitAll();
    if (!ctx.requestId || !ctx.workspaceId || !token) {
      // Demo / no-token preview: just bounce to confirmation.
      setTimeout(() => navigate(`/r/${token ?? "demo"}/done`), 1200);
      return;
    }
    try {
      const photos = await Promise.all(
        flow.photos.map(async (p) => {
          const blob = await fetch(p.previewUrl).then((r) => r.blob());
          const ext = (blob.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
          return { stepId: p.stepId, blob, ext };
        }),
      );
      await submissionsService.submitFromRecipient({
        token,
        requestId: ctx.requestId,
        workspaceId: ctx.workspaceId,
        recipientName: ctx.recipientName,
        photos,
        answers: flow.answers,
      });
      setTimeout(() => navigate(`/r/${token}/done`), 1200);
    } catch (err) {
      console.error("Submission failed", err);
      toast.error("We couldn't send your photos — please try again.");
    }
  };

  return (
    <RecipientBrandingProvider
      value={{ businessName: ctx.businessName, brandColor: ctx.brandColor }}
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{ctx.guide.name}</span>
            <span>
              {flow.progress.done} of {flow.progress.total}
            </span>
          </div>
          <ReadinessProgress
            value={
              flow.progress.total === 0
                ? 0
                : (flow.progress.done / flow.progress.total) * 100
            }
          />
        </div>

        <ChatThread autoScrollKey={flow.messages.length}>
          {flow.messages.map((msg) => {
            switch (msg.kind) {
              case "assistant_text":
                return (
                  <ChatMessage key={msg.id} from="assistant">
                    <p className="text-sm">{msg.text}</p>
                  </ChatMessage>
                );
              case "user_text":
                return (
                  <ChatMessage key={msg.id} from="user">
                    <p className="text-sm">{msg.text}</p>
                  </ChatMessage>
                );
              case "photo_prompt":
                return (
                  <ChatMessage key={msg.id} from="assistant">
                    <PhotoPromptCard step={msg.step} index={msg.index} total={msg.total} />
                  </ChatMessage>
                );
              case "capture_card":
                return (
                  <ChatMessage key={msg.id} from="assistant" bare>
                    <CaptureUploadCard
                      step={msg.step}
                      pending={msg.pending}
                      onCapture={flow.submitPhoto}
                    />
                  </ChatMessage>
                );
              case "user_photo":
                return (
                  <ChatMessage key={msg.id} from="user" bare>
                    <img
                      src={msg.photo.previewUrl}
                      alt="Submitted"
                      className="block max-h-72 w-full object-cover"
                    />
                  </ChatMessage>
                );
              case "ai_feedback":
                return (
                  <ChatMessage key={msg.id} from="assistant">
                    <AIFeedbackMessage photo={msg.photo} verdict={msg.verdict} />
                  </ChatMessage>
                );
              case "retake_decision":
                return (
                  <ChatMessage key={msg.id} from="assistant">
                    <RetakeDecisionCard
                      photo={msg.photo}
                      step={msg.step}
                      onRetake={flow.retake}
                      onUseAnyway={flow.useAnyway}
                    />
                  </ChatMessage>
                );
              case "question":
                return (
                  <ChatMessage key={msg.id} from="assistant">
                    <QuestionCard question={msg.question} onAnswer={flow.answerQuestion} />
                  </ChatMessage>
                );
              case "review_summary":
                return (
                  <ChatMessage key={msg.id} from="assistant" bare>
                    <div className="p-4">
                      <ReviewSummaryCard
                        guide={ctx.guide}
                        photos={flow.photos}
                        answers={flow.answers}
                        onSubmit={handleSubmit}
                      />
                    </div>
                  </ChatMessage>
                );
              case "submit_confirmation":
                return (
                  <ChatMessage key={msg.id} from="assistant" bare>
                    <div className="p-4">
                      <SubmitConfirmationCard businessName={ctx.businessName} />
                    </div>
                  </ChatMessage>
                );
              default:
                return null;
            }
          })}
        </ChatThread>
      </div>
    </RecipientBrandingProvider>
  );
}
