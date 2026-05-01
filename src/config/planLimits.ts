// Centralized plan tiers, limits, and feature gating.
// Source of truth: 01_Strategy/02_pricing_and_plan_limits.md +
// 08_Config_Blueprints/planLimits.example.ts +
// 10_Go_To_Market/03_founding_pro_offer.md.
//
// All gating in the app should go through `canUseFeature(plan, feature)`
// or read limits via `getPlanLimit(plan)`. Do NOT hardcode plan checks
// elsewhere — add a feature key here instead.
import type { Plan } from "@/types/photobrief";

/** Every gated capability in PhotoBrief. */
export type FeatureKey =
  | "request_limit"
  // Branding / recipient experience
  | "branding"          // alias for branded_links — kept for back-compat
  | "branded_links"
  | "custom_messages"
  | "white_label"
  // Guides
  | "custom_guides"
  | "ai_guide_generator"
  // AI
  | "ai_request_builder"
  | "advanced_ai_checks"
  | "missing_shot_followup"
  // Workflow
  | "reminders"
  | "internal_notes"
  | "assignments"
  | "team_members"      // alias for team_inbox — kept for back-compat
  | "team_inbox"
  | "saved_templates"
  | "bulk_actions"
  // Output
  | "pdf_export"
  // Org / integrations
  | "multi_workspace"
  | "custom_domain"
  | "api_webhooks"
  | "priority_support";

export interface FeatureMeta {
  label: string;
  description: string;
}

export const featureCatalog: Record<FeatureKey, FeatureMeta> = {
  request_limit: {
    label: "More requests per month",
    description: "Send more photo briefs every month without hitting a cap.",
  },
  branding: {
    label: "Branded request links",
    description: "Add your logo, brand color, and intro copy to recipient pages.",
  },
  branded_links: {
    label: "Branded request links",
    description: "Add your logo, brand color, and intro copy to recipient pages.",
  },
  custom_messages: {
    label: "Custom intro & completion messages",
    description: "Set the tone with your own welcome and thank-you copy.",
  },
  white_label: {
    label: "White-label",
    description: "Remove PhotoBrief branding from recipient pages and emails.",
  },
  custom_guides: {
    label: "Custom guides",
    description: "Build and save your own capture guides beyond the included templates.",
  },
  ai_guide_generator: {
    label: "AI Guide Generator",
    description: "Let AI draft full capture guides from a short description.",
  },
  ai_request_builder: {
    label: "AI request builder",
    description: 'Type "I need photos for…" and get an editable request draft.',
  },
  advanced_ai_checks: {
    label: "Advanced AI quality gate",
    description: "Catch blur, glare, missing items, and more — before you review.",
  },
  missing_shot_followup: {
    label: "Missing-shot follow-up",
    description: "AI nudges the customer for the exact shot you're missing.",
  },
  reminders: {
    label: "Automatic reminders",
    description: "Send reminder messages to recipients who haven't finished.",
  },
  internal_notes: {
    label: "Internal notes",
    description: "Add team-only notes on submissions during review.",
  },
  assignments: {
    label: "Request assignments",
    description: "Assign requests and submissions to teammates.",
  },
  team_members: {
    label: "Team inbox",
    description: "Invite teammates to share the inbox and assign work.",
  },
  team_inbox: {
    label: "Team inbox",
    description: "Invite teammates to share the inbox and assign work.",
  },
  saved_templates: {
    label: "Saved message templates",
    description: "Reuse polished outreach messages across requests.",
  },
  bulk_actions: {
    label: "Bulk actions",
    description: "Move, archive, or assign many requests at once.",
  },
  pdf_export: {
    label: "PDF export",
    description: "Export a clean PDF of any submission with photos, answers, and the AI summary.",
  },
  multi_workspace: {
    label: "Multiple workspaces",
    description: "Run separate workspaces per location, brand, or business unit.",
  },
  custom_domain: {
    label: "Custom domain",
    description: "Send recipients to links on your own domain.",
  },
  api_webhooks: {
    label: "API & webhooks",
    description: "Push submissions into your own systems with our API and webhooks.",
  },
  priority_support: {
    label: "Priority support",
    description: "Faster response times from the PhotoBrief team.",
  },
};

/** Numeric or unlimited cap. `0` means the feature is off entirely. */
export type Quota = number | "unlimited";

export type PdfExportLevel = false | "basic" | "branded" | "full_branding" | "custom";

export interface PlanLimit {
  id: Plan;
  name: string;
  priceMonthly: number;
  /** Effective monthly price when paying yearly (~20% off). */
  priceAnnualMonthly: number;
  tagline: string;
  /** Short purpose line from the spec — used as the card subtitle. */
  purpose: string;
  /** Marketing bullets. The first 3 lead the card; the rest expand on hover/expand. */
  features: string[];
  /** Pro is the visually emphasized main plan. */
  highlight?: boolean;
  /** Numeric quotas — surfaced in usage meters. */
  quotas: {
    requestsPerMonth: Quota;
    users: Quota;
    aiChecksPerMonth: Quota;
    historyMonths: Quota;
    savedTemplates: Quota;
  };
  /**
   * Boolean feature toggles. Anything not listed is treated as `false`.
   * `request_limit` is implicitly true for every plan — it's gated by the
   * numeric quota above, not this map.
   */
  capabilities: Partial<Record<FeatureKey, boolean>>;
  /** Output level for PDF export specifically (per spec). */
  pdfExport: PdfExportLevel;
  /** Stripe price IDs (filled once Stripe products are created). */
  stripeMonthlyPriceId?: string;
  stripeAnnualPriceId?: string;
}

const annual = (monthly: number) => Number((monthly * 0.8).toFixed(2));

export const planLimits: PlanLimit[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    priceAnnualMonthly: 0,
    tagline: "Try the request workflow.",
    purpose: "Experience the full request flow on a few jobs.",
    quotas: {
      requestsPerMonth: 3,
      users: 1,
      aiChecksPerMonth: 30,
      historyMonths: 0.25, // 7 days
      savedTemplates: 0,
    },
    features: [
      "First-pass guarantee — rejected requests are refunded",
      "3 requests / month",
      "1 user",
      "Built-in templates",
      "Basic request links",
      "Basic AI quality checks",
      "PhotoBrief branding",
      "7-day history",
    ],
    capabilities: {},
    pdfExport: false,
  },
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 19,
    priceAnnualMonthly: 15,
    tagline: "Look professional, instantly.",
    purpose: "Solo operators who want a branded recipient experience.",
    quotas: {
      requestsPerMonth: 25,
      users: 1,
      aiChecksPerMonth: 250,
      historyMonths: 1,
      savedTemplates: 1,
    },
    features: [
      "First-pass guarantee — rejected requests are refunded",
      "25 requests / month",
      "1 user",
      "Logo + brand color",
      "Branded request page",
      "Custom intro & completion messages",
      "Standard AI checks + AI summary",
      "Readiness score & extracted details",
      "Basic request inbox",
      "PDF export (PhotoBrief footer)",
      "30-day history",
    ],
    capabilities: {
      branding: true,
      branded_links: true,
      custom_messages: true,
      advanced_ai_checks: true,
      pdf_export: true,
    },
    pdfExport: "basic",
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 49,
    priceAnnualMonthly: 40,
    tagline: "Automate intake, end to end.",
    purpose: "Solo operators and small crews automating their request workflow.",
    highlight: true,
    quotas: {
      requestsPerMonth: 150,
      users: 3,
      aiChecksPerMonth: 1500,
      historyMonths: 12,
      savedTemplates: 5,
    },
    features: [
      "First-pass guarantee — rejected requests are refunded",
      "Everything in Starter",
      "150 requests / month",
      "3 users",
      "Custom Photo Guides",
      "AI Guide Generator",
      "Advanced AI quality gate",
      "Missing-shot follow-up",
      "Request reminders",
      "Internal notes & assignments",
      "Saved message templates",
      "Branded PDF export",
      "White-label recipient pages",
      "12-month history",
    ],
    capabilities: {
      branding: true,
      branded_links: true,
      custom_messages: true,
      custom_guides: true,
      ai_guide_generator: true,
      ai_request_builder: true,
      advanced_ai_checks: true,
      missing_shot_followup: true,
      reminders: true,
      internal_notes: true,
      assignments: true,
      saved_templates: true,
      pdf_export: true,
      white_label: true,
    },
    pdfExport: "branded",
  },
  {
    id: "team",
    name: "Team",
    priceMonthly: 99,
    priceAnnualMonthly: 80,
    tagline: "Run the whole operation.",
    purpose: "Teams that share an inbox and review submissions together.",
    quotas: {
      requestsPerMonth: 500,
      users: 10,
      aiChecksPerMonth: 5000,
      historyMonths: 24,
      savedTemplates: "unlimited",
    },
    features: [
      "First-pass guarantee — rejected requests are refunded",
      "Everything in Pro",
      "500 requests / month",
      "10 users",
      "Team assignments & reviewer roles",
      "Shared internal notes",
      "Team activity history",
      "Multiple saved templates",
      "Higher AI limits",
      "Bulk actions",
      "Full PDF branding",
      "White-label recipient pages",
      "2-year history",
    ],
    capabilities: {
      branding: true,
      branded_links: true,
      custom_messages: true,
      custom_guides: true,
      ai_guide_generator: true,
      ai_request_builder: true,
      advanced_ai_checks: true,
      missing_shot_followup: true,
      reminders: true,
      internal_notes: true,
      assignments: true,
      team_members: true,
      team_inbox: true,
      saved_templates: true,
      bulk_actions: true,
      pdf_export: true,
      white_label: true,
      priority_support: true,
    },
    pdfExport: "full_branding",
  },
  {
    id: "business",
    name: "Business",
    priceMonthly: 199,
    priceAnnualMonthly: 150,
    tagline: "Scale and integrate.",
    purpose: "Multi-location operators who need custom domains, API access, and integrations.",
    quotas: {
      requestsPerMonth: 1500,
      users: 25,
      aiChecksPerMonth: "unlimited",
      historyMonths: "unlimited",
      savedTemplates: "unlimited",
    },
    features: [
      "First-pass guarantee — rejected requests are refunded",
      "Everything in Team",
      "1,500+ requests / month",
      "25+ users",
      "Multiple workspaces / locations",
      "Custom domain",
      "White-label recipient pages",
      "API & webhooks",
      "Advanced audit & history",
      "Data retention controls",
      "Priority support",
    ],
    capabilities: {
      branding: true,
      branded_links: true,
      custom_messages: true,
      custom_guides: true,
      ai_guide_generator: true,
      ai_request_builder: true,
      advanced_ai_checks: true,
      missing_shot_followup: true,
      reminders: true,
      internal_notes: true,
      assignments: true,
      team_members: true,
      team_inbox: true,
      saved_templates: true,
      bulk_actions: true,
      pdf_export: true,
      multi_workspace: true,
      custom_domain: true,
      white_label: true,
      api_webhooks: true,
      priority_support: true,
    },
    pdfExport: "custom",
  },
];

const planRank: Record<Plan, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  team: 3,
  business: 4,
};

export function getPlanLimit(plan: Plan): PlanLimit {
  return planLimits.find((p) => p.id === plan) ?? planLimits[0];
}

/**
 * Single source of truth for "is this feature available on this plan?".
 * Use this everywhere instead of `if (plan === 'pro')` style checks.
 */
export function canUseFeature(
  plan: Plan,
  feature: FeatureKey,
  currentUsage?: number,
): boolean {
  const limit = getPlanLimit(plan);

  if (feature === "request_limit") {
    const cap = limit.quotas.requestsPerMonth;
    if (cap === "unlimited") return true;
    if (typeof currentUsage === "number") return currentUsage < cap;
    return cap > 0;
  }

  return limit.capabilities[feature] === true;
}

/** Lowest plan that unlocks a given feature, or undefined if nothing does. */
export function minPlanFor(feature: FeatureKey): Plan | undefined {
  const sorted = [...planLimits].sort((a, b) => planRank[a.id] - planRank[b.id]);
  for (const p of sorted) {
    if (feature === "request_limit") {
      const cap = p.quotas.requestsPerMonth;
      if (cap === "unlimited" || (typeof cap === "number" && cap > 0)) return p.id;
    } else if (p.capabilities[feature]) {
      return p.id;
    }
  }
  return undefined;
}

export function comparePlans(a: Plan, b: Plan): number {
  return planRank[a] - planRank[b];
}

/**
 * Single source of truth for "this feature is locked" copy.
 *
 * Use everywhere instead of ad-hoc `"X is on the Pro plan"` strings so the
 * upgrade language stays consistent and is easy to retune.
 */
export function lockedFeatureCopy(feature: FeatureKey): {
  /** Plan that unlocks the feature, capitalized (e.g. "Pro"). */
  planLabel: string;
  /** Short toast message: "Reminders are on the Pro plan". */
  toast: string;
  /** Tooltip text: "Available on Pro and above". */
  tooltip: string;
  /** 2-3 char badge label rendered next to gated buttons. */
  badge: string;
} {
  const plan = minPlanFor(feature);
  const planLabel = plan ? getPlanLimit(plan).name : "a higher plan";
  const meta = featureCatalog[feature];
  const noun = meta?.label ?? "This feature";
  return {
    planLabel,
    toast: `${noun} is on the ${planLabel} plan`,
    tooltip: `Available on ${planLabel} and above`,
    badge: planLabel,
  };
}

/** Founding-Pro offer config. Sourced from 10_Go_To_Market/03_founding_pro_offer.md. */
export const FOUNDING_PRO = {
  monthlyPrice: 29,
  totalSlots: 50,
  /** Apply on top of the Pro plan capabilities — Founding Pro IS the Pro plan, just locked in. */
  basePlan: "pro" as Plan,
  /** Coupon code surfaced in the marketing CTA. */
  couponCode: "FOUNDINGPRO",
};
