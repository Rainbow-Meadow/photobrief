// Industry list + default starter guides per industry.
// Guide IDs are deterministic UUIDs derived from the workbook slugs.
export interface IndustryDefinition {
  id: string;
  label: string;
  /** Guide IDs (from guideTemplates) suggested as starter guides. */
  starterGuideIds: string[];
}

export const industries: IndustryDefinition[] = [
  {
    id: "plumbing",
    label: "Plumbing",
    starterGuideIds: [
      "aa3864c3-9463-5920-b818-e4cef8855eed", // Leak diagnosis intake
      "7dc3a33e-48ae-510b-b800-ffa361b54c8a", // Water heater intake
    ],
  },
  {
    id: "junk_removal",
    label: "Junk removal",
    starterGuideIds: ["e843c450-9aa9-5691-818d-874a0bcaf88f"],
  },
  {
    id: "landscaping",
    label: "Landscaping",
    starterGuideIds: ["90a93b2a-17ad-5b40-ae30-342afa73ed30"],
  },
  {
    id: "appliance_repair",
    label: "Appliance repair",
    starterGuideIds: ["d5c29c02-09af-5498-9e28-990bbde178cf"],
  },
  {
    id: "pest_control",
    label: "Pest / wildlife removal",
    starterGuideIds: ["88809a8e-bbb7-5ff6-b40a-6ef061483dda"],
  },
  {
    id: "property_management",
    label: "Property management",
    starterGuideIds: ["2fa5e136-2d63-556e-9117-f119644af754"],
  },
  { id: "resale", label: "Resale / product sellers", starterGuideIds: [] },
  { id: "other", label: "Other", starterGuideIds: [] },
];
