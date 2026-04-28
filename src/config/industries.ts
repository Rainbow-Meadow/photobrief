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
    // Plumbing Service Request Intake
    starterGuideIds: ["e2b490f1-8a64-5f71-b975-594563f23b98"],
  },
  {
    id: "junk_removal",
    label: "Junk removal",
    // Landscape Cleanup / Yard Work Quote (closest workbook match)
    starterGuideIds: ["2f6e159f-c757-5923-878d-f5d293414061"],
  },
  {
    id: "landscaping",
    label: "Landscaping",
    starterGuideIds: ["2f6e159f-c757-5923-878d-f5d293414061"],
  },
  {
    id: "appliance_repair",
    label: "Appliance repair",
    starterGuideIds: ["d5c29c02-09af-5498-9e28-990bbde178cf"],
  },
  {
    id: "pest_control",
    label: "Pest / wildlife removal",
    starterGuideIds: ["c746edb8-6fbe-5ea5-b743-5791df1159a6"],
  },
  {
    id: "property_management",
    label: "Property management",
    // Move-In / Move-Out Condition Report
    starterGuideIds: ["421836bd-dfcf-5a29-af4d-e7d2f31c7f77"],
  },
  { id: "resale", label: "Resale / product sellers", starterGuideIds: [] },
  { id: "other", label: "Other", starterGuideIds: [] },
];
