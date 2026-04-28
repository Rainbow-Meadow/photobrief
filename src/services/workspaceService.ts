// Workspace service — kept for back-compat. Live data comes from the
// `useCurrentWorkspace` hook. This shim returns the mock workspace shape
// for any unauthenticated callsite (landing/demo routes).
import { mockWorkspace } from "@/config/mockData";

export const workspaceService = {
  current() {
    return mockWorkspace;
  },
};
