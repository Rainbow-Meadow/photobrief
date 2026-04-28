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
  const { businessName, logoUrl } = useRecipientBranding();
  return (
    <div className="flex min-h-screen flex-col bg-gradient-subtle">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={businessName}
                className="h-7 w-7 rounded-md object-cover"
              />
            ) : (
              <span className="h-7 w-7 rounded-md bg-primary" aria-hidden />
            )}
            <span>{businessName}</span>
          </div>
          <span className="text-xs text-muted-foreground">Secure photo intake</span>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">
          <Outlet />
        </div>
      </main>

      <footer className="border-t bg-background py-4">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-center px-4">
          <BrandMark />
        </div>
      </footer>
    </div>
  );
}
