import type { RequestStatus, SubmissionStatus } from "@/types/photobrief";

export const requestStatusOptions: Record<
  RequestStatus,
  { label: string; tone: "neutral" | "info" | "warning" | "success" | "muted" }
> = {
  draft: { label: "Draft", tone: "muted" },
  sent: { label: "Sent", tone: "info" },
  in_progress: { label: "In progress", tone: "warning" },
  submitted: { label: "Submitted", tone: "success" },
  needs_action: { label: "Needs action", tone: "warning" },
  reviewed: { label: "Reviewed", tone: "neutral" },
  archived: { label: "Archived", tone: "muted" },
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
