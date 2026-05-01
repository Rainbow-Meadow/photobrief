import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Inbox,
  BookOpen,
  CreditCard,
  Settings,
  Sparkles,
  FileText,
  MessageSquare,
  LifeBuoy,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { BrandMark } from "@/components/layout/BrandMark";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { UpgradePromptCard } from "@/components/shared/UpgradePromptCard";
import { WorkspaceSwitcher } from "@/features/workspace/components/WorkspaceSwitcher";
import { usePlan } from "@/hooks/usePlan";
import { cn } from "@/lib/utils";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Requests", url: "/requests", icon: Inbox },
  { title: "Guides", url: "/guides", icon: BookOpen },
];

const settingsItems = [
  { title: "Brand", url: "/settings/brand", icon: Sparkles },
  { title: "Team", url: "/settings/team", icon: Settings },
  { title: "Templates", url: "/settings/templates", icon: FileText },
  { title: "SMS", url: "/settings/sms", icon: MessageSquare },
  { title: "Billing", url: "/settings/billing", icon: CreditCard },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { plan, loading: planLoading } = usePlan();
  // Hide the upgrade card for users already on Pro or higher.
  // Plans below Pro: free, starter. Don't render until plan is resolved
  // to avoid flashing the wrong CTA during the brief auth/workspace load.
  const showUpgradeCard = !planLoading && (plan === "free" || plan === "starter");
  const { pathname } = useLocation();

  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border bg-sidebar overflow-hidden">
        <div
          className={cn(
            "flex h-12 items-center",
            collapsed ? "justify-center px-0" : "justify-start px-2",
          )}
        >
          <BrandMark
            variant={collapsed ? "mark" : "horizontal"}
            tone="light"
            size={collapsed ? 24 : 30}
            eager
          />
        </div>
        {!collapsed ? (
          <div className="px-2 pb-2">
            <WorkspaceSwitcher />
          </div>
        ) : null}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <NavLink to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <NavLink to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Resources</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/app/help")} tooltip="Help & Guide">
                  <NavLink to="/app/help" className="flex items-center gap-2">
                    <LifeBuoy className="h-4 w-4" />
                    {!collapsed && <span>Help & Guide</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-2 p-2">
        {!collapsed && showUpgradeCard ? <UpgradePromptCard /> : null}
        <div className={collapsed ? "flex justify-center" : "flex justify-start px-1"}>
          <ThemeToggle compact={collapsed} />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
