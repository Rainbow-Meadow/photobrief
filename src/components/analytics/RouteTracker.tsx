import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/lib/analytics";

/**
 * Fires a GA4 page_view on every client-side route change.
 * Mount once inside <BrowserRouter>.
 */
export function RouteTracker() {
  const location = useLocation();

  useEffect(() => {
    // Defer to next tick so document.title (set by pages) is up to date.
    const id = window.setTimeout(() => {
      trackPageView(location.pathname + location.search);
    }, 0);
    return () => window.clearTimeout(id);
  }, [location.pathname, location.search]);

  return null;
}
