"use client";

// apps/admin/src/app/(dashboard)/audit-logs/page.tsx
// Audit Logs - Track every action in the system with tamper-proof logs

import { useEffect, useState, useCallback } from "react";
import {
    Search,
    Filter,
    RefreshCw,
    Download,
    ClipboardList,
    User,
    Settings,
    UserCog,
    CalendarDays,
    CreditCard,
    FileText,
    Shield,
} from "lucide-react";
import {
    PageHeader,
    Button,
    Select,
    SelectTrigger,
    SelectContent,
    SelectValue,
    Input,
    Card,
    CardContent,
    Badge,
} from "@the-rooms/ui";
import { formatDate } from "@the-rooms/ui";
import { cn } from "@the-rooms/ui";

interface AuditLog {
    id: string;
    action: string;
    entityType: "BOOKING" | "ROOM" | "GUEST" | "PAYMENT" | "INVOICE" | "USER" | "SETTINGS" | "SYSTEM";
    entityId: string | null;
    description: string;
    userId: string;
    userName: string;
    userRole: string;
    ipAddress: string;
    userAgent: string | null;
    changes: { field: string; before: string | null; after: string | null }[] | null;
    createdAt: string;
}

interface AuditLogsResponse {
    logs: AuditLog[];
    total: number;
    pages: number;
    page: number;
    summary: {
        totalActions: number;
        byUser: { userId: string; userName: string; count: number }[];
        byAction: { action: string; count: number }[];
    };
}

const ENTITY_ICONS = {
    BOOKING: CalendarDays,
    ROOM: FileText,
    GUEST: UserCog,
    PAYMENT: CreditCard,
    INVOICE: FileText,
    USER: User,
    SETTINGS: Settings,
    SYSTEM: Shield,
};

const ACTION_COLORS: Record<string, string> = {
    CREATE: "bg-green-100 text-green-700",
    UPDATE: "bg-blue-100 text-blue-700",
    DELETE: "bg-red-100 text-red-700",
    VIEW: "bg-gray-100 text-gray-700",
    LOGIN: "bg-purple-100 text-purple-700",
    LOGOUT: "bg-gray-100 text-gray-700",
    OVERRIDE: "bg-orange-100 text-orange-700",
};

export default function AuditLogsPage() {
    const [data, setData] = useState<AuditLogsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        search: "",
        entityType: "ALL",
        action: "ALL",
        userId: "ALL",
        dateFrom: "",
        dateTo: "",
        page: 1,
    });

    const fetchAuditLogs = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (filters.search) params.set("search", filters.search);
        if (filters.entityType !== "ALL") params.set("entityType", filters.entityType);
        if (filters.action !== "ALL") params.set("action", filters.action);
        if (filters.userId !== "ALL") params.set("userId", filters.userId);
        if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
        if (filters.dateTo) params.set("dateTo", filters.dateTo);
        params.set("page", String(filters.page));

        const res = await fetch(`/api/audit-logs?${params}`);
        const d = await res.json();
        setData(d);
        setLoading(false);
    }, [filters]);

    useEffect(() => { fetchAuditLogs(); }, [fetchAuditLogs]);

    function updateFilter(key: string, value: string) {
        setFilters((f) => ({ ...f, [key]: value, page: 1 }));
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Audit Logs"
                description={`${data?.total ?? 0} total log entries`}
                actions={
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={fetchAuditLogs} disabled={loading}>
                            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                            Refresh
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => {/* TODO: Export */ }}>
                            <Download className="h-4 w-4 mr-2" /> Export
                        </Button>
                    </div>
                }
            />

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold">{data?.summary.totalActions ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Total Actions</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="md:col-span-2">
                    <CardContent className="pt-6">
                        <p className="text-xs text-muted-foreground mb-2">Top Users</p>
                        <div className="flex flex-wrap gap-2">
                            {data?.summary.byUser.slice(0, 5).map((u) => (
                                <Badge key={u.userId} variant="secondary">
                                    {u.userName} ({u.count})
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search logs..."
                        value={filters.search}
                        onChange={(e) => updateFilter("search", e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={filters.entityType} onValueChange={(v) => updateFilter("entityType", v)}>
                    <SelectTrigger className="w-[150px]">
                        <Filter className="h-4 w-4 mr-1.5 text-muted-foreground" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <option value="ALL">All Entities</option>
                        <option value="BOOKING">Booking</option>
                        <option value="ROOM">Room</option>
                        <option value="GUEST">Guest</option>
                        <option value="PAYMENT">Payment</option>
                        <option value="INVOICE">Invoice</option>
                        <option value="USER">User</option>
                        <option value="SETTINGS">Settings</option>
                        <option value="SYSTEM">System</option>
                    </SelectContent>
                </Select>
                <Select value={filters.action} onValueChange={(v) => updateFilter("action", v)}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Action" />
                    </SelectTrigger>
                    <SelectContent>
                        <option value="ALL">All Actions</option>
                        <option value="CREATE">Create</option>
                        <option value="UPDATE">Update</option>
                        <option value="DELETE">Delete</option>
                        <option value="OVERRIDE">Override</option>
                        <option value="LOGIN">Login</option>
                    </SelectContent>
                </Select>
                <Input
                    type="date"
                    className="w-[160px]"
                    value={filters.dateFrom}
                    onChange={(e) => updateFilter("dateFrom", e.target.value)}
                    placeholder="From date"
                />
                <Input
                    type="date"
                    className="w-[160px]"
                    value={filters.dateTo}
                    onChange={(e) => updateFilter("dateTo", e.target.value)}
                    placeholder="To date"
                />
            </div>

            {/* Logs List */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : data?.logs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            No audit logs found
                        </div>
                    ) : (
                        <div className="divide-y">
                            {data?.logs.map((log) => {
                                const EntityIcon = ENTITY_ICONS[log.entityType] || ClipboardList;
                                const actionColor = ACTION_COLORS[log.action] || "bg-gray-100 text-gray-700";

                                return (
                                    <div key={log.id} className="p-4 hover:bg-muted/50 transition-colors">
                                        <div className="flex items-start gap-4">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                <EntityIcon className="h-5 w-5 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", actionColor)}>
                                                        {log.action}
                                                    </span>
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                                                        {log.entityType}
                                                    </span>
                                                    <span className="text-sm font-medium">{log.description}</span>
                                                </div>
                                                {log.changes && log.changes.length > 0 && (
                                                    <div className="mt-2 text-xs bg-gray-50 rounded p-2 font-mono">
                                                        {log.changes.map((change, i) => (
                                                            <div key={i} className="flex gap-2">
                                                                <span className="text-red-600">{change.field}:</span>
                                                                <span className="line-through text-muted-foreground">{change.before || "(empty)"}</span>
                                                                <span>→</span>
                                                                <span className="text-green-600">{change.after || "(empty)"}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <User className="h-3 w-3" />
                                                        {log.userName}
                                                        <span className="ml-1 px-1 rounded bg-secondary text-secondary-foreground">
                                                            {log.userRole}
                                                        </span>
                                                    </span>
                                                    <span>{log.ipAddress}</span>
                                                    <span>{formatDate(log.createdAt, "long")}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination info */}
            {data && (
                <div className="text-sm text-muted-foreground text-center">
                    Page {data.page} of {data.pages} — {data.total} total logs
                </div>
            )}
        </div>
    );
}
