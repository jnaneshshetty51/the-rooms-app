// apps/admin/src/app/(dashboard)/layout.tsx
import { redirect } from "next/navigation";
import { auth } from "@the-rooms/auth";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  BedDouble,
  CalendarDays,
  Sparkles,
  Users,
  Megaphone,
  Tag,
  BarChart3,
  Bell,
  Settings,
  Building2,
} from "lucide-react";
  import { PortalSidebar, type NavItem } from "@the-rooms/ui";
  import { DashboardHeader } from "@the-rooms/ui";
  import { AppShell } from "@the-rooms/ui";

const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Room Management", href: "/rooms", icon: BedDouble },
  { label: "Bookings", href: "/bookings", icon: CalendarDays },
  { label: "Amenities", href: "/amenities", icon: Sparkles },
  { label: "Front Office Users", href: "/users", icon: Users },
  { label: "Announcements", href: "/announcements", icon: Megaphone },
  { label: "Discounts", href: "/discounts", icon: Tag },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userName = (session?.user?.name as string | undefined) ?? "Admin";
  const initials = userName.charAt(0).toUpperCase();

  const logo = (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
        <Building2 className="h-4 w-4 text-primary-foreground" />
      </div>
      <div className="flex flex-col">
        <span className="font-heading text-base font-bold text-primary leading-none">The Rooms</span>
        <span className="text-[10px] text-muted-foreground leading-none mt-0.5">Admin Portal</span>
      </div>
    </div>
  );

  const userMenu = (
    <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
        {initials}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="font-medium text-foreground truncate">{userName}</span>
        <span className="text-[10px] text-muted-foreground truncate">Administrator</span>
      </div>
    </div>
  );

  const sidebar = (
    <PortalSidebar
      navItems={ADMIN_NAV}
      activeHref=""
      logo={logo}
      userMenu={userMenu}
    />
  );

  return (
    <AppShell
      sidebar={sidebar}
      header={<DashboardHeader portalName="Admin Portal" userName={userName} notificationCount={0} />}
    >
      {children}
    </AppShell>
  );
}
