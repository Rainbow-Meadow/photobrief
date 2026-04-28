import type { RequestStatus, SubmissionStatus } from "@/types/photobrief";

export const requestStatusOptions: Record<
  RequestStatus,
  { label: string; tone: "neutral" | "info" | "warning" | "success" | "muted" }
> = {
  draft: { label: "Draft", tone: "muted" },
  sent: { label: "Sent", tone: "info" },
  opened: { label: "Opened", tone: "info" },
  in_progress: { label: "In progress", tone: "warning" },
  needs_customer_action: { label: "Needs action", tone: "warning" },
  submitted: { label: "Submitted", tone: "success" },
  ready_to_review: { label: "Ready to review", tone: "info" },
  reviewed: { label: "Reviewed", tone: "neutral" },
  archived: { label: "Archived", tone: "muted" },
  expired: { label: "Expired", tone: "muted" },
};

export const submissionStatusOptions: Record<
  SubmissionStatus,
  { label: string; tone: "neutral" | "info" | "warning" | "success" | "muted" }
> = {
  new: { label: "New", tone: "info" },
  reviewed: { label: "Reviewed", tone: "success" },
  needs_more: { label: "Needs more", tone: "warning" },
  archived: { label: "Archived", tone: "muted" },
};
