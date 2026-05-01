import { Outlet } from "react-router-dom";
import { BrandMark } from "@/components/layout/BrandMark";
import { useRecipientBranding } from "@/features/capture/RecipientBrandingContext";



/**
 * PublicRequestLayout
 * Mobile-first layout for the recipient chat-first capture flow.
 * Branding (business name, logo, color) is injected via RecipientBrandingProvider
 * from the page route. No auth, no sidebar.
 */
export function PublicRequestLayout() {
  const { businessName, logoUrl, hidePhotobriefBranding } = useRecipientBranding();
  return (
    <div className="recipient-shell relative isolate flex min-h-screen flex-col bg-gradient-subtle">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[40vh] bg-ambient-sky" aria-hidden />
      <header className="sticky top-0 z-30 glass-nav">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={businessName}
                className="h-7 w-7 rounded-lg object-cover ring-1 ring-border"
              />
            ) : (
              <BrandMark variant="horizontal" tone="dark" size={28} eager />
            )}
            {logoUrl ? <span>{businessName}</span> : null}
          </div>
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Secure intake</span>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">
          <Outlet />
        </div>
      </main>

      {!hidePhotobriefBranding ? (
        <footer className="hairline-t bg-background/60 py-4 backdrop-blur">
          <div className="mx-auto flex w-full max-w-2xl items-center justify-center px-4">
            <BrandMark variant="wordmark" tone="dark" size={18} className="opacity-60" />
          </div>
        </footer>
      ) : null}
    </div>
  );
}
