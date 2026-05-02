// Drives the chat-first capture flow for ANY guide.
// Page components only render messages; logic lives here.
import { useCallback, useMemo, useRef, useState } from "react";
import type { PhotoGuide } from "@/types/photobrief";
import type { AnsweredQuestion, CapturedPhoto, ChatMessage, FlowPhase } from "@/types/chat";
import { aiService } from "@/services/aiService";
import type { AICheckSeverity } from "@/types/photobrief";
import { microcopy } from "@/config/microcopy";

interface ResubmitConfig {
  commentsByStepId: Record<string, string>;
  summaryMessage?: string;
}

interface UseChatFlowArgs {
  guide: PhotoGuide;
  businessName: string;
  introBody?: string;
  requestToken?: string;
  uploadCapture?: (args: { stepId: string; blob: Blob; ext: string }) => Promise<{
    publicUrl: string;
    storagePath: string;
    capturedMediaId: string;
  }>;
  resubmit?: ResubmitConfig;
}

let idCounter = 0;
const nextId = () => `m_${Date.now()}_${++idCounter}`;

export function useChatFlow({
  guide,
  businessName,
  introBody,
  requestToken,
  uploadCapture,
  resubmit,
}: UseChatFlowArgs) {
  const effectiveGuide = useMemo<PhotoGuide>(() => {
    if (!resubmit) return guide;
    const filteredSteps = guide.steps.filter((s) => resubmit.commentsByStepId[s.id] !== undefined);
    return { ...guide, steps: filteredSteps, questions: [] };
  }, [guide, resubmit]);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const introText = resubmit
      ? `${businessName} reviewed your photos and asked for a quick redo on ${effectiveGuide.steps.length} ${effectiveGuide.steps.length === 1 ? "shot" : "shots"}.${resubmit.summaryMessage ? `\n\n"${resubmit.summaryMessage}"` : ""}`
      : `Hi! ${businessName} here. ${introBody ?? microcopy.recipient.introBody}`;
    const initial: ChatMessage[] = [{ id: nextId(), kind: "assistant_text", text: introText }];
    const first = effectiveGuide.steps[0];
    if (first) {
      const comment = resubmit?.commentsByStepId[first.id];
      if (comment) initial.push({ id: nextId(), kind: "assistant_text", text: `Reviewer note: ${comment}` });
      initial.push(
        { id: nextId(), kind: "photo_prompt", step: first, index: 1, total: effectiveGuide.steps.length },
        { id: nextId(), kind: "capture_card", step: first, pending: false },
      );
    }
    return initial;
  });

  const [phase, setPhase] = useState<FlowPhase>("intro");
  const [stepIndex, setStepIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const photosRef = useRef<CapturedPhoto[]>([]);
  const answersRef = useRef<AnsweredQuestion[]>([]);
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);

  const append = useCallback((...msgs: ChatMessage[]) => setMessages((prev) => [...prev, ...msgs]), []);

  const markCaptureCardPending = useCallback((stepId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.kind === "capture_card" && m.step.id === stepId ? { ...m, pending: true } : m)),
    );
  }, []);

  const advanceAfterStep = useCallback(() => {
    const nextIdx = stepIndex + 1;
    if (nextIdx < effectiveGuide.steps.length) {
      const next = effectiveGuide.steps[nextIdx];
      setStepIndex(nextIdx);
      const nextMsgs: ChatMessage[] = [];
      const comment = resubmit?.commentsByStepId[next.id];
      if (comment) nextMsgs.push({ id: nextId(), kind: "assistant_text", text: `Reviewer note: ${comment}` });
      nextMsgs.push(
        { id: nextId(), kind: "photo_prompt", step: next, index: nextIdx + 1, total: effectiveGuide.steps.length },
        { id: nextId(), kind: "capture_card", step: next, pending: false },
      );
      append(...nextMsgs);
      return;
    }

    if (effectiveGuide.questions.length > 0) {
      setPhase("questions");
      setQuestionIndex(0);
      append(
        { id: nextId(), kind: "assistant_text", text: "Great photos. Just a couple of quick questions and we're done." },
        { id: nextId(), kind: "question", question: effectiveGuide.questions[0] },
      );
    } else {
      setPhase("review");
      append({ id: nextId(), kind: "review_summary" });
    }
  }, [stepIndex, effectiveGuide.steps, effectiveGuide.questions, append, resubmit]);

  const submitPhoto = useCallback(
    async (previewUrl: string, file?: File | null) => {
      const step = effectiveGuide.steps[stepIndex];
      if (!step) return;

      markCaptureCardPending(step.id);
      const photo: CapturedPhoto = {
        stepId: step.id,
        previewUrl,
        takenAt: new Date().toISOString(),
        checks: [],
        acceptedDespiteWarnings: false,
      };
      append({ id: nextId(), kind: "user_photo", photo });

      let mediaUrlForAi: string | undefined;
      if (uploadCapture && file) {
        try {
          const ext = (file.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg") || "jpg";
          const up = await uploadCapture({ stepId: step.id, blob: file, ext });
          photo.publicUrl = up.publicUrl;
          photo.storagePath = up.storagePath;
          photo.capturedMediaId = up.capturedMediaId;
          mediaUrlForAi = up.publicUrl;
        } catch (e) {
          console.warn("upload failed before AI check", e);
        }
      } else if (/^https?:\/\//.test(previewUrl)) {
        mediaUrlForAi = previewUrl;
      }

      const { checks, verdict } = await aiService.analyzeCapturedMedia({
        step,
        mediaUrl: mediaUrlForAi,
        capturedMediaId: photo.capturedMediaId,
        requestToken,
      });
      photo.checks = checks.map((c) => ({ id: c.type, severity: c.severity, message: c.message }));
      append({ id: nextId(), kind: "ai_feedback", photo, verdict: verdict as AICheckSeverity });

      if (verdict === "pass" || verdict === "unavailable") {
        photosRef.current.push(photo);
        rerender();
        setTimeout(() => advanceAfterStep(), 350);
      } else {
        append({ id: nextId(), kind: "retake_decision", photo, step });
      }
    },
    [stepIndex, effectiveGuide.steps, append, markCaptureCardPending, advanceAfterStep, uploadCapture, requestToken],
  );

  const retake = useCallback(() => {
    const step = effectiveGuide.steps[stepIndex];
    if (!step) return;
    append(
      { id: nextId(), kind: "user_text", text: microcopy.recipient.retake },
      { id: nextId(), kind: "capture_card", step, pending: false },
    );
  }, [stepIndex, effectiveGuide.steps, append]);

  const useAnyway = useCallback(
    (photo: CapturedPhoto) => {
      photo.acceptedDespiteWarnings = true;
      photosRef.current.push(photo);
      append({ id: nextId(), kind: "user_text", text: microcopy.recipient.useAnyway });
      advanceAfterStep();
    },
    [append, advanceAfterStep],
  );

  const answerQuestion = useCallback(
    (answer: string) => {
      const q = effectiveGuide.questions[questionIndex];
      if (!q) return;
      answersRef.current.push({ questionId: q.id, prompt: q.prompt, answer });
      append({ id: nextId(), kind: "user_text", text: answer });
      const nextQ = questionIndex + 1;
      if (nextQ < effectiveGuide.questions.length) {
        setQuestionIndex(nextQ);
        append({ id: nextId(), kind: "question", question: effectiveGuide.questions[nextQ] });
      } else {
        setPhase("review");
        append(
          { id: nextId(), kind: "assistant_text", text: microcopy.recipient.reviewTitle },
          { id: nextId(), kind: "review_summary" },
        );
      }
    },
    [effectiveGuide.questions, questionIndex, append],
  );

  const submitAll = useCallback(() => {
    setPhase("submitted");
    append({ id: nextId(), kind: "submit_confirmation" });
  }, [append]);

  const photos = photosRef.current;
  const answers = answersRef.current;

  const progress = useMemo(() => {
    const totalSteps = effectiveGuide.steps.length + effectiveGuide.questions.length;
    const done = photos.length + (phase === "questions" ? questionIndex : phase === "review" || phase === "submitted" ? effectiveGuide.questions.length : 0);
    return { done, total: totalSteps };
  }, [photos.length, effectiveGuide.steps.length, effectiveGuide.questions.length, phase, questionIndex]);

  return {
    messages,
    phase,
    progress,
    photos,
    answers,
    submitPhoto,
    retake,
    useAnyway,
    answerQuestion,
    submitAll,
  };
}
