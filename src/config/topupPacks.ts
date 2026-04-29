// Top-up request credit packs. One-time purchases that add request capacity
// on top of the workspace's monthly plan allowance. Credits expire at the
// end of the current billing period.
//
// Pricing is set so per-request cost is roughly 2× the marginal plan rate —
// cheaper than upgrading for a short burst, but a clear nudge to upgrade
// if used repeatedly.
export interface TopupPack {
  /** Stripe price ID (lookup_key) — created via payments--batch_create_product. */
  priceId: "topup_25" | "topup_100" | "topup_500";
  size: 25 | 100 | 500;
  /** Display price in cents. */
  amountCents: number;
  currency: "usd";
  label: string;
  tagline: string;
  /** Highlight the most popular pack on the cards. */
  highlight?: boolean;
}

export const topupPacks: TopupPack[] = [
  {
    priceId: "topup_25",
    size: 25,
    amountCents: 1500,
    currency: "usd",
    label: "Small pack",
    tagline: "Quick top-up for a busy week.",
  },
  {
    priceId: "topup_100",
    size: 100,
    amountCents: 4500,
    currency: "usd",
    label: "Medium pack",
    tagline: "Most teams pick this one.",
    highlight: true,
  },
  {
    priceId: "topup_500",
    size: 500,
    amountCents: 17500,
    currency: "usd",
    label: "Large pack",
    tagline: "Best value per request.",
  },
];

export function formatPrice(cents: number, currency: "usd" = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function perRequestCents(pack: TopupPack): number {
  return Math.round(pack.amountCents / pack.size);
}
