import { Outlet, NavLink } from "react-router-dom";
import { BrandMark } from "@/components/layout/BrandMark";
import { Button } from "@/components/ui/button";

/**
 * MarketingLayout — for landing, pricing, auth pages.
 */
export function MarketingLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <NavLink to="/" aria-label="PhotoBrief home">
            <BrandMark />
          </NavLink>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground sm:flex">
            <NavLink to="/pricing" className="hover:text-foreground">Pricing</NavLink>
            <NavLink to="/auth" className="hover:text-foreground">Sign in</NavLink>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="sm:hidden">
              <NavLink to="/auth">Sign in</NavLink>
            </Button>
            <Button asChild size="sm">
              <NavLink to="/auth?mode=signup">Start free</NavLink>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <BrandMark />
          <p>© {new Date().getFullYear()} PhotoBrief. Take the right photos, every time.</p>
        </div>
      </footer>
    </div>
  );
}
