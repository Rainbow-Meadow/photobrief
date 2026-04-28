import { Outlet, NavLink } from "react-router-dom";
import { Plus } from "lucide-react";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { NotificationBell } from "@/components/layout/NotificationBell";
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
        <AppSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="hidden text-sm text-muted-foreground sm:block">
              {workspace?.name ?? ""}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button asChild size="sm" className="gap-1.5">
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

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-7xl animate-fade-in">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
    </RequireAuth>
  );
}

