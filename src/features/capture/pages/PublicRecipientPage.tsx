import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import {
  RecipientBrandingProvider,
} from "@/features/capture/RecipientBrandingContext";
import { getRecipientContext } from "@/features/capture/recipientContext";
import { useChatFlow } from "@/hooks/useChatFlow";

/**
 * Public recipient page — chat-first capture flow.
 * Generic over any guide via getRecipientContext(token). The layout shows
 * branded business name; this page renders the ChatThread with all messages.
 */
export default function PublicRecipientPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const ctx = useMemo(() => getRecipientContext(token), [token]);

  const flow = useChatFlow({
    guide: ctx.guide,
    businessName: ctx.businessName,
    introBody: ctx.introBody,
  });

  const handleSubmit = () => {
    flow.submitAll();
    // Also keep the legacy /done route reachable for sharing
    setTimeout(() => navigate(`/r/${token ?? "demo"}/done`, { replace: false }), 1600);
  };

  return (
    <RecipientBrandingProvider
      value={{ businessName: ctx.businessName, brandColor: ctx.brandColor }}
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{ctx.guide.name}</span>
            <span>{flow.progress.done} of {flow.progress.total}</span>
          </div>
          <ReadinessProgress
            value={flow.progress.total === 0 ? 0 : (flow.progress.done / flow.progress.total) * 100}
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
