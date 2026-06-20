"use client";

// apps/admin/src/app/(dashboard)/_components/AdminSidebarClient.tsx
// Comprehensive admin sidebar with full navigation based on blueprint

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  LogOut,
  Building2,
  Images,
  Link2,
  UserCog,
  Wrench,
  AlertTriangle,
  FileText,
  CreditCard,
  Wallet,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Plug,
  Cog,
  Shield,
  HardDrive,
  Sparkle,
  ClipboardList,
  Kanban,
  AlertCircle,
  ChevronRight,
  Menu,
  X,
  Package,
} from "lucide-react";
import { cn } from "@the-rooms/ui";
import { signOut as nextAuthSignOut } from "next-auth/react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@the-rooms/ui";

// ─── Navigation Sections based on Admin Blueprint ─────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const ADMIN_NAV_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Room Board", href: "/room-board", icon: Kanban },
      { label: "Quick Actions", href: "/quick-actions", icon: Sparkle },
    ],
  },
  {
    label: "Reservations",
    items: [
      { label: "All Bookings", href: "/bookings", icon: CalendarDays },
      { label: "Check-ins", href: "/bookings?status=CONFIRMED", icon: CalendarDays },
      { label: "Check-outs", href: "/bookings?status=CHECKED_IN", icon: CalendarDays },
      { label: "No Shows", href: "/bookings?status=NO_SHOW", icon: AlertCircle },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Housekeeping", href: "/housekeeping", icon: Sparkles },
      { label: "Maintenance", href: "/maintenance", icon: Wrench },
      { label: "Complaints", href: "/complaints", icon: AlertTriangle },
      { label: "Night Audit", href: "/night-audit", icon: Shield },
      { label: "Damage Assessments", href: "/damage-assessments", icon: AlertTriangle },
      { label: "Lost & Found", href: "/lost-found", icon: Package },
    ],
  },
  {
    label: "Guests & CRM",
    items: [
      { label: "Guest Profiles", href: "/guests", icon: UserCog },
      { label: "Blacklist / VIP", href: "/guests?filter=blacklist", icon: Shield },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Invoices", href: "/invoices", icon: FileText },
      { label: "Payments", href: "/payments", icon: CreditCard },
      { label: "Expenses", href: "/expenses", icon: TrendingDown },
      { label: "Cash Management", href: "/cash-management", icon: Wallet },
      { label: "Tally Export", href: "/tally-export", icon: FileSpreadsheet },
    ],
  },
  {
    label: "Master Data",
    items: [
      { label: "Room Management", href: "/rooms", icon: BedDouble },
      { label: "Room Types & Images", href: "/room-types", icon: Images },
      { label: "Amenities", href: "/amenities", icon: Sparkles },
      { label: "Staff Management", href: "/users", icon: Users },
      { label: "Discounts", href: "/discounts", icon: Tag },
    ],
  },
  {
    label: "Integrations",
    items: [
      { label: "Channels", href: "/channels", icon: Link2 },
      { label: "SMS / WhatsApp", href: "/integrations/sms", icon: Bell },
      { label: "Payment Gateways", href: "/integrations/payments", icon: Plug },
    ],
  },
  {
    label: "Configuration",
    items: [
      { label: "Property Settings", href: "/settings", icon: Building2 },
      { label: "Invoice Settings", href: "/settings/invoices", icon: FileText },
      { label: "Pricing Rules", href: "/settings/pricing", icon: TrendingUp },
      { label: "Ledger Mapping", href: "/settings/ledger", icon: Wallet },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Reports", href: "/reports", icon: BarChart3 },
      { label: "Daily Report", href: "/reports/daily", icon: BarChart3 },
      { label: "Audit Logs", href: "/audit-logs", icon: ClipboardList },
      { label: "Announcements", href: "/announcements", icon: Megaphone },
      { label: "Notifications", href: "/notifications", icon: Bell },
      { label: "Documents & Storage", href: "/documents", icon: HardDrive },
      { label: "Automation Rules", href: "/automation", icon: Cog },
      { label: "Exception Handling", href: "/exceptions", icon: AlertTriangle },
    ],
  },
];

// ─── Admin Sidebar Component ─────────────────────────────────────────────────

interface AdminSidebarProps {
  userName?: string;
}

function AdminSidebar({ userName = "Admin" }: AdminSidebarProps) {
  const pathname = usePathname();

  async function handleLogout() {
    await nextAuthSignOut({ callbackUrl: "/login" });
  }

  return (
    <div className="flex h-full flex-col bg-[#2D3436]">
      {/* Logo */}
      <div className="flex h-20 items-center justify-center border-b border-white/10 px-4">
        <img src="/logo.svg" alt="The Rooms Logo" className="h-14 w-auto object-contain" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {ADMIN_NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/30">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px]",
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-white/60 hover:bg-white/5 hover:text-white/90"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                    {isActive && <ChevronRight className="ml-auto h-3 w-3 opacity-50" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-white/10 p-3">
        <div className="mb-3 flex items-center gap-3 rounded-lg px-3 py-2">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-[#E17055] text-xs text-white">
              {userName
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">{userName}</p>
            <p className="truncate text-[10px] text-white/40">Administrator</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/40 hover:bg-white/5 hover:text-white/70 transition-colors min-h-[44px]"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

// ─── Admin Layout with Mobile Support ────────────────────────────────────────

interface AdminLayoutProps {
  children: React.ReactNode;
  userName?: string;
}

export function AdminSidebarClient({ userName = "Admin" }: { userName?: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:shrink-0">
        <AdminSidebar userName={userName} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64">
            <AdminSidebar userName={userName} />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="flex h-14 items-center gap-3 border-b border-border bg-white px-4 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 hover:bg-accent transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center justify-center flex-1">
            <img src="/logo.svg" alt="The Rooms Logo" className="h-10 w-auto object-contain" />
          </div>
        </div>

        {/* Content renders via parent */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* This is a placeholder - actual content comes from parent layout */}
        </main>
      </div>
    </div>
  );
}

// ─── Export for use in layout ─────────────────────────────────────────────────
// Note: The actual layout uses AppShell which wraps this. 
// This component provides the sidebar structure for the admin portal.
