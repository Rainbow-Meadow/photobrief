import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { Menu } from "lucide-react";

import { BrandMark } from "@/components/layout/BrandMark";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * MarketingLayout — landing, pricing, auth pages.
 * Mobile: compact header + hamburger sheet for nav.
 * Desktop (sm+): inline nav links and Sign in CTA.
 */
export function MarketingLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur pt-safe">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8">
          <NavLink to="/" aria-label="PhotoBrief home" className="flex items-center">
            {/* Smaller wordmark on phone, full size from sm: up. */}
            <BrandMark variant="horizontal" tone="dark" size={36} eager className="sm:hidden" />
            <BrandMark variant="horizontal" tone="dark" size={44} eager className="hidden sm:block" />
          </NavLink>

          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground sm:flex">
            <a href="/#how-it-works" className="hover:text-foreground">How it works</a>
            <a href="/#use-cases" className="hover:text-foreground">Use cases</a>
            <NavLink to="/pricing" className="hover:text-foreground">Pricing</NavLink>
            <NavLink to="/help" className="hover:text-foreground">Help</NavLink>
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <NavLink to="/auth">Sign in</NavLink>
            </Button>
            <Button asChild size="sm" className="rounded-full px-4">
              <NavLink to="/auth?mode=signup">Try Free</NavLink>
            </Button>

            {/* Hamburger trigger — mobile only. */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 sm:hidden"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile nav sheet */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="right" className="w-[80vw] max-w-sm p-0">
          <SheetHeader className="border-b px-5 py-4 text-left">
            <SheetTitle>
              <BrandMark variant="horizontal" tone="dark" size={32} eager />
            </SheetTitle>
          </SheetHeader>
          <ul className="divide-y">
            <li>
              <a
                href="/#how-it-works"
                onClick={() => setMenuOpen(false)}
                className="block px-5 py-4 text-base font-medium text-foreground active:bg-muted"
              >
                How it works
              </a>
            </li>
            <li>
              <a
                href="/#use-cases"
                onClick={() => setMenuOpen(false)}
                className="block px-5 py-4 text-base font-medium text-foreground active:bg-muted"
              >
                Use cases
              </a>
            </li>
            <li>
              <NavLink
                to="/pricing"
                onClick={() => setMenuOpen(false)}
                className="block px-5 py-4 text-base font-medium text-foreground active:bg-muted"
              >
                Pricing
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/help"
                onClick={() => setMenuOpen(false)}
                className="block px-5 py-4 text-base font-medium text-foreground active:bg-muted"
              >
                Help
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/auth"
                onClick={() => setMenuOpen(false)}
                className="block px-5 py-4 text-base font-medium text-foreground active:bg-muted"
              >
                Sign in
              </NavLink>
            </li>
          </ul>
          <div className="px-5 pt-6">
            <Button asChild className="w-full rounded-full">
              <NavLink to="/auth?mode=signup" onClick={() => setMenuOpen(false)}>
                Try Free
              </NavLink>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t bg-muted/30 pb-safe">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <BrandMark variant="wordmark" tone="dark" size={28} className="opacity-80" />
          <p>© {new Date().getFullYear()} PhotoBrief. Take the right photos, every time.</p>
        </div>
      </footer>
    </div>
  );
}
