import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { Menu } from "lucide-react";

import { BrandMark } from "@/components/layout/BrandMark";
import { Button } from "@/components/ui/button";
import { signupCtaTarget, signupCtaShortLabel, signupCtaLabel } from "@/config/access";
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
      <div className="sticky top-0 z-40 px-3 pt-3 sm:px-6 sm:pt-4 pt-safe">
        <header className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 rounded-full glass-nav px-3 sm:h-16 sm:px-5">
          <NavLink to="/" aria-label="PhotoBrief home" className="flex items-center pl-1">
            <BrandMark variant="horizontal" tone="dark" size={32} eager className="sm:hidden" />
            <BrandMark variant="horizontal" tone="dark" size={38} eager className="hidden sm:block" />
          </NavLink>

          <nav className="hidden items-center gap-1 text-sm font-medium sm:flex">
            {[
              { href: "/#how-it-works", label: "How it works" },
              { href: "/#use-cases", label: "Use cases" },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
            {[
              { to: "/pricing", label: "Pricing" },
              { to: "/help", label: "Help" },
            ].map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `rounded-full px-3 py-1.5 transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <Button asChild variant="ghost" size="sm" className="hidden rounded-full sm:inline-flex">
              <NavLink to="/auth">Sign in</NavLink>
            </Button>
            <Button asChild size="sm" className="rounded-full px-4">
              <NavLink to={signupCtaTarget()}>{signupCtaShortLabel()}</NavLink>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full sm:hidden"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </header>
      </div>

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
              <NavLink to={signupCtaTarget()} onClick={() => setMenuOpen(false)}>
                {signupCtaLabel()}
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
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-4">
            <NavLink to="/pricing" className="hover:text-foreground">Pricing</NavLink>
            <NavLink to="/help" className="hover:text-foreground">Help</NavLink>
            <NavLink to="/for-ai-agents" className="hover:text-foreground">For AI agents</NavLink>
          </nav>
          <p>© {new Date().getFullYear()} PhotoBrief. Take the right photos, every time.</p>
        </div>
      </footer>
    </div>
  );
}
