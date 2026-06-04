"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Hotel, CalendarDays, FileText, HeadphonesIcon, MessageSquareText, Receipt, User, Home, PlusSquare } from "lucide-react";
import { AppShell } from "@the-rooms/ui";
import { PortalSidebar } from "@the-rooms/ui";
import { BottomTabNav } from "@/components/navigation/BottomTabNav";
import { GuestPortalFooter } from "@/components/layout/GuestPortalFooter";
import { NotificationsBell } from "@/components/notifications/NotificationsBell";

const GUEST_NAV = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "My Bookings", href: "/bookings", icon: CalendarDays },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Services", href: "/addons", icon: PlusSquare },
  { label: "Complaints", href: "/complaints", icon: HeadphonesIcon },
  { label: "Feedback", href: "/feedback", icon: MessageSquareText },
  { label: "Invoices", href: "/invoices", icon: Receipt },
  { label: "Profile", href: "/profile", icon: User },
];

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const Logo = (
    <div className="flex items-center justify-center p-2 w-full">
      <img src="/logo.svg" alt="The Rooms Logo" className="h-16 w-auto object-contain" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
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
                <a href="/profile" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#636E72] hover:bg-gray-100 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-[#E17055] flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-[#2D3436] truncate">My Profile</p>
                  </div>
                </a>
              }
              onLogout={() => signOut({ callbackUrl: "/login" })}
            />
          }
          header={
            <div className="flex items-center gap-2 px-4">
              <Hotel className="w-5 h-5 text-[#E17055]" />
              <span className="font-semibold text-[#2D3436]">Guest Portal</span>
              <div className="ml-auto flex items-center gap-2">
                <NotificationsBell />
              </div>
            </div>
          }
        >
          {children}
        </AppShell>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="bg-white border-b px-4 py-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-center">
              <img src="/logo.svg" alt="The Rooms Logo" className="h-10 w-auto object-contain" />
            </div>
            <div className="flex items-center gap-2">
              <NotificationsBell />
              <button 
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="p-2 rounded-lg hover:bg-gray-100 text-[#636E72]"
                title="Sign out"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto pb-20">
          {children}
        </main>

        {/* Bottom Tab Navigation */}
        <BottomTabNav />

        {/* Footer */}
        <GuestPortalFooter className="hidden mobile-footer:block" />
      </div>
    </div>
  );
}
