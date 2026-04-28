import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  RequestBuilderModeTabs,
  type BuilderMode,
} from "@/features/requests/components/RequestBuilderModeTabs";
import { TemplatePicker } from "@/features/requests/components/TemplatePicker";
import {
  AIRequestBuilderChat,
  type AiBuilderMessage,
} from "@/features/requests/components/AIRequestBuilderChat";
import { RequestDraftPreview } from "@/features/requests/components/RequestDraftPreview";
import { draftFromGuide } from "@/types/requestDraft";
import type { RequestDraft } from "@/types/requestDraft";
import { aiService } from "@/services/aiService";
import { notificationService } from "@/services/notificationService";
import type { PhotoGuide } from "@/types/photobrief";
import { UpgradePromptCard } from "@/components/shared/UpgradePromptCard";
import { usePlan } from "@/hooks/usePlan";

let mid = 0;
const newId = () => `chat_${Date.now()}_${++mid}`;

export default function CreateRequestPage() {
  const navigate = useNavigate();
  const { can } = usePlan();
  const aiUnlocked = can("ai_request_builder");
  const [mode, setMode] = useState<BuilderMode>("template");
  const [draft, setDraft] = useState<RequestDraft | null>(null);
  const [chatMessages, setChatMessages] = useState<AiBuilderMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSelectTemplate = (guide: PhotoGuide) => {
    setDraft(draftFromGuide(guide));
    toast.success(`Loaded template: ${guide.name}`);
  };

  const handleAiPrompt = async (prompt: string) => {
    const userMsg: AiBuilderMessage = { id: newId(), from: "user", text: prompt };
    const pendingMsg: AiBuilderMessage = {
      id: newId(),
      from: "assistant",
      text: "",
      pending: true,
    };
    setChatMessages((m) => [...m, userMsg, pendingMsg]);
    setIsGenerating(true);

    try {
      const { draft: generated, assistantReply } = await aiService.generateGuideFromPrompt({
        prompt,
      });
      setDraft(generated);
      setChatMessages((m) =>
        m.map((msg) =>
          msg.id === pendingMsg.id ? { ...msg, pending: false, text: assistantReply } : msg,
        ),
      );
    } catch (err) {
      console.error(err);
      setChatMessages((m) =>
        m.map((msg) =>
          msg.id === pendingMsg.id
            ? {
                ...msg,
                pending: false,
                text: "Sorry — something went wrong drafting that. Try again?",
              }
            : msg,
        ),
      );
      toast.error("Could not generate draft");
    } finally {
      setIsGenerating(false);
    }
  };

  // Mock current usage — wired to real counts in a later phase.
  const requestsUsedThisMonth = 42;

  const handleCreate = () => {
    if (!draft) return;
    if (!can("request_limit", requestsUsedThisMonth)) {
      toast.error("You've hit this month's request limit", {
        description: "Upgrade to send more briefs this month.",
        action: { label: "See plans", onClick: () => navigate("/settings/billing") },
      });
      return;
    }
    // Phase 3: mock — generate the link, fire lifecycle events, then go to inbox.
    const token = `tok_${Math.random().toString(36).slice(2, 8)}`;
    const link = `${window.location.origin}/r/${token}`;
    const recipient = draft.recipientName || "your customer";

    notificationService.notify({
      event: "request_created",
      audience: "business",
      title: `Request "${draft.title}" created`,
      body: `Draft saved — link ready for ${recipient}.`,
      href: "/requests",
    });
    notificationService.notify({
      event: "request_sent",
      audience: "recipient",
      title: `Request sent to ${recipient}`,
      body: link,
      href: "/requests",
      recipientEmail: draft.recipientContact,
    });
    navigate("/requests");
  };

  const handleSaveAsGuide = () => {
    if (!draft) return;
    if (!can("custom_guides")) {
      toast.error("Custom guides are on Pro", {
        description: "Upgrade to save your own capture guides.",
        action: { label: "See plans", onClick: () => navigate("/settings/billing") },
      });
      return;
    }
    // Phase 3: mock — guides list is config-driven. Persistence lands in Phase 2.5/4.
    toast.success(`Saved "${draft.title}" as a guide`, {
      description: "Available in your Guide Library next session (mock).",
    });
  };

  return (
    <div className="space-y-6">
      <div id="draft-preview-top" />
      <PageHeader
        title="New request"
        description="Choose a template or describe what you need — I'll draft a request you can edit."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* Left — builder input */}
        <div className="space-y-4">
          <RequestBuilderModeTabs mode={mode} onChange={setMode} />
          {mode === "template" ? (
            <TemplatePicker
              selectedGuideId={draft?.source === "template" ? draft.baseGuideId : undefined}
              onSelect={handleSelectTemplate}
            />
          ) : aiUnlocked ? (
            <AIRequestBuilderChat
              messages={chatMessages}
              isGenerating={isGenerating}
              onSubmit={handleAiPrompt}
            />
          ) : (
            <UpgradePromptCard feature="ai_request_builder" />
          )}
        </div>

        {/* Right — editable draft preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Draft preview</h2>
            {draft && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                {draft.source === "ai" ? "AI draft" : "From template"}
              </span>
            )}
          </div>
          {draft ? (
            <RequestDraftPreview
              draft={draft}
              onChange={setDraft}
              onCreate={handleCreate}
              onSaveAsGuide={handleSaveAsGuide}
            />
          ) : (
            <div className="rounded-xl border border-dashed bg-card/50 p-8 text-center">
              <p className="text-sm font-medium text-foreground">No draft yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {mode === "template"
                  ? "Pick a template on the left to see the editable preview."
                  : "Describe what you need on the left to generate a draft."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
