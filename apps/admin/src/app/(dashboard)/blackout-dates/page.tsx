"use client";

// apps/admin/src/app/(dashboard)/blackout-dates/page.tsx
import { useEffect, useState, useCallback } from "react";
import { Plus, Edit, Trash2, Calendar, Filter, Search } from "lucide-react";
import {
    PageHeader,
    Button,
    Card,
    CardContent,
    Badge,
    Input,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Label,
    Select,
    SelectTrigger,
    SelectContent,
    SelectValue,
    DataTable,
    type ColumnDef,
    StatCard,
} from "@the-rooms/ui";
import { formatDate } from "@the-rooms/ui";
import {
    fetchBlackoutDates,
    createBlackoutDate,
    updateBlackoutDate,
    deleteBlackoutDate,
    type BlackoutDate,
} from "@/lib/api";

export default function BlackoutDatesPage() {
    const [data, setData] = useState<{ dates: BlackoutDate[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        search: "",
        roomTypeId: "ALL",
        source: "ALL",
        fromDate: "",
        toDate: "",
    });
    const [showModal, setShowModal] = useState(false);
    const [editingDate, setEditingDate] = useState<BlackoutDate | null>(null);
    const [formData, setFormData] = useState({
        startDate: "",
        endDate: "",
        roomTypeId: "",
        reason: "",
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (filters.roomTypeId !== "ALL") params.roomTypeId = filters.roomTypeId;
            if (filters.source !== "ALL") params.source = filters.source;
            if (filters.fromDate) params.fromDate = filters.fromDate;
            if (filters.toDate) params.toDate = filters.toDate;

            const result = await fetchBlackoutDates(params);
            let filtered = result.dates || [];
            if (filters.search) {
                const q = filters.search.toLowerCase();
                filtered = filtered.filter(
                    (d) =>
                        d.reason.toLowerCase().includes(q) ||
                        d.roomType?.name?.toLowerCase().includes(q)
                );
            }
            setData({ dates: filtered });
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSubmit = async () => {
        const dataToSend = {
            ...formData,
            startDate: formData.startDate,
            endDate: formData.endDate,
        };

        if (editingDate) {
            await updateBlackoutDate(editingDate.id, dataToSend);
        } else {
            await createBlackoutDate(dataToSend);
        }
        setShowModal(false);
        setEditingDate(null);
        setFormData({ startDate: "", endDate: "", roomTypeId: "", reason: "" });
        fetchData();
    };

    const handleEdit = (date: BlackoutDate) => {
        setEditingDate(date);
        setFormData({
            startDate: date.startDate.split("T")[0],
            endDate: date.endDate.split("T")[0],
            roomTypeId: date.roomTypeId ?? "",
            reason: date.reason,
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this blackout date?")) return;
        await deleteBlackoutDate(id);
        fetchData();
    };

    const columns: ColumnDef<BlackoutDate, unknown>[] = [
        {
            accessorKey: "startDate",
            header: "Start Date",
            cell: ({ row }) => (
                <span className="text-sm">{formatDate(row.original.startDate, "short")}</span>
            ),
        },
        {
            accessorKey: "endDate",
            header: "End Date",
            cell: ({ row }) => (
                <span className="text-sm">{formatDate(row.original.endDate, "short")}</span>
            ),
        },
        {
            accessorKey: "roomType.name",
            header: "Room Type",
            cell: ({ row }) => (
                <span>{row.original.roomType?.name ?? "All Room Types"}</span>
            ),
        },
        {
            accessorKey: "reason",
            header: "Reason",
            cell: ({ row }) => (
                <span className="text-sm">{row.original.reason}</span>
            ),
        },
        {
            accessorKey: "source",
            header: "Source",
            cell: ({ row }) => (
                <Badge variant={row.original.source ? "secondary" : "outline"}>
                    {row.original.source ?? "Manual"}
                </Badge>
            ),
        },
        {
            accessorKey: "createdAt",
            header: "Created",
            cell: ({ row }) => (
                <span className="text-xs text-muted-foreground">
                    {formatDate(row.original.createdAt, "short")}
                </span>
            ),
        },
        {
            id: "actions",
            header: "",
            cell: ({ row }) => (
                <div className="flex items-center gap-1 justify-end">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(row.original.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    function updateFilter(key: string, value: string) {
        setFilters((f) => ({ ...f, [key]: value }));
    }

    const stats = data?.dates ? {
        total: data.dates.length,
        active: data.dates.filter((d) => new Date(d.startDate) <= new Date() && new Date(d.endDate) >= new Date()).length,
        future: data.dates.filter((d) => new Date(d.startDate) > new Date()).length,
    } : { total: 0, active: 0, future: 0 };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Blackout Dates"
                description="Manage dates when bookings are restricted"
                actions={
                    <Button onClick={() => setShowModal(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Blackout
                    </Button>
                }
            />

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Total Blackout Periods" value={stats.total} icon={Calendar} />
                <StatCard
                    label="Currently Active"
                    value={stats.active}
                    icon={Calendar}
                    className={stats.active > 0 ? "border-l-4 border-l-destructive" : ""}
                />
                <StatCard label="Upcoming" value={stats.future} icon={Calendar} />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by reason..."
                        value={filters.search}
                        onChange={(e) => updateFilter("search", e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={filters.roomTypeId} onValueChange={(v) => updateFilter("roomTypeId", v)}>
                    <SelectTrigger className="w-[180px]">
                        <Filter className="h-4 w-4 mr-1.5 text-muted-foreground" />
                        <span>{filters.roomTypeId === "ALL" ? "All Room Types" : filters.roomTypeId}</span>
                    </SelectTrigger>
                    <SelectContent>
                        <option value="ALL">All Room Types</option>
                    </SelectContent>
                </Select>
                <Select value={filters.source} onValueChange={(v) => updateFilter("source", v)}>
                    <SelectTrigger className="w-[150px]">
                        <span>{filters.source === "ALL" ? "All Sources" : filters.source}</span>
                    </SelectTrigger>
                    <SelectContent>
                        <option value="ALL">All Sources</option>
                        <option value="MANUAL">Manual</option>
                        <option value="OTA">OTA</option>
                        <option value="CHANNEL">Channel</option>
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
                data={data?.dates ?? []}
                isLoading={loading}
                pageSize={20}
                filterPlaceholder="Filter blackout dates..."
            />

            {/* Create/Edit Modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingDate ? "Edit Blackout Date" : "Add Blackout Date"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData((f) => ({ ...f, startDate: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>End Date</Label>
                                <Input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData((f) => ({ ...f, endDate: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Room Type (Optional)</Label>
                            <Select
                                value={formData.roomTypeId}
                                onValueChange={(v) => setFormData((f) => ({ ...f, roomTypeId: v }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Room Types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <option value="">All Room Types</option>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Leave empty to block all room types
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Reason</Label>
                            <Input
                                value={formData.reason}
                                onChange={(e) => setFormData((f) => ({ ...f, reason: e.target.value }))}
                                placeholder="e.g., Annual Maintenance, Holiday Closure"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit}>
                            {editingDate ? "Update" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}