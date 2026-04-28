// Industry list + default starter guides per industry.
// Used by onboarding to seed the workspace's first guides.
export interface IndustryDefinition {
  id: string;
  label: string;
  /** Guide IDs (from guideTemplates) suggested as starter guides. */
  starterGuideIds: string[];
}

export const industries: IndustryDefinition[] = [
  { id: "plumbing", label: "Plumbing", starterGuideIds: ["guide_leak", "guide_water_heater"] },
  { id: "junk_removal", label: "Junk removal", starterGuideIds: ["guide_junk"] },
  { id: "landscaping", label: "Landscaping", starterGuideIds: ["guide_landscape"] },
  { id: "appliance_repair", label: "Appliance repair", starterGuideIds: ["guide_appliance"] },
  { id: "pest_control", label: "Pest / wildlife removal", starterGuideIds: ["guide_pest"] },
  { id: "property_management", label: "Property management", starterGuideIds: ["guide_landscape"] },
  { id: "resale", label: "Resale / product sellers", starterGuideIds: [] },
  { id: "other", label: "Other", starterGuideIds: [] },
];
