"use client";

// apps/admin/src/app/(dashboard)/notifications/logs/page.tsx
import { useEffect, useState, useCallback } from "react";
import { Search, Filter, Mail, MessageSquare, Bell, CheckCircle, XCircle, Clock } from "lucide-react";
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
import { fetchNotificationLogs, type NotificationLog } from "@/lib/api";

export default function NotificationLogsPage() {
    const [data, setData] = useState<{ logs: NotificationLog[]; total: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        search: "",
        status: "ALL",
        fromDate: "",
        toDate: "",
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (filters.status !== "ALL") params.status = filters.status;
            if (filters.search) params.search = filters.search;
            if (filters.fromDate) params.fromDate = filters.fromDate;
            if (filters.toDate) params.toDate = filters.toDate;

            const result = await fetchNotificationLogs(params);
            setData(result);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    function updateFilter(key: string, value: string) {
        setFilters((f) => ({ ...f, [key]: value }));
    }

    const columns: ColumnDef<NotificationLog, unknown>[] = [
        {
            accessorKey: "template.name",
            header: "Template",
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    {row.original.channel === "EMAIL" ? (
                        <Mail className="h-4 w-4 text-muted-foreground" />
                    ) : row.original.channel === "SMS" ? (
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <Bell className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium text-sm">{row.original.template.name}</span>
                </div>
            ),
        },
        {
            accessorKey: "recipient",
            header: "Recipient",
            cell: ({ row }) => (
                <span className="text-sm font-mono">{row.original.recipient}</span>
            ),
        },
        {
            accessorKey: "channel",
            header: "Channel",
            cell: ({ row }) => (
                <Badge variant="secondary">{row.original.channel}</Badge>
            ),
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const status = row.original.status;
                const variant =
                    status === "DELIVERED" ? "success" :
                        status === "SENT" ? "secondary" :
                            status === "FAILED" ? "destructive" :
                                "warning";
                const Icon = status === "DELIVERED" ? CheckCircle :
                    status === "FAILED" ? XCircle : Clock;
                return (
                    <Badge variant={variant} className="flex items-center gap-1 w-fit">
                        <Icon className="h-3 w-3" />
                        {status}
                    </Badge>
                );
            },
        },
        {
            accessorKey: "sentAt",
            header: "Sent",
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                    {row.original.sentAt
                        ? `${formatDate(row.original.sentAt, "short")} ${new Date(row.original.sentAt).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}`
                        : "—"}
                </span>
            ),
        },
        {
            accessorKey: "deliveredAt",
            header: "Delivered",
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                    {row.original.deliveredAt
                        ? `${formatDate(row.original.deliveredAt, "short")} ${new Date(row.original.deliveredAt).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}`
                        : "—"}
                </span>
            ),
        },
        {
            accessorKey: "errorMessage",
            header: "Error",
            cell: ({ row }) => (
                <span className="text-sm text-destructive">
                    {row.original.errorMessage ?? "—"}
                </span>
            ),
        },
    ];

    const stats = data?.logs ? {
        total: data.logs.length,
        sent: data.logs.filter((l) => l.status === "SENT").length,
        delivered: data.logs.filter((l) => l.status === "DELIVERED").length,
        failed: data.logs.filter((l) => l.status === "FAILED").length,
    } : { total: 0, sent: 0, delivered: 0, failed: 0 };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Notification Logs"
                description="View notification history and delivery status"
            />

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-4">
                <StatCard label="Total" value={stats.total} icon={Bell} />
                <StatCard label="Sent" value={stats.sent} icon={CheckCircle} />
                <StatCard label="Delivered" value={stats.delivered} icon={CheckCircle} />
                <StatCard
                    label="Failed"
                    value={stats.failed}
                    icon={XCircle}
                    className={stats.failed > 0 ? "border-l-4 border-l-destructive" : ""}
                />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by recipient..."
                        value={filters.search}
                        onChange={(e) => updateFilter("search", e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={filters.status} onValueChange={(v) => updateFilter("status", v)}>
                    <SelectTrigger className="w-[150px]">
                        <Filter className="h-4 w-4 mr-1.5 text-muted-foreground" />
                        <span>{filters.status === "ALL" ? "All Status" : filters.status}</span>
                    </SelectTrigger>
                    <SelectContent>
                        <option value="ALL">All Status</option>
                        <option value="PENDING">Pending</option>
                        <option value="SENT">Sent</option>
                        <option value="DELIVERED">Delivered</option>
                        <option value="FAILED">Failed</option>
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
                data={data?.logs ?? []}
                isLoading={loading}
                pageSize={20}
                filterPlaceholder="Filter logs..."
            />

            {data && (
                <div className="text-sm text-muted-foreground text-center">
                    {data.total} notification logs
                </div>
            )}
        </div>
    );
}