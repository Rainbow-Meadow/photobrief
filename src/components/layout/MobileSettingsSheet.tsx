import { NavLink } from "react-router-dom";
import { Sparkles, Users, FileText, MessageSquare, CreditCard, ChevronRight } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

const items = [
  { to: "/settings/brand", label: "Brand", description: "Logo, colors, recipient page", icon: Sparkles },
  { to: "/settings/team", label: "Team", description: "Members, roles, invites", icon: Users },
  { to: "/settings/templates", label: "Message templates", description: "Reminders & follow-ups", icon: FileText },
  { to: "/settings/sms", label: "SMS", description: "Phone number & delivery", icon: MessageSquare },
  { to: "/settings/billing", label: "Billing & plan", description: "Subscription, usage, invoices", icon: CreditCard },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Full-height bottom sheet that lists the workspace settings group.
 * Used by the mobile bottom tab bar in place of nesting Settings inside
 * the primary nav (which would be too crowded on a phone).
 */
export function MobileSettingsSheet({ open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0">
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>Configure your workspace.</SheetDescription>
        </SheetHeader>
        <ul className="divide-y overflow-y-auto pb-safe">
          {items.map((it) => (
            <li key={it.to}>
              <NavLink
                to={it.to}
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-3 px-5 py-4 transition active:bg-muted"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <it.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{it.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{it.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </NavLink>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
