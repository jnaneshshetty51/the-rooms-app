"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, Bed, CalendarPlus, ClipboardList, Users, FileText, CreditCard, MessageSquare, BarChart3, LogOut, Menu, X, Bell, Shield, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@the-rooms/ui";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Room Board", href: "/rooms/board", icon: Bed },
  { name: "Walk-In Booking", href: "/bookings/new", icon: CalendarPlus },
  { name: "Online Bookings", href: "/bookings/online", icon: ClipboardList },
  { name: "Guest Search", href: "/guests", icon: Users },
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "Payments", href: "/payments", icon: CreditCard },
  { name: "Complaints", href: "/complaints", icon: MessageSquare },
  { name: "Night Audit", href: "/night-audit", icon: Shield },
  { name: "No-Shows", href: "/bookings/no-shows", icon: AlertTriangle },
  { name: "Stay Modifications", href: "/bookings/stay-modifications", icon: Clock },
  { name: "Daily Report", href: "/reports/daily", icon: BarChart3 },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={cn("fixed inset-y-0 left-0 z-50 w-72 bg-[#2D3436] transform transition-transform lg:translate-x-0 lg:static lg:z-auto", sidebarOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between px-6 border-b border-white/10">
            <Link href="/dashboard" className="flex items-center justify-center p-2">
              <img src="/logo.svg" alt="The Rooms Logo" className="h-12 w-auto object-contain" />
            </Link>
            <button className="lg:hidden text-white/60 hover:text-white" onClick={() => setSidebarOpen(false)}><X className="h-6 w-6" /></button>
          </div>
          <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link key={item.name} href={item.href} className={cn("flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors", isActive ? "bg-[#E17055] text-white" : "text-white/70 hover:bg-white/10 hover:text-white")}>
                  <item.icon className="h-5 w-5 shrink-0" />{item.name}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-white/10 p-4">
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors">
              <LogOut className="h-5 w-5 shrink-0" />Sign Out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
          <div className="flex items-center gap-4">
            <button className="lg:hidden text-gray-500 hover:text-gray-700" onClick={() => setSidebarOpen(true)}><Menu className="h-6 w-6" /></button>
            <h1 className="text-xl font-semibold text-gray-900">{navigation.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"))?.name ?? "Dashboard"}</h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100"><Bell className="h-5 w-5" /><span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#E17055]" /></button>
            <div className="h-8 w-8 rounded-full bg-[#E17055] flex items-center justify-center"><span className="text-white text-sm font-medium">FO</span></div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
