"use client";

import Link from "next/link";
import { Home, CalendarDays, Users, Settings } from "lucide-react";
import { cn } from "../../lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface MobileBottomNavProps {
  items?: NavItem[];
  activeHref?: string;
}

const DEFAULT_ITEMS: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Bookings", href: "/bookings", icon: CalendarDays },
  { label: "Guests", href: "/guests", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function MobileBottomNav({ items = DEFAULT_ITEMS, activeHref = "" }: MobileBottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-border bg-card px-2 pb-safe md:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeHref === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-3 text-[11px] font-medium transition-colors min-w-[64px]",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
