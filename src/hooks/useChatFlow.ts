// Drives the chat-first capture flow for ANY guide.
// Page components only render messages; logic lives here.
import { useCallback, useMemo, useRef, useState } from "react";
import type { PhotoGuide } from "@/types/photobrief";
import type {
  AnsweredQuestion,
  CapturedPhoto,
  ChatMessage,
  FlowPhase,
} from "@/types/chat";
import { aiService } from "@/services/aiService";
import type { AICheckSeverity } from "@/types/photobrief";
import { microcopy } from "@/config/microcopy";

interface UseChatFlowArgs {
  guide: PhotoGuide;
  businessName: string;
  introBody?: string;
}

let idCounter = 0;
const nextId = () => `m_${Date.now()}_${++idCounter}`;

export function useChatFlow({ guide, businessName, introBody }: UseChatFlowArgs) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const intro: ChatMessage = {
      id: nextId(),
      kind: "assistant_text",
      text: `Hi! ${businessName} here. ${introBody ?? microcopy.recipient.introBody}`,
    };
    const first = guide.steps[0];
    const initial: ChatMessage[] = [intro];
    if (first) {
      initial.push({
        id: nextId(),
        kind: "photo_prompt",
        step: first,
        index: 1,
        total: guide.steps.length,
      });
      initial.push({
        id: nextId(),
        kind: "capture_card",
        step: first,
        pending: false,
      });
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

  const append = useCallback((...msgs: ChatMessage[]) => {
    setMessages((prev) => [...prev, ...msgs]);
  }, []);

  // Replace the trailing capture_card with a "pending" version while AI runs.
  const markCaptureCardPending = useCallback((stepId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.kind === "capture_card" && m.step.id === stepId ? { ...m, pending: true } : m,
      ),
    );
  }, []);

  // After the recipient resolves a step (accept or use-anyway), advance.
  const advanceAfterStep = useCallback(() => {
    const nextIdx = stepIndex + 1;
    if (nextIdx < guide.steps.length) {
      const next = guide.steps[nextIdx];
      setStepIndex(nextIdx);
      append(
        {
          id: nextId(),
          kind: "photo_prompt",
          step: next,
          index: nextIdx + 1,
          total: guide.steps.length,
        },
        { id: nextId(), kind: "capture_card", step: next, pending: false },
      );
      return;
    }
    // No more photos — go to questions or review.
    if (guide.questions.length > 0) {
      setPhase("questions");
      setQuestionIndex(0);
      append({
        id: nextId(),
        kind: "assistant_text",
        text: "Great photos. Just a couple of quick questions and we're done.",
      });
      append({ id: nextId(), kind: "question", question: guide.questions[0] });
    } else {
      setPhase("review");
      append({ id: nextId(), kind: "review_summary" });
    }
  }, [stepIndex, guide.steps, guide.questions, append]);

  /** Recipient submitted a photo for the current step. */
  const submitPhoto = useCallback(
    async (previewUrl: string) => {
      const step = guide.steps[stepIndex];
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

      const { checks, verdict } = await aiService.analyzeCapturedMedia({
        step,
        mediaUrl: previewUrl,
      });
      photo.checks = checks.map((c) => ({ id: c.type, severity: c.severity, message: c.message }));
      append({ id: nextId(), kind: "ai_feedback", photo, verdict: verdict as AICheckSeverity });

      if (verdict === "pass") {
        // Auto-accept and advance.
        photosRef.current.push(photo);
        rerender();
        setTimeout(() => advanceAfterStep(), 350);
      } else {
        append({ id: nextId(), kind: "retake_decision", photo, step });
      }
    },
    [stepIndex, guide.steps, append, markCaptureCardPending, advanceAfterStep],
  );

  /** Recipient chose "Retake" — re-show capture card for same step. */
  const retake = useCallback(() => {
    const step = guide.steps[stepIndex];
    if (!step) return;
    append(
      { id: nextId(), kind: "user_text", text: microcopy.recipient.retake },
      { id: nextId(), kind: "capture_card", step, pending: false },
    );
  }, [stepIndex, guide.steps, append]);

  /** Recipient chose "Use anyway" despite warnings/fails. */
  const useAnyway = useCallback(
    (photo: CapturedPhoto) => {
      photo.acceptedDespiteWarnings = true;
      photosRef.current.push(photo);
      append({ id: nextId(), kind: "user_text", text: microcopy.recipient.useAnyway });
      advanceAfterStep();
    },
    [append, advanceAfterStep],
  );

  /** Recipient answered the current question. */
  const answerQuestion = useCallback(
    (answer: string) => {
      const q = guide.questions[questionIndex];
      if (!q) return;
      answersRef.current.push({ questionId: q.id, prompt: q.prompt, answer });
      append({ id: nextId(), kind: "user_text", text: answer });

      const nextQ = questionIndex + 1;
      if (nextQ < guide.questions.length) {
        setQuestionIndex(nextQ);
        append({ id: nextId(), kind: "question", question: guide.questions[nextQ] });
      } else {
        setPhase("review");
        append(
          { id: nextId(), kind: "assistant_text", text: microcopy.recipient.reviewTitle },
          { id: nextId(), kind: "review_summary" },
        );
      }
    },
    [guide.questions, questionIndex, append],
  );

  /** Recipient pressed Submit on the review card. */
  const submitAll = useCallback(() => {
    setPhase("submitted");
    append({ id: nextId(), kind: "submit_confirmation" });
  }, [append]);

  const photos = photosRef.current;
  const answers = answersRef.current;

  const progress = useMemo(() => {
    const totalSteps = guide.steps.length + guide.questions.length;
    const done =
      photos.length +
      (phase === "questions" ? questionIndex : phase === "review" || phase === "submitted" ? guide.questions.length : 0);
    return { done, total: totalSteps };
  }, [photos.length, guide.steps.length, guide.questions.length, phase, questionIndex]);

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
