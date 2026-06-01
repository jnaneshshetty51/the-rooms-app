"use client";

import Link from "next/link";
import { Home, CalendarDays, Users, Settings, LogOut } from "lucide-react";
import { cn } from "../../lib/utils";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string | number;
}

interface PortalSidebarProps {
  logo?: React.ReactNode;
  navItems?: NavItem[];
  activeHref?: string;
  userMenu?: React.ReactNode;
  onLogout?: () => void;
  collapsed?: boolean;
}

const DEFAULT_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Bookings", href: "/bookings", icon: CalendarDays },
  { label: "Guests", href: "/guests", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function PortalSidebar({
  logo,
  navItems = DEFAULT_NAV,
  activeHref = "",
  userMenu,
  onLogout,
  collapsed = false,
}: PortalSidebarProps) {
  return (
    <div className={cn("flex h-full flex-col", collapsed && "w-16")}>
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border px-4">
        {logo ? (
          logo
        ) : (
          <span className="font-heading text-xl font-bold text-primary">The Rooms</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeHref === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px]",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.badge && (
                <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-white">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3 space-y-1">
        {userMenu}
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors min-h-[44px]"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        )}
      </div>
    </div>
  );
}
