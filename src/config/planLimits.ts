// Centralized plan tiers, limits, and feature gating.
// All gating in the app should go through `canUseFeature(plan, feature)`
// or read limits via `getPlanLimit(plan)`. Do NOT hardcode plan checks
// elsewhere — add a feature key here instead.
import type { Plan } from "@/types/photobrief";

/** Every gated capability in PhotoBrief. */
export type FeatureKey =
  | "request_limit"
  | "branding"
  | "custom_guides"
  | "ai_guide_generator"
  | "ai_request_builder"
  | "pdf_export"
  | "reminders"
  | "internal_notes"
  | "team_members"
  | "white_label"
  | "custom_domain"
  | "api_webhooks"
  | "priority_support"
  | "sso";

export interface FeatureMeta {
  /** Short label used inside upgrade prompts. */
  label: string;
  /** One-sentence description of what the feature does. */
  description: string;
}

export const featureCatalog: Record<FeatureKey, FeatureMeta> = {
  request_limit: {
    label: "More requests per month",
    description: "Send more photo briefs every month without hitting a cap.",
  },
  branding: {
    label: "Custom branding",
    description: "Add your logo, brand color, and intro copy to recipient pages.",
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
  pdf_export: {
    label: "PDF export",
    description: "Export a clean PDF of any submission with photos, answers, and the AI summary.",
  },
  reminders: {
    label: "Automatic reminders",
    description: "Send reminder messages to recipients who haven't finished.",
  },
  internal_notes: {
    label: "Internal notes",
    description: "Add team-only notes on submissions during review.",
  },
  team_members: {
    label: "Team members",
    description: "Invite teammates to share the inbox and assign work.",
  },
  white_label: {
    label: "White-label",
    description: "Remove PhotoBrief branding from recipient pages and emails.",
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
  sso: {
    label: "Single sign-on",
    description: "SAML/SSO and granular role management for your org.",
  },
};

/** Numeric or unlimited cap. `0` means the feature is off entirely. */
export type Quota = number | "unlimited";

export interface PlanLimit {
  id: Plan;
  name: string;
  priceMonthly: number;
  tagline: string;
  /** Marketing bullets for the pricing page. */
  features: string[];
  /** Pro is the visually emphasized main plan. */
  highlight?: boolean;
  /** Numeric quotas — surfaced in usage meters. */
  quotas: {
    requestsPerMonth: Quota;
    customGuides: Quota;
    aiChecksPerMonth: Quota;
    teamSeats: Quota;
  };
  /**
   * Boolean feature toggles. Anything not listed is treated as `false`.
   * `request_limit` is implicitly true for every plan — it's gated by the
   * numeric quota above, not this map.
   */
  capabilities: Partial<Record<FeatureKey, boolean>>;
}

export const planLimits: PlanLimit[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    tagline: "Try PhotoBrief on a few requests.",
    quotas: {
      requestsPerMonth: 5,
      customGuides: 1,
      aiChecksPerMonth: 50,
      teamSeats: 1,
    },
    features: ["Branded request links", "Guided capture", "Basic AI checks", "5 requests / month"],
    capabilities: {
      reminders: true,
    },
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 29,
    tagline: "For solo operators and small crews.",
    highlight: true,
    quotas: {
      requestsPerMonth: 100,
      customGuides: 10,
      aiChecksPerMonth: 1000,
      teamSeats: 3,
    },
    features: [
      "Everything in Free",
      "100 requests / month",
      "Custom branding",
      "Custom guides",
      "AI request builder & guide generator",
      "PDF export",
      "Readiness scoring & extracted details",
    ],
    capabilities: {
      branding: true,
      custom_guides: true,
      ai_guide_generator: true,
      ai_request_builder: true,
      pdf_export: true,
      reminders: true,
    },
  },
  {
    id: "business",
    name: "Business",
    priceMonthly: 79,
    tagline: "For teams reviewing briefs together.",
    quotas: {
      requestsPerMonth: "unlimited",
      customGuides: "unlimited",
      aiChecksPerMonth: "unlimited",
      teamSeats: 10,
    },
    features: [
      "Everything in Pro",
      "Unlimited requests",
      "Team inbox & assignments",
      "Internal notes & activity timeline",
      "White-label recipient pages",
      "Priority support",
    ],
    capabilities: {
      branding: true,
      custom_guides: true,
      ai_guide_generator: true,
      ai_request_builder: true,
      pdf_export: true,
      reminders: true,
      internal_notes: true,
      team_members: true,
      white_label: true,
      priority_support: true,
    },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceMonthly: 0, // "Talk to us" — price hidden on pricing page
    tagline: "For larger orgs with security and integration needs.",
    quotas: {
      requestsPerMonth: "unlimited",
      customGuides: "unlimited",
      aiChecksPerMonth: "unlimited",
      teamSeats: "unlimited",
    },
    features: [
      "Everything in Business",
      "Custom domain",
      "API & webhooks",
      "SSO / SAML",
      "Granular roles & audit log",
      "Dedicated support",
    ],
    capabilities: {
      branding: true,
      custom_guides: true,
      ai_guide_generator: true,
      ai_request_builder: true,
      pdf_export: true,
      reminders: true,
      internal_notes: true,
      team_members: true,
      white_label: true,
      custom_domain: true,
      api_webhooks: true,
      priority_support: true,
      sso: true,
    },
  },
];

const planRank: Record<Plan, number> = {
  free: 0,
  pro: 1,
  business: 2,
  enterprise: 3,
};

export function getPlanLimit(plan: Plan): PlanLimit {
  return planLimits.find((p) => p.id === plan) ?? planLimits[0];
}

/**
 * Single source of truth for "is this feature available on this plan?".
 * Use this everywhere instead of `if (plan === 'pro')` style checks.
 *
 * For numeric-quota gates (`request_limit`), pass the current usage to
 * check the cap. Without `currentUsage` the function only confirms the
 * plan supports any requests at all (always true today).
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
