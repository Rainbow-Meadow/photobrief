import { useMemo } from "react";
import { guidesService } from "@/services/guidesService";
import type { CuratedCategory } from "@/types/photobrief";

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

/** Look up one guide by id. */
export function useGuide(id: string | undefined) {
  return useMemo(() => (id ? guidesService.getById(id) : undefined), [id]);
}

/** Launch-ready guides in a single curated bucket. */
export function useGuidesByCuratedCategory(category: CuratedCategory) {
  return useMemo(() => guidesService.listByCuratedCategory(category), [category]);
}
