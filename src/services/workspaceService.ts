// Workspace service — branding, plan, member context.
// Phase 1: returns mock workspace. Swappable for Lovable Cloud later.
import { mockWorkspace } from "@/config/mockData";

export const workspaceService = {
  current() {
    return mockWorkspace;
  },
};
