import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { guidesService } from "@/services/guidesService";
import type { CuratedCategory, PhotoGuide } from "@/types/photobrief";

/** Curated, launch-ready guides. Use this for the public library. */
export function useLaunchGuides() {
  return useMemo(() => guidesService.listLaunchReady(), []);
}

/** Internal-only templates — admin toggle in the library. */
export function useInternalGuides() {
  return useMemo(() => guidesService.listInternalTemplates(), []);
}

/** All guides (curated + internal). Used by the request builder picker. */
export function useGuides() {
  return useMemo(() => guidesService.list(), []);
}

/** Look up one guide by id (local templates only — sync). */
export function useGuide(id: string | undefined) {
  return useMemo(() => (id ? guidesService.getById(id) : undefined), [id]);
}

/** Launch-ready guides in a single curated bucket. */
export function useGuidesByCuratedCategory(category: CuratedCategory) {
  return useMemo(() => guidesService.listByCuratedCategory(category), [category]);
}

/** Custom guides saved to the current workspace. */
export function useWorkspaceGuides(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: ["workspace-guides", workspaceId ?? null],
    queryFn: async () => {
      if (!workspaceId) return [] as PhotoGuide[];
      return guidesService.listForWorkspace(workspaceId).then((all) =>
        all.filter((g) => g.workspaceId === workspaceId),
      );
    },
    enabled: !!workspaceId,
  });
}

/** Async lookup: tries local templates first, then DB. */
export function useGuideAsync(id: string | undefined) {
  return useQuery({
    queryKey: ["guide", id ?? null],
    queryFn: async () => (id ? guidesService.getByIdAsync(id) : null),
    enabled: !!id,
  });
}
