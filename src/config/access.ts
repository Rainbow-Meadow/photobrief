/**
 * Centralized access / signup configuration.
 *
 * PhotoBrief is in invite-only beta. Public visitors can join the waitlist;
 * only invited emails can create accounts. Existing users sign in normally.
 *
 * Flip `INVITE_ONLY_BETA` to `false` (and `PUBLIC_SIGNUP_ENABLED` to `true`)
 * once we open public signup.
 */
export const PUBLIC_SIGNUP_ENABLED = false;
export const INVITE_ONLY_BETA = true;

/** Where the primary "create account" CTA should send public visitors. */
export function signupCtaTarget(): string {
  return INVITE_ONLY_BETA ? "/waitlist" : "/auth?mode=signup";
}

/** Label for the primary "create account" CTA. */
export function signupCtaLabel(): string {
  return INVITE_ONLY_BETA ? "Join waitlist" : "Start free";
}

/** Short label, suitable for tight nav slots. */
export function signupCtaShortLabel(): string {
  return INVITE_ONLY_BETA ? "Join waitlist" : "Try free";
}

/** Where pricing tier CTAs should send visitors when they pick a plan. */
export function planCtaTarget(planId: string): string {
  if (INVITE_ONLY_BETA) {
    // Capture which tier they're interested in so the admin sees intent.
    return `/waitlist?interest=${encodeURIComponent(planId)}`;
  }
  if (planId === "free") return "/auth?mode=signup";
  return `/auth?mode=signup&plan=${planId}`;
}

/** Label for plan-tier CTAs. */
export function planCtaLabel(planId: string): string {
  if (INVITE_ONLY_BETA) {
    return planId === "free" ? "Join waitlist" : "Request beta access";
  }
  if (planId === "free") return "Start free";
  return "Get started";
}
