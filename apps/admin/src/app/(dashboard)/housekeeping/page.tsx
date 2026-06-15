"use client";

// apps/admin/src/app/(dashboard)/housekeeping/page.tsx
// Housekeeping Management - Room cleaning queue, staff assignment, status tracking

import { useEffect, useState, useCallback } from "react";
import {
    RefreshCw,
    Sparkles,
    Trash2,
    Clock,
    CheckCircle,
    Users,
    Filter,
    BedDouble,
} from "lucide-react";
import {
    PageHeader,
    Button,
    Select,
    SelectTrigger,
    SelectContent,
    SelectValue,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Badge,
} from "@the-rooms/ui";
import { formatDate } from "@the-rooms/ui";
import { cn } from "@the-rooms/ui";

interface HousekeepingRoom {
    id: string;
    roomNumber: string;
    type: string;
    floor: number;
    status: "CLEAN" | "DIRTY" | "CLEANING";
    currentBooking: { guestName: string; checkOut: string } | null;
    assignedTo: { id: string; name: string } | null;
    updatedAt: string;
    notes: string | null;
}

interface HousekeepingStats {
    totalRooms: number;
    clean: number;
    dirty: number;
    cleaning: number;
    assignedToday: number;
}

interface Staff {
    id: string;
    name: string;
    roomsAssigned: number;
    status: "AVAILABLE" | "BUSY" | "OFF";
}

interface HousekeepingResponse {
    rooms: HousekeepingRoom[];
    stats: HousekeepingStats;
    staff: Staff[];
}

const STATUS_CONFIG = {
    CLEAN: { label: "Clean", bg: "bg-green-100", text: "text-green-700", icon: Sparkles },
    DIRTY: { label: "Dirty", bg: "bg-red-100", text: "text-red-700", icon: Trash2 },
    CLEANING: { label: "Cleaning", bg: "bg-blue-100", text: "text-blue-700", icon: Clock },
};

export default function HousekeepingPage() {
    const [data, setData] = useState<HousekeepingResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>("all");
    const [staffFilter, setStaffFilter] = useState<string>("all");

    const fetchHousekeeping = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/housekeeping/rooms");
            if (res.ok) {
                setData(await res.json());
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchHousekeeping(); }, [fetchHousekeeping]);

    const updateRoomStatus = async (roomId: string, status: string, staffId?: string) => {
        await fetch(`/api/housekeeping/rooms/${roomId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status, staffId }),
        });
        fetchHousekeeping();
    };

    const filteredRooms = data?.rooms.filter((room) => {
        if (filter !== "all" && room.status !== filter.toUpperCase()) return false;
        if (staffFilter !== "all" && room.assignedTo?.id !== staffFilter) return false;
        return true;
    }) ?? [];

    const roomsByFloor = filteredRooms.reduce((acc, room) => {
        if (!acc[room.floor]) acc[room.floor] = [];
        acc[room.floor].push(room);
        return acc;
    }, {} as Record<number, HousekeepingRoom[]>);

    const floors = Object.keys(roomsByFloor).map(Number).sort((a, b) => a - b);

    if (loading && !data) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-[#E17055]" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <PageHeader
                title="Housekeeping"
                description="Room cleaning queue, staff assignment, and status tracking"
                actions={
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={fetchHousekeeping} disabled={loading}>
                            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                            Refresh
                        </Button>
                    </div>
                }
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold">{data?.stats.totalRooms ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Total Rooms</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-green-200">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-green-600">{data?.stats.clean ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Clean</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-red-200">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-red-600">{data?.stats.dirty ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Dirty</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-blue-200">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-blue-600">{data?.stats.cleaning ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Cleaning</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold">{data?.stats.assignedToday ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Assigned Today</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-[150px]">
                        <Filter className="h-4 w-4 mr-1.5 text-muted-foreground" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <option value="all">All Status</option>
                        <option value="clean">Clean</option>
                        <option value="dirty">Dirty</option>
                        <option value="cleaning">Cleaning</option>
                    </SelectContent>
                </Select>
                <Select value={staffFilter} onValueChange={setStaffFilter}>
                    <SelectTrigger className="w-[180px]">
                        <Users className="h-4 w-4 mr-1.5 text-muted-foreground" />
                        <SelectValue placeholder="All Staff" />
                    </SelectTrigger>
                    <SelectContent>
                        <option value="all">All Staff</option>
                        {data?.staff.map((s) => (
                            <option key={s.id} value={s.id}>{s.name} ({s.roomsAssigned})</option>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Room Grid by Floor */}
            <div className="space-y-6">
                {floors.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
                        <p className="text-gray-400">No rooms match this filter.</p>
                    </div>
                ) : floors.map((floor) => (
                    <div key={floor}>
                        <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-500">
                            Floor {floor}
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {roomsByFloor[floor].map((room) => {
                                const config = STATUS_CONFIG[room.status];
                                const StatusIcon = config.icon;

                                return (
                                    <Card
                                        key={room.id}
                                        className={cn(
                                            "transition-all hover:shadow-md",
                                            room.status === "DIRTY" && "border-red-300 bg-red-50",
                                            room.status === "CLEANING" && "border-blue-300 bg-blue-50",
                                            room.status === "CLEAN" && "border-green-300 bg-green-50"
                                        )}
                                    >
                                        <CardContent className="p-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-lg font-bold">{room.roomNumber}</span>
                                                <StatusIcon className={cn("h-4 w-4", config.text)} />
                                            </div>
                                            <p className={cn("text-xs font-medium", config.text)}>{config.label}</p>
                                            <p className="text-[10px] text-gray-500 mt-1">{room.type}</p>

                                            {room.assignedTo && (
                                                <p className="text-[10px] text-blue-600 mt-1 truncate">
                                                    Assigned: {room.assignedTo.name}
                                                </p>
                                            )}

                                            {room.currentBooking && room.status !== "CLEAN" && (
                                                <p className="text-[10px] text-gray-400 mt-1 truncate">
                                                    Guest: {room.currentBooking.guestName}
                                                </p>
                                            )}

                                            {/* Quick Actions */}
                                            <div className="flex gap-1 mt-2">
                                                {room.status === "DIRTY" && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 w-7 p-0"
                                                        onClick={() => updateRoomStatus(room.id, "CLEANING")}
                                                        title="Start Cleaning"
                                                    >
                                                        <Clock className="h-3 w-3" />
                                                    </Button>
                                                )}
                                                {room.status === "CLEANING" && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 w-7 p-0 text-green-600"
                                                        onClick={() => updateRoomStatus(room.id, "CLEAN")}
                                                        title="Mark Clean"
                                                    >
                                                        <CheckCircle className="h-3 w-3" />
                                                    </Button>
                                                )}
                                                {room.status === "CLEAN" && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 w-7 p-0 text-red-600"
                                                        onClick={() => updateRoomStatus(room.id, "DIRTY")}
                                                        title="Mark Dirty"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Staff Overview */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Staff Overview
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {data?.staff.map((member) => (
                            <div key={member.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
                                        {member.name.charAt(0)}
                                    </div>
                                    <span className="text-sm font-medium">{member.name}</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold">{member.roomsAssigned}</p>
                                    <p className="text-[10px] text-muted-foreground">rooms</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
