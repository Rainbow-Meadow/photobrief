// Mock data for Phase 1 — replaced by Lovable Cloud queries in later phases.
// Guides come from `config/guideTemplates.ts`. This file only seeds
// fixtures for requests, submissions, and the demo workspace.
import type { PhotoBriefRequest, Submission } from "@/types/photobrief";
import { guideTemplates } from "@/config/guideTemplates";

export const mockWorkspace = {
  id: "ws_demo",
  name: "Bright Spark Plumbing",
  industry: "plumbing",
  plan: "pro" as const,
};

const guideById = (id: string) => guideTemplates.find((g) => g.id === id);

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
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
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
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
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
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
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
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
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
    submittedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
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
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
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
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
  },
];
