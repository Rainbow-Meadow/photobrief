// GA4 analytics helpers. Safe no-ops when gtag is unavailable
// (SSR, ad blockers, dev where script failed to load).

export const GA_MEASUREMENT_ID = "G-GJCZPQ3WJ9";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

type EventParams = Record<string, string | number | boolean | undefined | null>;

function gtagSafe(...args: unknown[]) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  try {
    window.gtag(...args);
  } catch {
    // swallow — analytics must never break the app
  }
}

/**
 * Sanitize a path so we never leak high-entropy tokens / IDs into GA reports.
 * Replaces UUIDs and the recipient public token segment with placeholders.
 */
export function sanitizePath(pathname: string): string {
  return pathname
    // /r/<token>(/done)? -> /r/:token(/done)?
    .replace(/^\/r\/[^/]+/, "/r/:token")
    // /invite/<token> -> /invite/:token
    .replace(/^\/invite\/[^/]+/, "/invite/:token")
    // /beta-invite/<token> -> /beta-invite/:token
    .replace(/^\/beta-invite\/[^/]+/, "/beta-invite/:token")
    // UUIDs -> :id
    .replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      "/:id",
    );
}

export function trackPageView(path: string, title?: string) {
  const cleanPath = sanitizePath(path);
  gtagSafe("event", "page_view", {
    page_path: cleanPath,
    page_title: title ?? (typeof document !== "undefined" ? document.title : undefined),
    page_location:
      typeof window !== "undefined"
        ? `${window.location.origin}${cleanPath}`
        : undefined,
  });
}

export function trackEvent(name: string, params?: EventParams) {
  gtagSafe("event", name, params ?? {});
}
