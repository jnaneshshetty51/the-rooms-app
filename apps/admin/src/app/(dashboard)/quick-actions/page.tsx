"use client";

// apps/admin/src/app/(dashboard)/quick-actions/page.tsx
// Quick Actions - Admin shortcuts for common operations

import Link from "next/link";
import {
    Users,
    BedDouble,
    CalendarPlus,
    CreditCard,
    FileText,
    AlertTriangle,
    Wrench,
    Sparkles,
    UserCog,
    RefreshCw,
    Settings,
    Ban,
} from "lucide-react";
import { PageHeader, Card, CardContent, CardHeader, CardTitle, Button } from "@the-rooms/ui";
import { cn } from "@the-rooms/ui";

interface QuickAction {
    title: string;
    description: string;
    icon: React.ElementType;
    href: string;
    color: string;
    adminOnly?: boolean;
}

const QUICK_ACTIONS: QuickAction[] = [
    {
        title: "New Walk-in Booking",
        description: "Create a new walk-in booking",
        icon: CalendarPlus,
        href: "/bookings/new",
        color: "bg-blue-500 hover:bg-blue-600",
    },
    {
        title: "Guest Search",
        description: "Find guest records and profiles",
        icon: UserCog,
        href: "/guests",
        color: "bg-purple-500 hover:bg-purple-600",
    },
    {
        title: "Room Board",
        description: "View all rooms and status",
        icon: BedDouble,
        href: "/room-board",
        color: "bg-green-500 hover:bg-green-600",
    },
    {
        title: "Process Payment",
        description: "Record a new payment",
        icon: CreditCard,
        href: "/payments",
        color: "bg-amber-500 hover:bg-amber-600",
    },
    {
        title: "Generate Invoice",
        description: "Create invoice for booking",
        icon: FileText,
        href: "/invoices",
        color: "bg-cyan-500 hover:bg-cyan-600",
    },
    {
        title: "Housekeeping",
        description: "Manage room cleaning",
        icon: Sparkles,
        href: "/housekeeping",
        color: "bg-emerald-500 hover:bg-emerald-600",
    },
    {
        title: "Report Issue",
        description: "Log maintenance issue",
        icon: Wrench,
        href: "/maintenance",
        color: "bg-orange-500 hover:bg-orange-600",
    },
    {
        title: "File Complaint",
        description: "Register guest complaint",
        icon: AlertTriangle,
        href: "/complaints",
        color: "bg-red-500 hover:bg-red-600",
    },
    {
        title: "Blacklist Guest",
        description: "Manage guest blacklist",
        icon: Ban,
        href: "/guests?filter=blacklist",
        color: "bg-gray-600 hover:bg-gray-700",
        adminOnly: true,
    },
    {
        title: "Cash Reconciliation",
        description: "Reconcile cash drawer",
        icon: RefreshCw,
        href: "/cash-management",
        color: "bg-teal-500 hover:bg-teal-600",
        adminOnly: true,
    },
    {
        title: "Staff Management",
        description: "Manage staff and roles",
        icon: Users,
        href: "/users",
        color: "bg-indigo-500 hover:bg-indigo-600",
        adminOnly: true,
    },
    {
        title: "Settings",
        description: "Configure system settings",
        icon: Settings,
        href: "/settings",
        color: "bg-slate-500 hover:bg-slate-600",
        adminOnly: true,
    },
];

export default function QuickActionsPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Quick Actions"
                description="Admin shortcuts for common operations"
            />

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {QUICK_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    return (
                        <Link key={action.href + action.title} href={action.href}>
                            <Card className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1">
                                <CardContent className="p-6">
                                    <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center mb-4", action.color)}>
                                        <Icon className="h-6 w-6 text-white" />
                                    </div>
                                    <h3 className="font-semibold text-gray-900">{action.title}</h3>
                                    <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
                                    {action.adminOnly && (
                                        <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                                            Admin Only
                                        </span>
                                    )}
                                </CardContent>
                            </Card>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
