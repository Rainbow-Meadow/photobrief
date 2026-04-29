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
import { requestsService } from "@/services/requestsService";
import { messagingService } from "@/services/messagingService";
import type { PhotoGuide } from "@/types/photobrief";
import { UpgradePromptCard } from "@/components/shared/UpgradePromptCard";
import { usePlan } from "@/hooks/usePlan";
import { useCurrentWorkspace } from "@/hooks/useCurrentWorkspace";
import { useUsage } from "@/hooks/useUsage";
import { useQueryClient } from "@tanstack/react-query";
import { trackEvent } from "@/lib/analytics";

let mid = 0;
const newId = () => `chat_${Date.now()}_${++mid}`;

export default function CreateRequestPage() {
  const navigate = useNavigate();
  const { can } = usePlan();
  const { workspace } = useCurrentWorkspace();
  const { usage } = useUsage();
  const queryClient = useQueryClient();
  const aiUnlocked = can("ai_request_builder");
  const [mode, setMode] = useState<BuilderMode>("template");
  const [draft, setDraft] = useState<RequestDraft | null>(null);
  const [chatMessages, setChatMessages] = useState<AiBuilderMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

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

  const requestsUsedThisMonth = usage.requests;

  const handleCreate = async () => {
    if (!draft) return;
    if (!workspace?.id) {
      toast.error("Workspace not loaded yet — try again in a moment.");
      return;
    }
    if (!can("request_limit", requestsUsedThisMonth)) {
      toast.error("You've hit this month's request limit", {
        description: "Upgrade to send more briefs this month.",
        action: { label: "See plans", onClick: () => navigate("/settings/billing") },
      });
      return;
    }

    setIsCreating(true);
    try {
      // Determine recipient channel.
      const contact = draft.recipientContact?.trim() ?? "";
      const isEmail = contact.includes("@");
      const created = await requestsService.create({
        workspaceId: workspace?.id ?? "",
        guideId: draft.baseGuideId ?? null,
        recipientName: draft.recipientName || "Recipient",
        recipientEmail: isEmail ? contact : undefined,
        recipientPhone: !isEmail && contact ? contact : undefined,
        customMessage: draft.introMessage,
        status: "sent",
      });

      const link = `${window.location.origin}/r/${created.token}`;
      const recipient = draft.recipientName || "your customer";

      // Send the recipient their link via Lovable Email (best-effort).
      let delivery: "sent" | "logged_only" | "skipped" = "logged_only";
      if (isEmail) {
        try {
          const result = await messagingService.send({
            requestId: created.id,
            kind: "initial",
            channel: "email",
          });
          delivery = result.delivery;
        } catch (sendErr) {
          console.error("Failed to send recipient email", sendErr);
          // Non-fatal: the request was created; the user can resend from the detail page.
        }
      }

      notificationService.notify({
        event: "request_created",
        audience: "business",
        title: `Request "${draft.title}" created`,
        body:
          delivery === "sent"
            ? `Email sent to ${recipient}.`
            : `Link ready for ${recipient}.`,
        href: `/requests/${created.id}`,
      });
      notificationService.notify({
        event: "request_sent",
        audience: "recipient",
        title: `Request sent to ${recipient}`,
        body: link,
        href: `/requests/${created.id}`,
        recipientEmail: isEmail ? contact : undefined,
      });

      if (delivery === "sent") {
        toast.success(`Email sent to ${recipient}`);
      } else if (isEmail) {
        toast.message("Request created", {
          description: "Email is queued for delivery.",
        });
      } else {
        toast.message("Request created", {
          description: "Copy the link and share it with your customer.",
        });
      }

      trackEvent("request_created", {
        request_id: created.id,
        guide_id: draft?.baseGuideId ?? null,
        delivery,
        contact_type: isEmail ? "email" : "link",
      });
      if (delivery === "sent") {
        trackEvent("request_sent", { request_id: created.id, channel: "email" });
      }

      queryClient.invalidateQueries({ queryKey: ["requests", workspace?.id] });
      navigate(`/requests/${created.id}`);
    } catch (err: any) {
      console.error(err);
      const isLimit = err?.message?.includes("PLAN_LIMIT_REACHED");
      const msg = isLimit
        ? "You've hit this month's request limit on your current plan."
        : err?.message ?? "Could not create request";
      if (isLimit) {
        toast.error(msg, {
          description: "Buy a top-up pack or upgrade your plan to keep sending requests.",
          action: {
            label: "Buy top-up",
            onClick: () => navigate("/settings/billing#topup"),
          },
        });
      } else {
        toast.error(msg);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveAsGuide = async () => {
    if (!draft) return;
    if (!workspace?.id) {
      toast.error("Workspace not loaded yet");
      return;
    }
    if (!can("custom_guides")) {
      toast.error("Custom guides are on Pro", {
        description: "Upgrade to save your own capture guides.",
        action: { label: "See plans", onClick: () => navigate("/settings/billing") },
      });
      return;
    }
    const t = toast.loading(`Saving "${draft.title}"…`);
    try {
      const { guidesService } = await import("@/services/guidesService");
      const saved = await guidesService.saveDraftAsGuide({
        workspaceId: workspace.id,
        draft,
      });
      toast.dismiss(t);
      toast.success(`Saved "${saved.name}" to your Guide Library`);
      queryClient.invalidateQueries({ queryKey: ["guides", workspace.id] });
    } catch (err: any) {
      toast.dismiss(t);
      const msg = err?.message?.includes("PLAN_FEATURE_LOCKED")
        ? "Custom guides are on the Pro plan."
        : err?.message ?? "Could not save guide";
      toast.error(msg);
    }
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
