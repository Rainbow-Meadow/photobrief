// Requests service — single read path for requests.
// Phase 1: returns mock data. Swappable for Lovable Cloud later.
import { mockRequests } from "@/config/mockData";
import type { PhotoBriefRequest } from "@/types/photobrief";

export const requestsService = {
  list(): PhotoBriefRequest[] {
    return mockRequests;
  },
  getById(id: string): PhotoBriefRequest | undefined {
    return mockRequests.find((r) => r.id === id);
  },
  getByToken(token: string): PhotoBriefRequest | undefined {
    return mockRequests.find((r) => r.token === token);
  },
};
