// Mock data for Phase 1 — replaced by Lovable Cloud queries in later phases.
// Guides come from `config/guideTemplates.ts`. This file only seeds
// fixtures for requests, submissions, and the demo workspace.
import type { PhotoBriefRequest, Submission, TeamMember } from "@/types/photobrief";
import { guideTemplates } from "@/config/guideTemplates";

export const mockWorkspace = {
  id: "ws_demo",
  name: "Bright Spark Plumbing",
  industry: "plumbing",
  plan: "pro" as const,
};

export const mockTeamMembers: TeamMember[] = [
  { id: "u_pat", name: "Patrick Owens", initials: "PO" },
  { id: "u_jen", name: "Jen Hughes", initials: "JH" },
  { id: "u_marco", name: "Marco Diaz", initials: "MD" },
];

const guideById = (id: string) => guideTemplates.find((g) => g.id === id);

const hoursAgo = (h: number) => new Date(Date.now() - 1000 * 60 * 60 * h).toISOString();
const minutesAgo = (m: number) => new Date(Date.now() - 1000 * 60 * m).toISOString();

export const mockRequests: PhotoBriefRequest[] = [
  {
    id: "req_1",
    workspaceId: "ws_demo",
    guideId: "guide_leak",
    guideName: guideById("guide_leak")?.name ?? "",
    recipientName: "Maria Alvarez",
    recipientContact: "maria@example.com",
    token: "abc123",
    status: "in_progress",
    createdAt: hoursAgo(3),
    readinessScore: 64,
    missingItems: ["Shut-off valve close-up", "Supply line label"],
    lastActivityAt: minutesAgo(18),
    assigneeId: "u_pat",
    assigneeName: "Patrick Owens",
  },
  {
    id: "req_2",
    workspaceId: "ws_demo",
    guideId: "guide_water_heater",
    guideName: guideById("guide_water_heater")?.name ?? "",
    recipientName: "Devon Park",
    recipientContact: "555-0142",
    token: "def456",
    status: "sent",
    createdAt: hoursAgo(26),
    missingItems: ["Hasn't opened link"],
    lastActivityAt: hoursAgo(26),
    assigneeId: "u_jen",
    assigneeName: "Jen Hughes",
  },
  {
    id: "req_3",
    workspaceId: "ws_demo",
    guideId: "guide_junk",
    guideName: guideById("guide_junk")?.name ?? "",
    recipientName: "Priya Shah",
    recipientContact: "priya@example.com",
    token: "ghi789",
    status: "submitted",
    createdAt: hoursAgo(48),
    readinessScore: 92,
    missingItems: [],
    lastActivityAt: minutesAgo(30),
    assigneeId: "u_pat",
    assigneeName: "Patrick Owens",
  },
  {
    id: "req_4",
    workspaceId: "ws_demo",
    guideId: "guide_landscape",
    guideName: guideById("guide_landscape")?.name ?? "",
    recipientName: "Jordan Lee",
    recipientContact: "jordan@example.com",
    token: "jkl012",
    status: "needs_action",
    createdAt: hoursAgo(72),
    readinessScore: 41,
    missingItems: ["Property line wide shot", "Slope reference"],
    lastActivityAt: hoursAgo(20),
    assigneeId: "u_marco",
    assigneeName: "Marco Diaz",
  },
  {
    id: "req_5",
    workspaceId: "ws_demo",
    guideId: "guide_water_heater",
    guideName: guideById("guide_water_heater")?.name ?? "",
    recipientName: "Casey Wong",
    recipientContact: "casey@example.com",
    token: "mno345",
    status: "reviewed",
    createdAt: hoursAgo(120),
    readinessScore: 100,
    missingItems: [],
    lastActivityAt: hoursAgo(30),
    assigneeId: "u_jen",
    assigneeName: "Jen Hughes",
  },
  {
    id: "req_6",
    workspaceId: "ws_demo",
    guideId: "guide_junk",
    guideName: guideById("guide_junk")?.name ?? "",
    recipientName: "Theo Nakamura",
    recipientContact: "theo@example.com",
    token: "pqr678",
    status: "submitted",
    createdAt: hoursAgo(8),
    readinessScore: 88,
    missingItems: [],
    lastActivityAt: minutesAgo(120),
    assigneeId: "u_marco",
    assigneeName: "Marco Diaz",
  },
];

export const mockSubmissions: Submission[] = [
  {
    id: "sub_1",
    requestId: "req_3",
    recipientName: "Priya Shah",
    guideName: guideById("guide_junk")?.name ?? "",
    status: "new",
    readinessScore: 92,
    aiSummary:
      "Driveway pile of mixed household junk, ~1 truckload. Includes one mattress and a small couch. Access is clear.",
    suggestedNextAction: "Send a same-day quote for a half-truck haul.",
    submittedAt: minutesAgo(30),
  },
  {
    id: "sub_2",
    requestId: "req_old",
    recipientName: "Sam Rivera",
    guideName: guideById("guide_leak")?.name ?? "",
    status: "needs_more",
    readinessScore: 58,
    aiSummary:
      "Under-sink leak visible. Shut-off valve photo missing. Label on supply line unreadable.",
    suggestedNextAction: "Ask recipient for a clear photo of the shut-off valve and supply line label.",
    submittedAt: hoursAgo(5),
  },
  {
    id: "sub_3",
    requestId: "req_old2",
    recipientName: "Casey Wong",
    guideName: guideById("guide_water_heater")?.name ?? "",
    status: "reviewed",
    readinessScore: 100,
    aiSummary:
      "50-gallon gas unit, model AO-Smith GCV-50, installed 2014. Adequate clearance. Vent in good condition.",
    suggestedNextAction: "Quote standard 50-gallon replacement.",
    submittedAt: hoursAgo(30),
  },
];
