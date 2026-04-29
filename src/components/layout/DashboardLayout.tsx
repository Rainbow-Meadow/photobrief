import { Outlet, NavLink } from "react-router-dom";
import { Plus, LifeBuoy } from "lucide-react";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { BrandMark } from "@/components/layout/BrandMark";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useCurrentWorkspace } from "@/hooks/useCurrentWorkspace";
import { RequireAuth } from "@/components/auth/RequireAuth";

export function DashboardLayout() {
  const { workspace } = useCurrentWorkspace();
  return (
    <RequireAuth>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-gradient-subtle">
          {/* Desktop sidebar — hidden on phone/tablet, where the bottom tab bar takes over. */}
          <div className="hidden lg:block">
            <AppSidebar />
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/85 px-3 backdrop-blur pt-safe sm:px-4">
              {/* Sidebar toggle only on desktop where the sidebar exists. */}
              <div className="hidden lg:block">
                <SidebarTrigger />
              </div>

              {/* Brand mark replaces the sidebar identity on mobile. */}
              <NavLink to="/dashboard" aria-label="PhotoBrief home" className="flex items-center lg:hidden">
                <BrandMark variant="mark" tone="auto" size={28} eager />
              </NavLink>

              <div className="hidden text-sm text-muted-foreground sm:block">
                {workspace?.name ?? ""}
              </div>

              <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
                {/* New request lives in the FAB on mobile, in the header from sm: up. */}
                <Button asChild size="sm" className="hidden gap-1.5 sm:inline-flex">
                  <NavLink to="/requests/new">
                    <Plus className="h-4 w-4" />
                    New request
                  </NavLink>
                </Button>
                <NotificationBell />
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    BS
                  </AvatarFallback>
                </Avatar>
              </div>
            </header>

            {/* pb-24 reserves room for the fixed bottom tab bar (16rem tall + safe area). */}
            <main className="flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-8">
              <div className="mx-auto w-full max-w-7xl animate-fade-in">
                <Outlet />
              </div>
            </main>
          </div>
        </div>

        {/* Floating Help button — visible on every authenticated screen.
            Positioned above the MobileTabBar on phones, bottom-right on desktop. */}
        <NavLink
          to="/app/help"
          aria-label="Open help and beta guide"
          className="fixed right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 bottom-[calc(5rem+env(safe-area-inset-bottom))] lg:bottom-6"
        >
          <LifeBuoy className="h-5 w-5" />
        </NavLink>

        {/* Mobile bottom navigation — replaces the desktop sidebar on phones/tablets. */}
        <MobileTabBar />
      </SidebarProvider>
    </RequireAuth>
  );
}
