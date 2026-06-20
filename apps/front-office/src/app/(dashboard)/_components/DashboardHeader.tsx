"use client";

// apps/front-office/src/app/(dashboard)/_components/DashboardHeader.tsx
"use client";

import { usePathname } from "next/navigation";
import { Bell, Menu } from "lucide-react";
import { cn } from "@the-rooms/ui";

const navigation = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Room Board", href: "/rooms/board" },
    { name: "Walk-In Booking", href: "/bookings/new" },
    { name: "Online Bookings", href: "/bookings/online" },
    { name: "Guest Search", href: "/guests" },
    { name: "Documents", href: "/documents" },
    { name: "Payments", href: "/payments" },
    { name: "Complaints", href: "/complaints" },
    { name: "Night Audit", href: "/night-audit" },
    { name: "No-Shows", href: "/bookings/no-shows" },
    { name: "Stay Modifications", href: "/bookings/stay-modifications" },
    { name: "Lost & Found", href: "/lost-found" },
    { name: "Wake-up Calls", href: "/wakeup-calls" },
    { name: "Taxi Bookings", href: "/taxi-bookings" },
    { name: "Discount Approvals", href: "/discount-approvals" },
    { name: "Price Overrides", href: "/price-overrides" },
    { name: "Daily Report", href: "/reports/daily" },
];

interface DashboardHeaderProps {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
}

export function DashboardHeader({ sidebarOpen, setSidebarOpen }: DashboardHeaderProps) {
    const pathname = usePathname();

    const currentPage = navigation.find(
        (n) => pathname === n.href || pathname.startsWith(n.href + "/")
    )?.name ?? "Dashboard";

    return (
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
            <div className="flex items-center gap-4">
                <button
                    className="lg:hidden text-gray-500 hover:text-gray-700"
                    onClick={() => setSidebarOpen(true)}
                >
                    <Menu className="h-6 w-6" />
                </button>
                <h1 className="text-xl font-semibold text-gray-900">{currentPage}</h1>
            </div>
            <div className="flex items-center gap-4">
                <button className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-secondary" />
                </button>
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-white text-sm font-medium">FO</span>
                </div>
            </div>
        </header>
    );
}
