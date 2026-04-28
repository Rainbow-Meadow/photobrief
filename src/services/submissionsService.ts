// Submissions service — single read path for submissions.
// Phase 1: returns mock data. Swappable for Lovable Cloud later.
import { mockSubmissions } from "@/config/mockData";
import type { Submission } from "@/types/photobrief";

export const submissionsService = {
  list(): Submission[] {
    return mockSubmissions;
  },
  getById(id: string): Submission | undefined {
    return mockSubmissions.find((s) => s.id === id);
  },
  countByStatus(status: Submission["status"]): number {
    return mockSubmissions.filter((s) => s.status === status).length;
  },
};
