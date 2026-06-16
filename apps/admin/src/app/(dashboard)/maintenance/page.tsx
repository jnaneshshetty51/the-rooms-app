"use client";

// apps/admin/src/app/(dashboard)/maintenance/page.tsx
import { useEffect, useState, useCallback } from "react";
import { Wrench, Plus, Eye, CheckCircle, XCircle, Filter, Search } from "lucide-react";
import {
    PageHeader,
    Button,
    StatusBadge,
    Select,
    SelectTrigger,
    SelectContent,
    SelectValue,
    Input,
    DataTable,
    type ColumnDef,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    StatCard,
} from "@the-rooms/ui";
import { formatDate } from "@the-rooms/ui";
import {
    fetchMaintenance,
    updateMaintenanceStatus,
    type MaintenanceRecord,
} from "@/lib/api";

const PRIORITY_COLORS = {
    LOW: "secondary",
    MEDIUM: "warning",
    HIGH: "destructive",
    URGENT: "destructive",
} as const;

const STATUS_COLORS = {
    REPORTED: "warning",
    IN_PROGRESS: "booked",
    COMPLETED: "success",
    CANCELLED: "secondary",
} as const;

export default function MaintenancePage() {
    const [data, setData] = useState<{ records: MaintenanceRecord[]; total: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        search: "",
        status: "ALL",
        priority: "ALL",
        roomId: "",
        fromDate: "",
        toDate: "",
    });
    const [showCreateModal, setShowCreateModal] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (filters.status !== "ALL") params.status = filters.status;
            if (filters.priority !== "ALL") params.priority = filters.priority;
            if (filters.roomId) params.roomId = filters.roomId;
            if (filters.fromDate) params.fromDate = filters.fromDate;
            if (filters.toDate) params.toDate = filters.toDate;

            const result = await fetchMaintenance(params);
            let filtered = result.records;
            if (filters.search) {
                const q = filters.search.toLowerCase();
                filtered = filtered.filter(
                    (r) =>
                        r.room.roomNumber.toLowerCase().includes(q) ||
                        r.type.toLowerCase().includes(q) ||
                        r.description?.toLowerCase().includes(q)
                );
            }
            setData({ records: filtered, total: filtered.length });
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const columns: ColumnDef<MaintenanceRecord, unknown>[] = [
        {
            accessorKey: "room.roomNumber",
            header: "Room",
            cell: ({ row }) => (
                <div>
                    <p className="font-semibold">Room {row.original.room.roomNumber}</p>
                    <p className="text-xs text-muted-foreground">{row.original.room.type}</p>
                </div>
            ),
        },
        {
            accessorKey: "type",
            header: "Type",
            cell: ({ row }) => (
                <span className="capitalize">{row.original.type.toLowerCase().replace("_", " ")}</span>
            ),
        },
        {
            accessorKey: "priority",
            header: "Priority",
            cell: ({ row }) => (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${row.original.priority === "URGENT" ? "bg-red-100 text-red-800" :
                        row.original.priority === "HIGH" ? "bg-orange-100 text-orange-800" :
                            row.original.priority === "MEDIUM" ? "bg-yellow-100 text-yellow-800" :
                                "bg-gray-100 text-gray-800"
                    }`}>
                    {row.original.priority}
                </span>
            ),
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => (
                <StatusBadge
                    status={row.original.status === "IN_PROGRESS" ? "CHECKED_IN" : row.original.status === "COMPLETED" ? "CHECKED_OUT" : "PENDING"}
                    type="booking"
                />
            ),
        },
        {
            accessorKey: "reportedAt",
            header: "Reported",
            cell: ({ row }) => (
                <span className="text-sm">{formatDate(row.original.reportedAt, "short")}</span>
            ),
        },
        {
            accessorKey: "reportedBy.name",
            header: "Reported By",
            cell: ({ row }) => (
                <span className="text-sm">{row.original.reportedBy?.name ?? "System"}</span>
            ),
        },
        {
            id: "actions",
            header: "",
            cell: ({ row }) => (
                <div className="flex items-center gap-1 justify-end">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleView(row.original)}
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                    {row.original.status === "REPORTED" && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleStatusUpdate(row.original.id, "IN_PROGRESS")}
                        >
                            <Wrench className="h-4 w-4" />
                        </Button>
                    )}
                    {(row.original.status === "REPORTED" || row.original.status === "IN_PROGRESS") && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-success hover:text-success"
                            onClick={() => handleStatusUpdate(row.original.id, "COMPLETED")}
                        >
                            <CheckCircle className="h-4 w-4" />
                        </Button>
                    )}
                    {row.original.status !== "COMPLETED" && row.original.status !== "CANCELLED" && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleStatusUpdate(row.original.id, "CANCELLED")}
                        >
                            <XCircle className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    async function handleStatusUpdate(id: string, status: string) {
        if (status === "CANCELLED") {
            if (!confirm("Cancel this maintenance record?")) return;
        }
        await updateMaintenanceStatus(id, status);
        fetchData();
    }

    function handleView(record: MaintenanceRecord) {
        alert(`View maintenance record: ${record.id}\n${record.description}`);
    }

    function updateFilter(key: string, value: string) {
        setFilters((f) => ({ ...f, [key]: value }));
    }

    const stats = data ? {
        total: data.records.length,
        reported: data.records.filter((r) => r.status === "REPORTED").length,
        inProgress: data.records.filter((r) => r.status === "IN_PROGRESS").length,
        completed: data.records.filter((r) => r.status === "COMPLETED").length,
    } : { total: 0, reported: 0, inProgress: 0, completed: 0 };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Maintenance Management"
                description="Track and manage room maintenance requests"
                actions={
                    <Button onClick={() => setShowCreateModal(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Report Issue
                    </Button>
                }
            />

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total Issues" value={stats.total} icon={Wrench} />
                <StatCard
                    label="Reported"
                    value={stats.reported}
                    icon={Wrench}
                    className={stats.reported > 0 ? "border-l-4 border-l-warning" : ""}
                />
                <StatCard label="In Progress" value={stats.inProgress} icon={Wrench} />
                <StatCard
                    label="Completed"
                    value={stats.completed}
                    icon={CheckCircle}
                />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by room, type, description..."
                        value={filters.search}
                        onChange={(e) => updateFilter("search", e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={filters.status} onValueChange={(v) => updateFilter("status", v)}>
                    <SelectTrigger className="w-[150px]">
                        <Filter className="h-4 w-4 mr-1.5 text-muted-foreground" />
                        <span>{filters.status === "ALL" ? "All Status" : filters.status.replace("_", " ")}</span>
                    </SelectTrigger>
                    <SelectContent>
                        <option value="ALL">All Status</option>
                        <option value="REPORTED">Reported</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                    </SelectContent>
                </Select>
                <Select value={filters.priority} onValueChange={(v) => updateFilter("priority", v)}>
                    <SelectTrigger className="w-[140px]">
                        <span>{filters.priority === "ALL" ? "All Priority" : filters.priority}</span>
                    </SelectTrigger>
                    <SelectContent>
                        <option value="ALL">All Priority</option>
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
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
                data={data?.records ?? []}
                isLoading={loading}
                pageSize={20}
                filterPlaceholder="Filter maintenance records..."
            />

            {data && (
                <div className="text-sm text-muted-foreground text-center">
                    {data.total} total maintenance records
                </div>
            )}
        </div>
    );
}
