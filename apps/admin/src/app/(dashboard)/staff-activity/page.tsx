"use client";

// apps/admin/src/app/(dashboard)/staff-activity/page.tsx
import { useEffect, useState, useCallback } from "react";
import { Search, Filter, Activity, User, Clock } from "lucide-react";
import {
    PageHeader,
    Input,
    Select,
    SelectTrigger,
    SelectContent,
    SelectValue,
    DataTable,
    type ColumnDef,
    Card,
    CardContent,
    Badge,
    StatCard,
} from "@the-rooms/ui";
import { formatDate } from "@the-rooms/ui";
import { fetchStaffActivity, type StaffActivity } from "@/lib/api";

const ACTION_TYPES = [
    "CREATE",
    "UPDATE",
    "DELETE",
    "LOGIN",
    "LOGOUT",
    "CHECK_IN",
    "CHECK_OUT",
];

const ENTITY_TYPES = [
    "BOOKING",
    "GUEST",
    "ROOM",
    "PAYMENT",
    "INVOICE",
    "USER",
];

export default function StaffActivityPage() {
    const [data, setData] = useState<{ activities: StaffActivity[]; total: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        search: "",
        staffId: "",
        action: "ALL",
        entityType: "ALL",
        fromDate: "",
        toDate: "",
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (filters.search) params.search = filters.search;
            if (filters.staffId) params.staffId = filters.staffId;
            if (filters.action !== "ALL") params.action = filters.action;
            if (filters.entityType !== "ALL") params.entityType = filters.entityType;
            if (filters.fromDate) params.fromDate = filters.fromDate;
            if (filters.toDate) params.toDate = filters.toDate;

            const result = await fetchStaffActivity(params);
            setData(result);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const columns: ColumnDef<StaffActivity, unknown>[] = [
        {
            accessorKey: "createdAt",
            header: "Time",
            cell: ({ row }) => (
                <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                        <p>{formatDate(row.original.createdAt, "short")}</p>
                        <p className="text-xs text-muted-foreground">
                            {new Date(row.original.createdAt).toLocaleTimeString("en", {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </p>
                    </div>
                </div>
            ),
        },
        {
            accessorKey: "staff.name",
            header: "Staff",
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        <User className="h-4 w-4" />
                    </div>
                    <span className="font-medium text-sm">{row.original.staff.name}</span>
                </div>
            ),
        },
        {
            accessorKey: "action",
            header: "Action",
            cell: ({ row }) => {
                const action = row.original.action;
                const variant =
                    action === "CREATE"
                        ? "success"
                        : action === "UPDATE"
                            ? "warning"
                            : action === "DELETE"
                                ? "destructive"
                                : "secondary";
                return (
                    <Badge variant={variant as "secondary"}>
                        {action}
                    </Badge>
                );
            },
        },
        {
            accessorKey: "entityType",
            header: "Entity",
            cell: ({ row }) => (
                <span className="text-sm">{row.original.entityType}</span>
            ),
        },
        {
            accessorKey: "entityId",
            header: "Entity ID",
            cell: ({ row }) => (
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {row.original.entityId.slice(0, 8)}...
                </code>
            ),
        },
        {
            accessorKey: "details",
            header: "Details",
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {row.original.details ?? "—"}
                </span>
            ),
        },
        {
            accessorKey: "ipAddress",
            header: "IP Address",
            cell: ({ row }) => (
                <span className="text-xs text-muted-foreground">
                    {row.original.ipAddress ?? "—"}
                </span>
            ),
        },
    ];

    function updateFilter(key: string, value: string) {
        setFilters((f) => ({ ...f, [key]: value }));
    }

    const stats = data?.activities ? {
        total: data.activities.length,
        creates: data.activities.filter((a) => a.action === "CREATE").length,
        updates: data.activities.filter((a) => a.action === "UPDATE").length,
        logins: data.activities.filter((a) => a.action === "LOGIN").length,
    } : { total: 0, creates: 0, updates: 0, logins: 0 };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Staff Activity Log"
                description="Track staff actions and system events"
            />

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-4">
                <StatCard label="Total Activities" value={stats.total} icon={Activity} />
                <StatCard label="Creates" value={stats.creates} icon={Activity} />
                <StatCard label="Updates" value={stats.updates} icon={Activity} />
                <StatCard label="Logins" value={stats.logins} icon={Activity} />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search activities..."
                        value={filters.search}
                        onChange={(e) => updateFilter("search", e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={filters.action} onValueChange={(v) => updateFilter("action", v)}>
                    <SelectTrigger className="w-[150px]">
                        <Filter className="h-4 w-4 mr-1.5 text-muted-foreground" />
                        <span>{filters.action === "ALL" ? "All Actions" : filters.action}</span>
                    </SelectTrigger>
                    <SelectContent>
                        <option value="ALL">All Actions</option>
                        {ACTION_TYPES.map((action) => (
                            <option key={action} value={action}>{action}</option>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={filters.entityType} onValueChange={(v) => updateFilter("entityType", v)}>
                    <SelectTrigger className="w-[150px]">
                        <span>{filters.entityType === "ALL" ? "All Entities" : filters.entityType}</span>
                    </SelectTrigger>
                    <SelectContent>
                        <option value="ALL">All Entities</option>
                        {ENTITY_TYPES.map((type) => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </SelectContent>
                </Select>
                <Input
                    type="date"
                    className="w-[160px]"
                    value={filters.fromDate}
                    onChange={(e) => updateFilter("fromDate", e.target.value)}
                    placeholder="From date"
                />
                <Input
                    type="date"
                    className="w-[160px]"
                    value={filters.toDate}
                    onChange={(e) => updateFilter("toDate", e.target.value)}
                    placeholder="To date"
                />
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={data?.activities ?? []}
                isLoading={loading}
                pageSize={20}
                filterPlaceholder="Filter activities..."
            />

            {data && (
                <div className="text-sm text-muted-foreground text-center">
                    {data.total} activity records
                </div>
            )}
        </div>
    );
}