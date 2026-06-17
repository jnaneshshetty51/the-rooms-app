"use client";

// apps/admin/src/app/(dashboard)/quick-actions/page.tsx
// Quick Actions - Admin shortcuts for common operations with real-time stats

import { useEffect, useState, useCallback } from "react";
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
import { fetchQuickActionsStats, QuickActionsStats } from "@/lib/api";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface QuickAction {
    title: string;
    description: string;
    icon: React.ElementType;
    href: string;
    color: string;
    adminOnly?: boolean;
    badge?: number;
    badgeType?: "count" | "alert";
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
        badgeType: "count",
    },
    {
        title: "Report Issue",
        description: "Log maintenance issue",
        icon: Wrench,
        href: "/maintenance",
        color: "bg-orange-500 hover:bg-orange-600",
        badgeType: "count",
    },
    {
        title: "File Complaint",
        description: "Register guest complaint",
        icon: AlertTriangle,
        href: "/complaints",
        color: "bg-red-500 hover:bg-red-600",
        badgeType: "alert",
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuickActionsPage() {
    const [stats, setStats] = useState<QuickActionsStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // ─── Data Fetching ─────────────────────────────────────────────────────────

    const loadStats = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const { stats: fetchedStats } = await fetchQuickActionsStats();
            setStats(fetchedStats);
        } catch (error) {
            console.error("Failed to load quick actions stats:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    // ─── Computed Values ───────────────────────────────────────────────────────

    const getActionBadge = (action: QuickAction): number | undefined => {
        if (!stats) return undefined;

        switch (action.title) {
            case "Housekeeping":
                return stats.pendingHousekeeping > 0 ? stats.pendingHousekeeping : undefined;
            case "Report Issue":
                return stats.maintenanceIssues > 0 ? stats.maintenanceIssues : undefined;
            case "File Complaint":
                return stats.openComplaints > 0 ? stats.openComplaints : undefined;
            default:
                return undefined;
        }
    };

    const isAlertBadge = (action: QuickAction): boolean => {
        return action.badgeType === "alert";
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            <PageHeader
                title="Quick Actions"
                description="Admin shortcuts for common operations"
                actions={
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadStats(true)}
                        disabled={refreshing}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                }
            />

            {/* Today's Overview */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <StatCard
                        label="Check-ins"
                        value={stats.todayCheckIns}
                        icon={CalendarPlus}
                        color="text-blue-600"
                    />
                    <StatCard
                        label="Check-outs"
                        value={stats.todayCheckOuts}
                        icon={BedDouble}
                        color="text-green-600"
                    />
                    <StatCard
                        label="Pending Hkeeping"
                        value={stats.pendingHousekeeping}
                        icon={Sparkles}
                        color="text-emerald-600"
                        alert={stats.pendingHousekeeping > 5}
                    />
                    <StatCard
                        label="Maintenance"
                        value={stats.maintenanceIssues}
                        icon={Wrench}
                        color="text-orange-600"
                        alert={stats.maintenanceIssues > 0}
                    />
                    <StatCard
                        label="Complaints"
                        value={stats.openComplaints}
                        icon={AlertTriangle}
                        color="text-red-600"
                        alert={stats.openComplaints > 0}
                    />
                    <StatCard
                        label="Pending Payments"
                        value={stats.pendingPayments}
                        icon={CreditCard}
                        color="text-amber-600"
                        alert={stats.pendingPayments > 0}
                    />
                </div>
            )}

            {/* Loading State */}
            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="p-6">
                                <div className="h-12 w-12 rounded-lg bg-muted mb-4" />
                                <div className="h-5 w-32 bg-muted rounded mb-2" />
                                <div className="h-4 w-48 bg-muted rounded" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                /* Quick Actions Grid */
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {QUICK_ACTIONS.map((action) => {
                        const Icon = action.icon;
                        const badge = getActionBadge(action);
                        const isAlert = isAlertBadge(action);

                        return (
                            <Link key={action.href + action.title} href={action.href}>
                                <Card className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 h-full">
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", action.color)}>
                                                <Icon className="h-6 w-6 text-white" />
                                            </div>
                                            {badge !== undefined && (
                                                <span
                                                    className={cn(
                                                        "text-xs font-bold px-2 py-1 rounded-full",
                                                        isAlert
                                                            ? "bg-red-100 text-red-700 animate-pulse"
                                                            : "bg-secondary text-secondary-foreground"
                                                    )}
                                                >
                                                    {badge}
                                                </span>
                                            )}
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
            )}

            {/* Exception Alert */}
            {stats && stats.openExceptions > 0 && (
                <Card className="border-red-300 bg-red-50">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="h-6 w-6 text-red-600" />
                                <div>
                                    <p className="font-semibold text-red-900">
                                        {stats.openExceptions} Open Exception{stats.openExceptions > 1 ? "s" : ""}
                                    </p>
                                    <p className="text-sm text-red-700">
                                        Requires immediate attention
                                    </p>
                                </div>
                            </div>
                            <Link href="/exceptions">
                                <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-100">
                                    View Exceptions
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

// ─── StatCard Component ────────────────────────────────────────────────────────

interface StatCardProps {
    label: string;
    value: number;
    icon: React.ElementType;
    color?: string;
    alert?: boolean;
}

function StatCard({ label, value, icon: Icon, color, alert }: StatCardProps) {
    return (
        <Card className={cn(alert && "border-red-300 bg-red-50")}>
            <CardContent className="pt-4 px-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-2xl font-bold">{value}</p>
                        <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                    <Icon className={cn("h-6 w-6", color || "text-muted-foreground", alert && "text-red-600")} />
                </div>
            </CardContent>
        </Card>
    );
}
