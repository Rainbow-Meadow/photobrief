// All recipient-facing and dashboard-facing strings live here, so copy
// can be tuned (and translated later) without touching components.
export const microcopy = {
  recipient: {
    introTitle: "Thanks for reaching out!",
    introBody:
      "I'll walk you through a few quick photos so we can help you. Should take about 2 minutes — no app to download.",
    capturePromptHint: "Take or upload a photo",
    retake: "Retake",
    useAnyway: "Use anyway",
    accept: "Looks good",
    skip: "Skip this one",
    reviewTitle: "Quick review",
    submit: "Send to business",
    confirmationTitle: "All done — thank you!",
    confirmationBody: "Your photos are on the way. You'll hear back shortly.",
  },
  business: {
    inboxEmpty: "No requests yet",
    inboxEmptyHint: "Create your first PhotoBrief request to start collecting clean photos.",
    submissionsEmpty: "No briefs yet",
    submissionsEmptyHint: "Once recipients submit, briefs land here with AI summaries and readiness scores.",
    guidesEmpty: "No custom guides",
    guidesEmptyHint: "Start from a template or describe what you need to AI.",
  },
  ai: {
    rateLimited: "PhotoBrief AI is busy. Please try again in a moment.",
    paymentRequired: "AI usage limit reached for this workspace. Please upgrade or add credits.",
  },
} as const;
