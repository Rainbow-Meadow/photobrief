// Guides service — single read path for guides.
// Phase 1: returns from config/guideTemplates. Later phases swap in
// Lovable Cloud queries while keeping the same signature so pages
// don't need to change.
import { guideTemplates } from "@/config/guideTemplates";
import type { PhotoGuide } from "@/types/photobrief";

export const guidesService = {
  list(): PhotoGuide[] {
    return guideTemplates;
  },
  getById(id: string): PhotoGuide | undefined {
    return guideTemplates.find((g) => g.id === id);
  },
  listByIndustry(starterIds: string[]): PhotoGuide[] {
    return guideTemplates.filter((g) => starterIds.includes(g.id));
  },
};
