import { useMemo } from "react";
import { guidesService } from "@/services/guidesService";

/** List all guides available to the current workspace. */
export function useGuides() {
  return useMemo(() => guidesService.list(), []);
}

/** Look up one guide by id. */
export function useGuide(id: string | undefined) {
  return useMemo(() => (id ? guidesService.getById(id) : undefined), [id]);
}
