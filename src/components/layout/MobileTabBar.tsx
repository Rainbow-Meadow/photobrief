import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Inbox, BookOpen, Settings, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { MobileSettingsSheet } from "@/components/layout/MobileSettingsSheet";

/**
 * Bottom tab bar used on screens below `lg`. Mirrors the desktop sidebar
 * primary nav, with Settings opening a full-screen sheet listing the
 * settings sub-pages. The centered FAB launches a new request.
 *
 * Hidden at `lg:` and above where the AppSidebar takes over.
 */
const tabs: Array<{ key: string; label: string; icon: typeof LayoutDashboard; to: string }> = [
  { key: "dashboard", label: "Home", icon: LayoutDashboard, to: "/dashboard" },
  { key: "requests", label: "Requests", icon: Inbox, to: "/requests" },
  { key: "guides", label: "Guides", icon: BookOpen, to: "/guides" },
];

export function MobileTabBar() {
  const { pathname } = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isSettingsActive = pathname.startsWith("/settings");

  return (
    <>
      <nav
        aria-label="Primary"
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 lg:hidden",
          "border-t bg-background/95 backdrop-blur",
          "pb-safe",
        )}
      >
        <div className="relative mx-auto grid h-16 max-w-2xl grid-cols-5 items-stretch px-2">
          {/* First two tabs */}
          {tabs.slice(0, 2).map((t) => (
            <TabLink key={t.key} {...t} active={pathname === t.to || pathname.startsWith(`${t.to}/`)} />
          ))}

          {/* Center FAB */}
          <div className="flex items-start justify-center">
            <NavLink
              to="/requests/new"
              aria-label="New request"
              className={cn(
                "-mt-6 inline-flex h-14 w-14 items-center justify-center rounded-full",
                "bg-primary text-primary-foreground shadow-elev-md",
                "ring-4 ring-background transition active:scale-95",
              )}
            >
              <Plus className="h-6 w-6" />
            </NavLink>
          </div>

          {/* Last regular tab */}
          <TabLink
            {...tabs[2]}
            active={pathname === tabs[2].to || pathname.startsWith(`${tabs[2].to}/`)}
          />

          {/* Settings opens sheet */}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition",
              isSettingsActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Settings className="h-5 w-5" />
            <span className="text-[10px] leading-none">Settings</span>
          </button>
        </div>
      </nav>

      <MobileSettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}

function TabLink({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
}) {
  return (
    <NavLink
      to={to}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[10px] leading-none">{label}</span>
    </NavLink>
  );
}
