"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  DollarSign,
  TrendingUp,
  Users,
  Shield,
  Activity,
  FileText,
  Settings,
  Database,
  Mail,
  CreditCard,
  HardDrive,
  RefreshCw,
  Server,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Bell,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@the-rooms/ui";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@the-rooms/ui";

interface NavSection {
  label: string;
  items: NavItem[];
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Financial Overview", href: "/financial", icon: DollarSign },
      { label: "Analytics", href: "/analytics", icon: TrendingUp },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "Staff & Users", href: "/users", icon: Users },
      { label: "Expenses", href: "/expenses", icon: FileText },
      { label: "Audit Logs", href: "/audit-logs", icon: Shield },
    ],
  },
  {
    label: "Communications",
    items: [
      { label: "Alerts & Logs", href: "/communications", icon: Bell },
    ],
  },
  {
    label: "System",
    items: [
      { label: "System Health", href: "/system-health", icon: Server },
      { label: "Security & Compliance", href: "/security", icon: AlertTriangle },
      { label: "Backups", href: "/backups", icon: Database },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

interface SuperAdminSidebarProps {
  userName?: string;
  userEmail?: string;
}

export function SuperAdminSidebar({ userName = "Super Admin", userEmail }: SuperAdminSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-[#2D3436]">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E17055]">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-sm font-bold text-white truncate">The Rooms</p>
          <p className="text-[10px] text-white/50 truncate">Super Admin Portal</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV_SECTIONS.map((section) => (
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
            {userEmail && (
              <p className="truncate text-[10px] text-white/40">{userEmail}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/40 hover:bg-white/5 hover:text-white/70 transition-colors min-h-[44px]"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

interface SuperAdminLayoutProps {
  children: React.ReactNode;
  userName?: string;
  userEmail?: string;
}

export function SuperAdminLayout({ children, userName, userEmail }: SuperAdminLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:shrink-0">
        <SuperAdminSidebar userName={userName} userEmail={userEmail} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64">
            <SuperAdminSidebar userName={userName} userEmail={userEmail} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="flex h-14 items-center gap-3 border-b border-border bg-white px-4 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 hover:bg-accent transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E17055]">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="font-heading text-sm font-bold text-primary">The Rooms</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
