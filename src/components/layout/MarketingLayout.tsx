import { Outlet, NavLink } from "react-router-dom";
import { BrandMark } from "@/components/layout/BrandMark";
import { Button } from "@/components/ui/button";

/**
 * MarketingLayout — for landing, pricing, auth pages.
 */
export function MarketingLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <NavLink to="/" aria-label="PhotoBrief home">
            <BrandMark variant="horizontal" tone="dark" size={32} eager />
          </NavLink>
          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground sm:flex">
            <a href="/#how-it-works" className="hover:text-foreground">How it works</a>
            <a href="/#use-cases" className="hover:text-foreground">Use cases</a>
            <NavLink to="/pricing" className="hover:text-foreground">Pricing</NavLink>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <NavLink to="/auth">Sign in</NavLink>
            </Button>
            <Button asChild size="sm" className="rounded-full px-4">
              <NavLink to="/auth?mode=signup">Try Free</NavLink>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <BrandMark variant="wordmark" tone="dark" size={20} className="opacity-70" />
          <p>© {new Date().getFullYear()} PhotoBrief. Take the right photos, every time.</p>
        </div>
      </footer>
    </div>
  );
}
