import type { Plan } from "@/types/photobrief";

export interface PlanLimit {
  id: Plan;
  name: string;
  priceMonthly: number;
  tagline: string;
  requestsPerMonth: number | "unlimited";
  customGuides: number | "unlimited";
  aiChecksPerMonth: number | "unlimited";
  teamSeats: number;
  features: string[];
  highlight?: boolean;
}

export const planLimits: PlanLimit[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    tagline: "Try PhotoBrief on a few requests.",
    requestsPerMonth: 5,
    customGuides: 1,
    aiChecksPerMonth: 50,
    teamSeats: 1,
    features: ["Branded request links", "Guided capture", "Basic AI checks"],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 29,
    tagline: "For solo operators and small crews.",
    requestsPerMonth: 100,
    customGuides: 10,
    aiChecksPerMonth: 1000,
    teamSeats: 3,
    features: [
      "Everything in Free",
      "AI request builder",
      "AI guide generator",
      "Readiness scoring",
      "Extracted details",
    ],
    highlight: true,
  },
  {
    id: "team",
    name: "Team",
    priceMonthly: 79,
    tagline: "For teams reviewing briefs together.",
    requestsPerMonth: "unlimited",
    customGuides: "unlimited",
    aiChecksPerMonth: "unlimited",
    teamSeats: 10,
    features: [
      "Everything in Pro",
      "Team inbox & assignments",
      "Internal notes & activity timeline",
      "Priority support",
    ],
  },
];
