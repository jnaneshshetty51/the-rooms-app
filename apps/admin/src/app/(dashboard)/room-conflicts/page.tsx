"use client";

// apps/admin/src/app/(dashboard)/room-conflicts/page.tsx
import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, CheckCircle, Eye, Calendar, Search } from "lucide-react";
import {
    PageHeader,
    Button,
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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Label,
} from "@the-rooms/ui";
import { formatDate } from "@the-rooms/ui";
import {
    fetchRoomConflicts,
    resolveRoomConflict,
    holdRoom,
    type RoomConflict,
} from "@/lib/api";

export default function RoomConflictsPage() {
    const [data, setData] = useState<{ conflicts: RoomConflict[]; total: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: "ALL",
        date: "",
    });
    const [selectedConflict, setSelectedConflict] = useState<RoomConflict | null>(null);
    const [resolution, setResolution] = useState("");

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (filters.status !== "ALL") params.status = filters.status;
            if (filters.date) params.date = filters.date;

            const result = await fetchRoomConflicts(params);
            setData(result);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleResolve = async () => {
        if (!selectedConflict || !resolution) return;
        await resolveRoomConflict(selectedConflict.id, resolution);
        setSelectedConflict(null);
        setResolution("");
        fetchData();
    };

    const handleHoldRoom = async () => {
        if (!selectedConflict) return;
        const reason = prompt("Enter reason for room hold:");
        if (reason) {
            await holdRoom(selectedConflict.roomId, selectedConflict.date, reason);
            setSelectedConflict(null);
            fetchData();
        }
    };

    const columns: ColumnDef<RoomConflict, unknown>[] = [
        {
            accessorKey: "room.roomNumber",
            header: "Room",
            cell: ({ row }) => (
                <span className="font-semibold">Room {row.original.room.roomNumber}</span>
            ),
        },
        {
            accessorKey: "date",
            header: "Date",
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {formatDate(row.original.date, "short")}
                </div>
            ),
        },
        {
            accessorKey: "conflictType",
            header: "Type",
            cell: ({ row }) => (
                <Badge variant={
                    row.original.conflictType === "DOUBLE_BOOKING" ? "destructive" :
                        row.original.conflictType === "MAINTENANCE_BLOCK" ? "warning" :
                            "secondary"
                }>
                    {row.original.conflictType.replace("_", " ")}
                </Badge>
            ),
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => (
                <Badge variant={
                    row.original.status === "DETECTED" ? "destructive" :
                        row.original.status === "RESOLVED" ? "success" :
                            "secondary"
                }>
                    {row.original.status}
                </Badge>
            ),
        },
        {
            accessorKey: "booking.bookingNumber",
            header: "Booking",
            cell: ({ row }) => (
                row.original.booking ? (
                    <div>
                        <code className="text-sm font-semibold">{row.original.booking.bookingNumber}</code>
                        <p className="text-xs text-muted-foreground">{row.original.booking.guest.name}</p>
                    </div>
                ) : (
                    <span className="text-muted-foreground">—</span>
                )
            ),
        },
        {
            accessorKey: "createdAt",
            header: "Detected",
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                    {formatDate(row.original.createdAt, "short")}
                </span>
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
                        onClick={() => setSelectedConflict(row.original)}
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                    {row.original.status !== "RESOLVED" && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-success hover:text-success"
                            onClick={() => {
                                setSelectedConflict(row.original);
                                setResolution("Resolved by admin");
                            }}
                        >
                            <CheckCircle className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    function updateFilter(key: string, value: string) {
        setFilters((f) => ({ ...f, [key]: value }));
    }

    const stats = data?.conflicts ? {
        total: data.conflicts.length,
        detected: data.conflicts.filter((c) => c.status === "DETECTED").length,
        resolved: data.conflicts.filter((c) => c.status === "RESOLVED").length,
        ignored: data.conflicts.filter((c) => c.status === "IGNORED").length,
    } : { total: 0, detected: 0, resolved: 0, ignored: 0 };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Room Conflicts"
                description="Detect and resolve room booking conflicts"
            />

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-4">
                <StatCard
                    label="Total Conflicts"
                    value={stats.total}
                    icon={AlertTriangle}
                    className={stats.detected > 0 ? "border-l-4 border-l-destructive" : ""}
                />
                <StatCard label="Detected" value={stats.detected} icon={AlertTriangle} />
                <StatCard label="Resolved" value={stats.resolved} icon={CheckCircle} />
                <StatCard label="Ignored" value={stats.ignored} icon={CheckCircle} />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <Select value={filters.status} onValueChange={(v) => updateFilter("status", v)}>
                    <SelectTrigger className="w-[150px]">
                        <span>{filters.status === "ALL" ? "All Status" : filters.status}</span>
                    </SelectTrigger>
                    <SelectContent>
                        <option value="ALL">All Status</option>
                        <option value="DETECTED">Detected</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="IGNORED">Ignored</option>
                    </SelectContent>
                </Select>
                <Input
                    type="date"
                    className="w-[160px]"
                    value={filters.date}
                    onChange={(e) => updateFilter("date", e.target.value)}
                    placeholder="Filter by date"
                />
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={data?.conflicts ?? []}
                isLoading={loading}
                pageSize={20}
                filterPlaceholder="Filter conflicts..."
            />

            {/* Conflict Detail Dialog */}
            <Dialog open={!!selectedConflict} onOpenChange={() => setSelectedConflict(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Room Conflict Details</DialogTitle>
                    </DialogHeader>
                    {selectedConflict && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Room</p>
                                    <p className="font-semibold">Room {selectedConflict.room.roomNumber}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Date</p>
                                    <p className="font-semibold">{formatDate(selectedConflict.date, "long")}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Conflict Type</p>
                                    <Badge variant="destructive">{selectedConflict.conflictType.replace("_", " ")}</Badge>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Status</p>
                                    <Badge variant={selectedConflict.status === "RESOLVED" ? "success" : "warning"}>
                                        {selectedConflict.status}
                                    </Badge>
                                </div>
                            </div>

                            {selectedConflict.booking && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Conflicting Booking</p>
                                    <p className="font-medium">{selectedConflict.booking.bookingNumber}</p>
                                    <p className="text-sm">{selectedConflict.booking.guest.name}</p>
                                </div>
                            )}

                            {selectedConflict.resolution && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-sm text-muted-foreground">Resolution</p>
                                    <p className="text-sm">{selectedConflict.resolution}</p>
                                </div>
                            )}

                            {selectedConflict.status !== "RESOLVED" && (
                                <div className="space-y-2">
                                    <Label>Resolution Notes</Label>
                                    <textarea
                                        className="w-full h-20 p-3 border rounded-lg text-sm"
                                        value={resolution}
                                        onChange={(e) => setResolution(e.target.value)}
                                        placeholder="Enter resolution notes..."
                                    />
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter className="flex-wrap gap-2">
                        {selectedConflict && selectedConflict.status !== "RESOLVED" && (
                            <>
                                <Button onClick={handleResolve} disabled={!resolution}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Mark Resolved
                                </Button>
                                <Button variant="outline" onClick={handleHoldRoom}>
                                    Hold Room
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}