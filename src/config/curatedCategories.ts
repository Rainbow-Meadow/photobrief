import type { CuratedCategory } from "@/types/photobrief";

export interface CuratedCategoryMeta {
  id: CuratedCategory;
  label: string;
  blurb: string;
  /** Lucide icon name — looked up at render time. */
  icon: "Wrench" | "Home" | "PackageCheck" | "Megaphone" | "Heart";
}

/**
 * The five topline buckets from the PhotoBrief Template Directory workbook.
 * Mirrors the DB `topline_category` enum — keep these in lock-step.
 */
export const curatedCategories: CuratedCategoryMeta[] = [
  {
    id: "field_service_quote_intake",
    label: "Field Service & Quote Intake",
    blurb:
      "Contractors and service businesses that need job scope, access, issue photos, and quote-ready context.",
    icon: "Wrench",
  },
  {
    id: "property_realestate_claims",
    label: "Property, Real Estate & Claims",
    blurb:
      "Condition documentation, tenant requests, inspections, and claim packets.",
    icon: "Home",
  },
  {
    id: "commerce_warranty_resale",
    label: "Commerce, Warranty & Resale",
    blurb:
      "Support, warranty, returns, marketplace listings, and resale photo workflows.",
    icon: "PackageCheck",
  },
  {
    id: "care_health_living_systems",
    label: "Care, Health & Living Systems",
    blurb:
      "Pets, vet documentation, plants, aquariums, and other living-system contexts with careful wording.",
    icon: "Heart",
  },
  {
    id: "marketing_content_capture",
    label: "Marketing & Content Capture",
    blurb:
      "Product marketing, social crops, before/after content, and small business visual assets.",
    icon: "Megaphone",
  },
];

export function curatedCategoryLabel(id: CuratedCategory): string {
  return curatedCategories.find((c) => c.id === id)?.label ?? id;
}
