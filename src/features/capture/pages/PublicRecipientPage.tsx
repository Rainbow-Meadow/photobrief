import { useCallback, useEffect, useRef, useState } from "react";
import { getTokenClient } from "@/integrations/supabase/tokenClient";
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
import { trackEvent } from "@/lib/analytics";

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
  // A submission row is created lazily on the first photo capture so the
  // captured_media inserts have a parent row that satisfies token RLS.
  // In resubmit mode we reuse the existing submission instead.
  const submissionIdRef = useRef<string | null>(ctx.resubmit?.submissionId ?? null);

  const ensureSubmission = useCallback(async (): Promise<string | null> => {
    if (submissionIdRef.current) return submissionIdRef.current;
    if (!token || !ctx.requestId || !ctx.workspaceId) return null;
    const client = getTokenClient(token);
    const { data, error } = await client
      .from("submissions")
      .insert({
        request_id: ctx.requestId,
        workspace_id: ctx.workspaceId,
        submitter_name: ctx.recipientName || null,
        status: "new",
      })
      .select("id")
      .single();
    if (error) {
      console.error("create submission failed", error);
      return null;
    }
    submissionIdRef.current = data.id;
    return data.id;
  }, [token, ctx.requestId, ctx.workspaceId, ctx.recipientName]);

  const uploadCapture = useCallback(
    async ({ stepId, blob, ext }: { stepId: string; blob: Blob; ext: string }) => {
      if (!token || !ctx.workspaceId || !ctx.requestId) {
        throw new Error("No token context — preview only");
      }
      const submissionId = await ensureSubmission();
      if (!submissionId) throw new Error("Could not create submission");
      const client = getTokenClient(token);
      const filename = `${crypto.randomUUID()}.${ext}`;
      const path = `${ctx.workspaceId}/${ctx.requestId}/${filename}`;

      // Mobile networks (LTE in a basement, hotel wifi) drop fetch requests
      // mid-flight. Retry the storage upload up to 3 times with backoff
      // before bubbling the error up so the user only sees a toast on real
      // permanent failures.
      let lastErr: unknown = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { error: upErr } = await client.storage
          .from("submission-media")
          .upload(path, blob, { contentType: blob.type, upsert: false });
        if (!upErr) {
          lastErr = null;
          break;
        }
        lastErr = upErr;
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 600 * Math.pow(2, attempt)));
        }
      }
      if (lastErr) throw lastErr;

      const { data: pub } = client.storage.from("submission-media").getPublicUrl(path);
      const { data: row, error: insErr } = await client
        .from("captured_media")
        .insert({
          submission_id: submissionId,
          step_id: /^[0-9a-f-]{36}$/i.test(stepId) ? stepId : null,
          file_url: path,
          status: "analyzing",
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      return {
        publicUrl: pub.publicUrl,
        storagePath: path,
        capturedMediaId: row.id,
      };
    },
    [token, ctx.workspaceId, ctx.requestId, ensureSubmission],
  );

  const resubmitConfig = ctx.resubmit
    ? {
        commentsByStepId: ctx.resubmit.items.reduce<Record<string, string>>((acc, it) => {
          acc[it.stepId] = it.comment;
          return acc;
        }, {}),
        summaryMessage: ctx.resubmit.summaryMessage,
      }
    : undefined;

  const flow = useChatFlow({
    guide: ctx.guide,
    businessName: ctx.businessName,
    introBody: ctx.introBody,
    uploadCapture,
    resubmit: resubmitConfig,
  });

  // Track step completions (progress.done increases) without leaking PII.
  const lastDoneRef = useRef(0);
  useEffect(() => {
    if (flow.progress.done > lastDoneRef.current) {
      trackEvent("step_completed", {
        guide_id: ctx.guide.id,
        step_index: flow.progress.done,
        total_steps: flow.progress.total,
      });
      lastDoneRef.current = flow.progress.done;
    }
  }, [flow.progress.done, flow.progress.total, ctx.guide.id]);

  // Persist a lightweight progress snapshot to sessionStorage so a tab
  // refresh on a flaky mobile connection doesn't lose context. We only
  // store the submission id, answer payload, and storage paths of already-
  // uploaded photos — never raw image data — so the footprint stays small
  // and we never re-upload on restore.
  useEffect(() => {
    if (!token) return;
    const key = `pb:recipient:${token}`;
    try {
      const snapshot = {
        submissionId: submissionIdRef.current,
        answers: flow.answers,
        uploadedPaths: flow.photos
          .filter((p) => !!p.storagePath)
          .map((p) => ({ stepId: p.stepId, storagePath: p.storagePath })),
        savedAt: Date.now(),
      };
      sessionStorage.setItem(key, JSON.stringify(snapshot));
    } catch {
      // sessionStorage can throw in private mode — non-fatal.
    }
  }, [token, flow.answers, flow.photos, flow.progress.done]);

  // Clear the snapshot once we successfully reach the confirmation page.
  useEffect(() => {
    return () => {
      if (!token) return;
      // Only clear when navigating away after a successful submit — handled
      // by the /done route reading + clearing the same key on mount.
    };
  }, [token]);

  const handleSubmit = async () => {
    flow.submitAll();
    trackEvent("submission_completed", {
      guide_id: ctx.guide.id,
      photos: flow.photos.length,
      answers: Object.keys(flow.answers ?? {}).length,
      resubmit: !!ctx.resubmit,
    });
    if (!ctx.requestId || !ctx.workspaceId || !token) {
      // Demo / no-token preview: just bounce to confirmation.
      setTimeout(() => navigate(`/r/${token ?? "demo"}/done`), 1200);
      return;
    }
    try {
      // Photos already uploaded during capture. Pass only the ones that
      // need to be backfilled (e.g. simulated previews where no file
      // existed). The service skips re-upload when storagePath is set.
      const backfill = await Promise.all(
        flow.photos
          .filter((p) => !p.storagePath)
          .map(async (p) => {
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
        existingSubmissionId: submissionIdRef.current ?? undefined,
        photos: backfill,
        answers: flow.answers,
      });

      // In resubmit mode, mark the original rejected captured_media rows
      // as "resubmitted" so the reviewer sees they've been replaced.
      if (ctx.resubmit && ctx.resubmit.items.length > 0) {
        const client = getTokenClient(token);
        const ids = ctx.resubmit.items.map((it) => it.rejectedMediaId);
        const { error: markErr } = await client
          .from("captured_media")
          .update({ status: "resubmitted" })
          .in("id", ids);
        if (markErr) console.warn("mark resubmitted failed", markErr);
      }

      setTimeout(() => navigate(`/r/${token}/done`), 1200);
    } catch (err) {
      console.error("Submission failed", err);
      toast.error("We couldn't send your photos — please try again.");
    }
  };

  return (
    <RecipientBrandingProvider
      value={{
        businessName: ctx.businessName,
        brandColor: ctx.brandColor,
        logoUrl: ctx.logoUrl,
        hidePhotobriefBranding: ctx.hidePhotobriefBranding,
      }}
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
