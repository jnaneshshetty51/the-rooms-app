"use client";

// apps/admin/src/app/(dashboard)/inventory/page.tsx
import { useEffect, useState, useCallback } from "react";
import { Search, Filter, Plus, Edit } from "lucide-react";
import {
    PageHeader,
    Button,
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
    fetchInventory,
    updateInventory,
    type InventoryRecord,
} from "@/lib/api";

export default function InventoryPage() {
    const [data, setData] = useState<{ records: InventoryRecord[]; total: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        roomTypeId: "ALL",
        fromDate: "",
        toDate: "",
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (filters.roomTypeId !== "ALL") params.roomTypeId = filters.roomTypeId;
            if (filters.fromDate) params.fromDate = filters.fromDate;
            if (filters.toDate) params.toDate = filters.toDate;

            const result = await fetchInventory(params);
            setData(result);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const columns: ColumnDef<InventoryRecord, unknown>[] = [
        {
            accessorKey: "roomType.name",
            header: "Room Type",
            cell: ({ row }) => (
                <div>
                    <p className="font-semibold">{row.original.roomType.name}</p>
                    <p className="text-xs text-muted-foreground">
                        Base: ₹{Number(row.original.roomType.basePrice).toLocaleString()}
                    </p>
                </div>
            ),
        },
        {
            accessorKey: "date",
            header: "Date",
            cell: ({ row }) => (
                <span className="text-sm">{formatDate(row.original.date, "short")}</span>
            ),
        },
        {
            accessorKey: "totalRooms",
            header: "Total",
            cell: ({ row }) => <span className="font-semibold">{row.original.totalRooms}</span>,
        },
        {
            accessorKey: "availableRooms",
            header: "Available",
            cell: ({ row }) => (
                <span className={row.original.availableRooms > 0 ? "text-success font-medium" : "text-muted-foreground"}>
                    {row.original.availableRooms}
                </span>
            ),
        },
        {
            accessorKey: "bookedRooms",
            header: "Booked",
            cell: ({ row }) => (
                <span className="text-primary font-medium">{row.original.bookedRooms}</span>
            ),
        },
        {
            accessorKey: "blockedRooms",
            header: "Blocked",
            cell: ({ row }) => (
                <span className="text-warning">{row.original.blockedRooms}</span>
            ),
        },
        {
            accessorKey: "maintenanceRooms",
            header: "Maintenance",
            cell: ({ row }) => (
                <span className="text-destructive">{row.original.maintenanceRooms}</span>
            ),
        },
        {
            id: "actions",
            header: "",
            cell: ({ row }) => (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEdit(row.original)}
                >
                    <Edit className="h-4 w-4" />
                </Button>
            ),
        },
    ];

    function handleEdit(record: InventoryRecord) {
        const newAvailable = prompt("Enter new available rooms count:", String(record.availableRooms));
        if (newAvailable !== null) {
            updateInventory(record.id, { availableRooms: parseInt(newAvailable, 10) });
            fetchData();
        }
    }

    function updateFilter(key: string, value: string) {
        setFilters((f) => ({ ...f, [key]: value }));
    }

    const stats = data?.records ? {
        totalRooms: data.records.reduce((sum, r) => sum + r.totalRooms, 0),
        totalAvailable: data.records.reduce((sum, r) => sum + r.availableRooms, 0),
        totalBooked: data.records.reduce((sum, r) => sum + r.bookedRooms, 0),
    } : { totalRooms: 0, totalAvailable: 0, totalBooked: 0 };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Room Inventory"
                description="Manage room type inventory and availability"
                actions={
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Adjust Inventory
                    </Button>
                }
            />

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Total Rooms" value={stats.totalRooms} />
                <StatCard label="Available" value={stats.totalAvailable} />
                <StatCard label="Booked" value={stats.totalBooked} />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <Select value={filters.roomTypeId} onValueChange={(v) => updateFilter("roomTypeId", v)}>
                    <SelectTrigger className="w-[180px]">
                        <Filter className="h-4 w-4 mr-1.5 text-muted-foreground" />
                        <span>{filters.roomTypeId === "ALL" ? "All Room Types" : filters.roomTypeId}</span>
                    </SelectTrigger>
                    <SelectContent>
                        <option value="ALL">All Room Types</option>
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
                filterPlaceholder="Filter inventory..."
            />

            {data && (
                <div className="text-sm text-muted-foreground text-center">
                    {data.total} inventory records
                </div>
            )}
        </div>
    );
}