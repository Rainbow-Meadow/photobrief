import type { CuratedCategory } from "@/types/photobrief";

export interface CuratedCategoryMeta {
  id: CuratedCategory;
  label: string;
  blurb: string;
  /** Lucide icon name — looked up at render time. */
  icon: "Wrench" | "Home" | "PackageCheck" | "Megaphone" | "Sparkles";
}

/**
 * The five curated buckets shown in the public Guide Library.
 * Internal templates live behind an admin toggle — they don't appear here.
 */
export const curatedCategories: CuratedCategoryMeta[] = [
  {
    id: "service_quote",
    label: "Service Quote Intake",
    blurb: "Estimate jobs faster with photos before the truck rolls.",
    icon: "Wrench",
  },
  {
    id: "property_proof",
    label: "Property, Proof & Records",
    blurb: "Move-in / move-out, condition reports, and proof-of-completion.",
    icon: "Home",
  },
  {
    id: "product_support",
    label: "Product Support & Claims",
    blurb: "Diagnose returns, warranty claims, and product issues.",
    icon: "PackageCheck",
  },
  {
    id: "sales_listing",
    label: "Sales, Listings & Marketing",
    blurb: "Capture listing-quality photos with the right shot list.",
    icon: "Megaphone",
  },
  {
    id: "custom_intake",
    label: "Custom Business Intake",
    blurb: "Generic starting points you can rebrand for any workflow.",
    icon: "Sparkles",
  },
];

export function curatedCategoryLabel(id: CuratedCategory): string {
  return curatedCategories.find((c) => c.id === id)?.label ?? id;
}
