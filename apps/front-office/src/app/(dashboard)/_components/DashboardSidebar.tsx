"use client";

// apps/front-office/src/app/(dashboard)/_components/DashboardSidebar.tsx
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, Bed, CalendarPlus, ClipboardList, Users, FileText, CreditCard, MessageSquare, BarChart3, LogOut, Shield, AlertTriangle, Clock, Search, Car, Percent, DollarSign } from "lucide-react";
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
    // ─── Operations ─────────────────────────────────────────────────────────
    { name: "Lost & Found", href: "/lost-found", icon: Search },
    { name: "Wake-up Calls", href: "/wakeup-calls", icon: AlertTriangle },
    { name: "Taxi Bookings", href: "/taxi-bookings", icon: Car },
    { name: "Discount Approvals", href: "/discount-approvals", icon: Percent },
    { name: "Price Overrides", href: "/price-overrides", icon: DollarSign },
    { name: "Daily Report", href: "/reports/daily", icon: BarChart3 },
];

interface DashboardSidebarProps {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
}

export function DashboardSidebar({ sidebarOpen, setSidebarOpen }: DashboardSidebarProps) {
    const pathname = usePathname();

    return (
        <>
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 w-72 bg-primary transform transition-transform lg:translate-x-0 lg:static lg:z-auto",
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex h-full flex-col">
                    <div className="flex h-16 items-center justify-between px-6 border-b border-white/10">
                        <Link href="/dashboard" className="flex items-center justify-center p-2">
                            <img src="/logo.svg" alt="The Rooms Logo" className="h-12 w-auto object-contain" />
                        </Link>
                        <button
                            className="lg:hidden text-white/60 hover:text-white"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <span className="sr-only">Close sidebar</span>
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-secondary text-white"
                                            : "text-white/70 hover:bg-white/10 hover:text-white"
                                    )}
                                >
                                    <item.icon className="h-5 w-5 shrink-0" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                    <div className="border-t border-white/10 p-4">
                        <button
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                        >
                            <LogOut className="h-5 w-5 shrink-0" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
