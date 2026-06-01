"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Hotel, CalendarDays, FileText, HeadphonesIcon, MessageSquareText, Receipt, User, LogOut, Home, PlusSquare } from "lucide-react";
import { AppShell } from "@the-rooms/ui";
import { PortalSidebar } from "@the-rooms/ui";
import { DashboardHeader } from "@the-rooms/ui";
import { cn } from "@the-rooms/ui";

const GUEST_NAV = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "My Bookings", href: "/bookings", icon: CalendarDays },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Services", href: "/addons", icon: PlusSquare },
  { label: "Complaints", href: "/complaints", icon: HeadphonesIcon },
  { label: "Feedback", href: "/feedback", icon: MessageSquareText },
  { label: "Invoices", href: "/invoices", icon: Receipt },
];

interface Guest {
  name?: string | null;
  email?: string | null;
}

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const Logo = (
    <div className="flex items-center gap-3 px-1">
      <div className="w-8 h-8 rounded-lg bg-[#E17055] flex items-center justify-center shrink-0">
        <span className="text-white font-bold text-sm">R</span>
      </div>
      <div>
        <span className="font-bold text-sm text-[#2D3436]">The Rooms</span>
        <p className="text-[10px] text-[#636E72] leading-tight">Guest Portal</p>
      </div>
    </div>
  );

  return (
    <AppShell
      sidebar={
        <PortalSidebar
          logo={Logo}
          navItems={GUEST_NAV.map((item) => ({
            ...item,
            icon: item.icon,
          }))}
          activeHref={pathname}
          userMenu={
            <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#636E72]">
              <div className="w-8 h-8 rounded-full bg-[#E17055] flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-[#2D3436] truncate">Guest</p>
              </div>
            </div>
          }
          onLogout={() => signOut({ callbackUrl: "/login" })}
        />
      }
      header={
        <DashboardHeader>
          <div className="flex items-center gap-2">
            <Hotel className="w-5 h-5 text-[#E17055]" />
            <span className="font-semibold text-[#2D3436]">Guest Portal</span>
          </div>
        </DashboardHeader>
      }
    >
      {children}
    </AppShell>
  );
}
