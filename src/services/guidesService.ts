// Guides service — single read path for guides.
// Phase 1: returns from config/guideTemplates. Later phases swap in
// Lovable Cloud queries while keeping the same signature so pages
// don't need to change.
import { guideTemplates } from "@/config/guideTemplates";
import type { CuratedCategory, PhotoGuide } from "@/types/photobrief";

export const guidesService = {
  /** All guides, including internal-only templates. Use sparingly. */
  list(): PhotoGuide[] {
    return guideTemplates;
  },
  getById(id: string): PhotoGuide | undefined {
    return guideTemplates.find((g) => g.id === id);
  },
  /** Curated, launch-ready guides shown in the public library. */
  listLaunchReady(): PhotoGuide[] {
    return guideTemplates.filter((g) => g.launchReady === true && g.curatedCategory);
  },
  /** Internal/admin templates that aren't yet curated. */
  listInternalTemplates(): PhotoGuide[] {
    return guideTemplates.filter((g) => !g.launchReady);
  },
  /** All launch-ready guides in a single curated category. */
  listByCuratedCategory(category: CuratedCategory): PhotoGuide[] {
    return guideTemplates.filter(
      (g) => g.launchReady === true && g.curatedCategory === category,
    );
  },
  /** Industry starter sets used during onboarding. */
  listByIndustry(starterIds: string[]): PhotoGuide[] {
    return guideTemplates.filter((g) => starterIds.includes(g.id));
  },
};
