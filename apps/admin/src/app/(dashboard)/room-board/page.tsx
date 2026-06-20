"use client";

// apps/admin/src/app/(dashboard)/room-board/page.tsx
// Room Board with Admin Overrides - Control Tower for Room Management

import { useEffect, useState, useCallback } from "react";
import { cn } from "@the-rooms/ui";
import {
    Bed,
    Users,
    Wrench,
    Lock,
    RefreshCw,
    Sparkles,
    Trash2,
    Clock,
    Bell,
    AlertCircle,
    ArrowRightLeft,
    Unlock,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Eye,
    Settings,
    ChevronLeft,
    ChevronRight,
    Calendar,
} from "lucide-react";
import { formatDate, formatCurrency } from "@the-rooms/ui";
import { PageHeader, Button, StatusBadge, Select, SelectTrigger, SelectContent, SelectValue, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@the-rooms/ui";

interface CurrentBooking {
    id: string;
    bookingNumber: string | null;
    guestName: string;
    guestPhone: string | null;
    checkIn: string;
    checkOut: string;
    status: string;
    arrivingToday: boolean;
    departingToday: boolean;
}

interface RoomEntry {
    id: string;
    roomNumber: string;
    type: "STUDIO" | "PREMIUM";
    floor: number;
    status: "VACANT" | "BOOKED" | "OCCUPIED" | "MAINTENANCE" | "BLOCKED";
    cleaningStatus: "CLEAN" | "DIRTY" | "CLEANING";
    currentBooking: CurrentBooking | null;
}

interface RoomBoardData {
    rooms: RoomEntry[];
    totalRooms: number;
    vacant: number;
    booked: number;
    occupied: number;
    maintenance: number;
    blocked: number;
    arrivingToday: number;
    departingToday: number;
    selectedDate: string;
    isToday: boolean;
}

interface AdminOverrideModal {
    type: "status" | "unblock" | "reassign" | "conflict" | null;
    room: RoomEntry | null;
    targetRoom?: RoomEntry;
    conflicts?: RoomEntry[];
}

const STATUS_CONFIG = {
    VACANT: { label: "Vacant", bgColor: "bg-green-100", borderColor: "border-green-300", textColor: "text-green-800", icon: Bed },
    BOOKED: { label: "Booked", bgColor: "bg-purple-100", borderColor: "border-purple-300", textColor: "text-purple-800", icon: Lock },
    OCCUPIED: { label: "Occupied", bgColor: "bg-blue-100", borderColor: "border-blue-300", textColor: "text-blue-800", icon: Users },
    MAINTENANCE: { label: "Maintenance", bgColor: "bg-yellow-100", borderColor: "border-yellow-300", textColor: "text-yellow-800", icon: Wrench },
    BLOCKED: { label: "Blocked", bgColor: "bg-gray-100", borderColor: "border-gray-300", textColor: "text-gray-800", icon: Lock },
};

const ROOM_STATUS_OPTIONS = [
    { value: "VACANT", label: "Vacant", color: "text-green-600" },
    { value: "MAINTENANCE", label: "Maintenance", color: "text-yellow-600" },
    { value: "BLOCKED", label: "Blocked", color: "text-gray-600" },
];

function getTodayString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function RoomBoardPage() {
    const [data, setData] = useState<RoomBoardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>("all");
    const [selectedRoom, setSelectedRoom] = useState<RoomEntry | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [overrideModal, setOverrideModal] = useState<AdminOverrideModal>({ type: null, room: null });
    const [newStatus, setNewStatus] = useState<string>("");
    const [overrideReason, setOverrideReason] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>(getTodayString());

    const fetchRoomBoard = useCallback(async (date?: string) => {
        try {
            const dateParam = date || selectedDate;
            const url = `/api/rooms/board?date=${dateParam}`;
            const res = await fetch(url);
            if (res.ok) {
                const json = await res.json();
                setData({
                    ...json,
                    blocked: json.blocked ?? 0,
                });
                if (date) setSelectedDate(date);
            }
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => { fetchRoomBoard(); }, [fetchRoomBoard]);

    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => fetchRoomBoard(selectedDate), 30000);
        return () => clearInterval(interval);
    }, [autoRefresh, fetchRoomBoard, selectedDate]);

    const handleDateChange = (newDate: string) => {
        setLoading(true);
        fetchRoomBoard(newDate);
    };

    const handleToday = () => {
        const today = getTodayString();
        setLoading(true);
        fetchRoomBoard(today);
    };

    const handlePrevDay = () => {
        const current = new Date(selectedDate);
        current.setDate(current.getDate() - 1);
        const newDate = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
        setLoading(true);
        fetchRoomBoard(newDate);
    };

    const handleNextDay = () => {
        const current = new Date(selectedDate);
        current.setDate(current.getDate() + 1);
        const newDate = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
        setLoading(true);
        fetchRoomBoard(newDate);
    };

    const filteredRooms = data?.rooms.filter((room) => {
        if (filter === "all") return true;
        if (filter === "arriving") return room.currentBooking?.arrivingToday;
        if (filter === "departing") return room.currentBooking?.departingToday;
        return room.status === filter.toUpperCase();
    }) ?? [];

    const roomsByFloor = filteredRooms.reduce((acc, room) => {
        if (!acc[room.floor]) acc[room.floor] = [];
        acc[room.floor].push(room);
        return acc;
    }, {} as Record<number, RoomEntry[]>);

    const floors = Object.keys(roomsByFloor).map(Number).sort((a, b) => a - b);
    const occupancyPercent = data?.totalRooms ? Math.round((data.occupied / data.totalRooms) * 100) : 0;

    // Format selected date for display
    const formatDisplayDate = (dateStr: string) => {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Check for double bookings / conflicts
    const checkConflicts = (room: RoomEntry): RoomEntry[] => {
        if (!room.currentBooking) return [];
        return data?.rooms.filter((r) => {
            if (r.id === room.id || !r.currentBooking || !room.currentBooking) return false;
            const existingCheckIn = new Date(r.currentBooking.checkIn);
            const existingCheckOut = new Date(r.currentBooking.checkOut);
            const newCheckIn = new Date(room.currentBooking.checkIn);
            const newCheckOut = new Date(room.currentBooking.checkOut);
            return newCheckIn < existingCheckOut && newCheckOut > existingCheckIn;
        }) ?? [];
    };

    const handleStatusOverride = async () => {
        if (!overrideModal.room || !newStatus) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/rooms/${overrideModal.room.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: newStatus,
                    overrideReason,
                    adminAction: true,
                }),
            });
            if (res.ok) {
                fetchRoomBoard(selectedDate);
                setOverrideModal({ type: null, room: null });
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleForceUnblock = async () => {
        if (!overrideModal.room) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/rooms/${overrideModal.room.id}/unblock`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: overrideReason }),
            });
            if (res.ok) {
                fetchRoomBoard(selectedDate);
                setOverrideModal({ type: null, room: null });
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleRoomReassign = async (targetRoomId: string) => {
        if (!overrideModal.room?.currentBooking) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/bookings/${overrideModal.room.currentBooking.id}/reassign`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetRoomId, reason: overrideReason }),
            });
            if (res.ok) {
                fetchRoomBoard(selectedDate);
                setOverrideModal({ type: null, room: null });
            }
        } finally {
            setActionLoading(false);
        }
    };

    const openOverrideModal = (room: RoomEntry, type: AdminOverrideModal["type"]) => {
        const conflicts = type === "conflict" ? checkConflicts(room) : [];
        setOverrideModal({ type, room, conflicts });
        setOverrideReason("");
    };

    if (loading && !data) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-[#E17055]" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* ─── Header ───────────────────────────────────────────────────────────── */}
            <PageHeader
                title="Room Board"
                description="Control tower for room management with admin override capabilities"
                actions={
                    <div className="flex items-center gap-3">
                        <Button
                            variant={autoRefresh ? "default" : "outline"}
                            size="sm"
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={autoRefresh ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                            <RefreshCw className={cn("h-4 w-4 mr-2", autoRefresh && "animate-spin")} />
                            {autoRefresh ? "Auto-refresh On" : "Auto-refresh Off"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => fetchRoomBoard(selectedDate)} disabled={loading}>
                            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                            Refresh
                        </Button>
                    </div>
                }
            />

            {/* ─── Date Navigation ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-center gap-2 bg-white rounded-lg border p-2">
                <button
                    onClick={handlePrevDay}
                    className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                    title="Previous day"
                >
                    <ChevronLeft className="h-5 w-5 text-gray-600" />
                </button>

                <div className="flex items-center gap-2 px-4">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className="text-sm font-medium text-gray-900 border-0 bg-transparent focus:ring-2 focus:ring-[#E17055] rounded px-2 py-1"
                    />
                    <span className="text-sm text-gray-600">
                        {formatDisplayDate(selectedDate)}
                    </span>
                </div>

                <button
                    onClick={handleNextDay}
                    className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                    title="Next day"
                >
                    <ChevronRight className="h-5 w-5 text-gray-600" />
                </button>

                {!data?.isToday && (
                    <button
                        onClick={handleToday}
                        className="ml-2 px-3 py-1.5 text-sm font-medium text-[#E17055] border border-[#E17055] rounded-md hover:bg-[#E17055] hover:text-white transition-colors"
                    >
                        Today
                    </button>
                )}

                {data?.isToday && (
                    <span className="ml-2 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-md">
                        Today
                    </span>
                )}
            </div>

            {/* ─── KPI Cards ───────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {([
                    { key: "all", label: "All Rooms", count: data?.totalRooms ?? 0, colorClass: "text-gray-600", bgClass: "bg-gray-50", Icon: Bed },
                    { key: "vacant", label: "Vacant", count: data?.vacant ?? 0, colorClass: "text-green-600", bgClass: "bg-green-50", Icon: Bed },
                    { key: "occupied", label: "Occupied", count: data?.occupied ?? 0, colorClass: "text-blue-600", bgClass: "bg-blue-50", Icon: Users },
                    { key: "booked", label: "Booked", count: data?.booked ?? 0, colorClass: "text-purple-600", bgClass: "bg-purple-50", Icon: Lock },
                    { key: "arriving", label: "Arriving", count: data?.arrivingToday ?? 0, colorClass: "text-orange-600", bgClass: "bg-orange-50", Icon: Bell },
                    { key: "maintenance", label: "Maintenance", count: data?.maintenance ?? 0, colorClass: "text-yellow-600", bgClass: "bg-yellow-50", Icon: Wrench },
                    { key: "blocked", label: "Blocked", count: data?.blocked ?? 0, colorClass: "text-gray-600", bgClass: "bg-gray-100", Icon: Lock },
                ] as const).map(({ key, label, count, colorClass, bgClass, Icon }) => (
                    <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={cn(
                            "rounded-xl border p-4 text-left transition-all min-h-[100px] flex flex-col justify-between",
                            filter === key ? `ring-2 ring-[#E17055] bg-orange-50 border-orange-300` : `${bgClass} border-gray-200 hover:border-gray-300`
                        )}
                    >
                        <div className="flex items-center justify-between">
                            <Icon className={cn("h-5 w-5", colorClass)} />
                            <span className="text-2xl font-bold text-gray-900">{count}</span>
                        </div>
                        <p className={cn("text-xs font-semibold mt-2", colorClass)}>{label}</p>
                    </button>
                ))}
            </div>

            {/* ─── Room Grid by Floor ──────────────────────────────────────────────── */}
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
                                const isSelected = selectedRoom?.id === room.id;
                                const arriving = room.currentBooking?.arrivingToday;
                                const hasConflicts = checkConflicts(room).length > 0;

                                return (
                                    <button
                                        key={room.id}
                                        onClick={() => setSelectedRoom(isSelected ? null : room)}
                                        className={cn(
                                            "relative rounded-xl border-2 p-3 text-left transition-all min-h-[140px]",
                                            arriving ? "border-orange-400 bg-orange-50" : `${config.borderColor} ${config.bgColor}`,
                                            isSelected && "ring-2 ring-[#E17055] ring-offset-1"
                                        )}
                                    >
                                        {/* Conflict indicator */}
                                        {hasConflicts && (
                                            <span className="absolute -top-1 -right-1 rounded-full bg-red-500 p-1">
                                                <AlertTriangle className="h-3 w-3 text-white" />
                                            </span>
                                        )}

                                        {/* Arriving today badge */}
                                        {arriving && (
                                            <span className="absolute top-1.5 right-1.5 rounded-full bg-orange-500 px-1.5 py-0.5 text-[8px] font-bold text-white uppercase tracking-wide leading-tight">
                                                Today
                                            </span>
                                        )}

                                        <div className="flex items-start justify-between gap-1">
                                            <span className="text-base font-bold text-gray-900 leading-tight">{room.roomNumber}</span>
                                            <StatusIcon className={cn("h-4 w-4 shrink-0 mt-0.5", arriving ? "text-orange-600" : config.textColor)} />
                                        </div>
                                        <p className={cn("mt-0.5 text-[10px] font-semibold", arriving ? "text-orange-700" : config.textColor)}>
                                            {arriving ? "Arriving" : config.label}
                                        </p>
                                        <div className="flex items-center justify-between mt-1.5">
                                            <p className="text-[10px] text-gray-400">{room.type === "PREMIUM" ? "PREM" : "STD"}</p>
                                            {room.cleaningStatus === "DIRTY"
                                                ? <span title="Dirty"><Trash2 className="h-3 w-3 text-red-500" /></span>
                                                : room.cleaningStatus === "CLEANING"
                                                    ? <span title="Cleaning"><Clock className="h-3 w-3 text-blue-500" /></span>
                                                    : <span title="Clean"><Sparkles className="h-3 w-3 text-green-500" /></span>
                                            }
                                        </div>
                                        {room.currentBooking && (
                                            <div className="mt-1.5 pt-1.5 border-t border-black/5">
                                                <p className="text-[10px] font-medium text-gray-900 truncate">{room.currentBooking.guestName}</p>
                                                <p className="text-[9px] text-gray-400 leading-tight">
                                                    {arriving ? `→ ${formatDate(room.currentBooking.checkOut, "short")}` : `Out: ${formatDate(room.currentBooking.checkOut, "short")}`}
                                                </p>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* ─── Room Detail Modal ───────────────────────────────────────────────── */}
            {selectedRoom && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedRoom(null)}>
                    <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className={cn("p-5 rounded-t-2xl", selectedRoom.currentBooking?.arrivingToday ? "bg-orange-50" : STATUS_CONFIG[selectedRoom.status].bgColor)}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Room {selectedRoom.roomNumber}</h3>
                                    <p className="text-sm text-gray-500">{selectedRoom.type} · Floor {selectedRoom.floor}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <StatusBadge status={selectedRoom.status as "VACANT"} type="room" />
                                    {selectedRoom.currentBooking?.arrivingToday && (
                                        <span className="rounded-full bg-orange-100 border border-orange-300 px-3 py-1 text-xs font-semibold text-orange-800">
                                            Arriving Today
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Cleaning Status */}
                            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                                <span className="text-sm text-gray-600">Cleaning Status</span>
                                <div className="flex items-center gap-2">
                                    {selectedRoom.cleaningStatus === "DIRTY" && <><Trash2 className="h-4 w-4 text-red-500" /><span className="text-sm font-medium text-red-600">Dirty</span></>}
                                    {selectedRoom.cleaningStatus === "CLEANING" && <><Clock className="h-4 w-4 text-blue-500" /><span className="text-sm font-medium text-blue-600">Cleaning</span></>}
                                    {selectedRoom.cleaningStatus === "CLEAN" && <><Sparkles className="h-4 w-4 text-green-500" /><span className="text-sm font-medium text-green-600">Clean</span></>}
                                </div>
                            </div>

                            {selectedRoom.currentBooking ? (
                                <>
                                    {selectedRoom.currentBooking.bookingNumber && (
                                        <div className="rounded-lg bg-gray-50 px-3 py-2">
                                            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Booking</p>
                                            <p className="font-mono text-sm font-bold text-gray-900">{selectedRoom.currentBooking.bookingNumber}</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-0.5">Guest</p>
                                        <p className="text-base font-semibold text-gray-900">{selectedRoom.currentBooking.guestName}</p>
                                        {selectedRoom.currentBooking.guestPhone && (
                                            <a href={`tel:${selectedRoom.currentBooking.guestPhone}`} className="text-sm text-blue-600 hover:underline">
                                                {selectedRoom.currentBooking.guestPhone}
                                            </a>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Check-in</p>
                                            <p className="text-sm font-medium text-gray-900">{formatDate(selectedRoom.currentBooking.checkIn, "short")}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Check-out</p>
                                            <p className="text-sm font-medium text-gray-900">{formatDate(selectedRoom.currentBooking.checkOut, "short")}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        <a href={`/bookings/${selectedRoom.currentBooking.id}`} className="flex-1 rounded-lg bg-[#E17055] py-2.5 text-center text-sm font-semibold text-white hover:bg-[#D35B3F]">
                                            <Eye className="h-4 w-4 inline mr-1" /> View Booking
                                        </a>
                                    </div>
                                </>
                            ) : (
                                <p className="text-center text-sm text-gray-500 py-2">This room is vacant and available.</p>
                            )}

                            {/* ─── Admin Override Actions ─────────────────────────────────── */}
                            <div className="border-t pt-4 mt-4">
                                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Admin Actions</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {/* Status Override */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openOverrideModal(selectedRoom, "status")}
                                        className="justify-start"
                                    >
                                        <Settings className="h-4 w-4 mr-2" /> Change Status
                                    </Button>

                                    {/* Force Unblock (if blocked) */}
                                    {selectedRoom.status === "BLOCKED" && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openOverrideModal(selectedRoom, "unblock")}
                                            className="justify-start text-green-600 hover:text-green-700"
                                        >
                                            <Unlock className="h-4 w-4 mr-2" /> Force Unblock
                                        </Button>
                                    )}

                                    {/* Reassign Room (if has booking) */}
                                    {selectedRoom.currentBooking && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openOverrideModal(selectedRoom, "reassign")}
                                            className="justify-start"
                                        >
                                            <ArrowRightLeft className="h-4 w-4 mr-2" /> Reassign Room
                                        </Button>
                                    )}

                                    {/* Check Conflicts */}
                                    {selectedRoom.currentBooking && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openOverrideModal(selectedRoom, "conflict")}
                                            className={cn(
                                                "justify-start",
                                                checkConflicts(selectedRoom).length > 0 ? "border-red-300 text-red-600 hover:text-red-700" : ""
                                            )}
                                        >
                                            <AlertTriangle className={cn("h-4 w-4 mr-2", checkConflicts(selectedRoom).length > 0 ? "text-red-500" : "")} />
                                            Check Conflicts
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="border-t px-5 py-3">
                            <Button variant="ghost" className="w-full" onClick={() => setSelectedRoom(null)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Admin Override Modal ───────────────────────────────────────────── */}
            {overrideModal.type && overrideModal.room && (
                <Dialog open onOpenChange={() => setOverrideModal({ type: null, room: null })}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {overrideModal.type === "status" && "Change Room Status"}
                                {overrideModal.type === "unblock" && "Force Unblock Room"}
                                {overrideModal.type === "reassign" && "Reassign Booking to Another Room"}
                                {overrideModal.type === "conflict" && "Conflict Resolution"}
                            </DialogTitle>
                            <DialogDescription>
                                Room {overrideModal.room.roomNumber} - Admin override action
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            {/* Status Change */}
                            {overrideModal.type === "status" && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">New Status</label>
                                    <Select value={newStatus} onValueChange={setNewStatus}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select new status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ROOM_STATUS_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    <span className={opt.color}>{opt.label}</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Conflicts Display */}
                            {overrideModal.type === "conflict" && (
                                <div className="space-y-3">
                                    {overrideModal.conflicts && overrideModal.conflicts.length > 0 ? (
                                        <>
                                            <div className="flex items-center gap-2 text-red-600">
                                                <AlertCircle className="h-5 w-5" />
                                                <span className="font-medium">{overrideModal.conflicts.length} Conflict(s) Found</span>
                                            </div>
                                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                                {overrideModal.conflicts.map((conflict) => (
                                                    <div key={conflict.id} className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm">
                                                        <div>
                                                            <span className="font-semibold">Room {conflict.roomNumber}</span>
                                                            <span className="text-gray-500 ml-2">{conflict.currentBooking?.guestName}</span>
                                                        </div>
                                                        <span className="text-xs text-red-600">
                                                            {formatDate(conflict.currentBooking?.checkIn ?? "", "short")} - {formatDate(conflict.currentBooking?.checkOut ?? "", "short")}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-2 text-green-600">
                                            <CheckCircle className="h-5 w-5" />
                                            <span className="font-medium">No Conflicts Found</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Reassign - Room Selection would go here */}
                            {overrideModal.type === "reassign" && (
                                <div className="space-y-2">
                                    <p className="text-sm text-gray-600">
                                        Select a vacant room to reassign booking <span className="font-semibold">{overrideModal.room.currentBooking?.bookingNumber}</span>
                                    </p>
                                    <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                                        {data?.rooms
                                            .filter((r) => r.id !== overrideModal.room?.id && r.status === "VACANT")
                                            .map((vacantRoom) => (
                                                <button
                                                    key={vacantRoom.id}
                                                    onClick={() => handleRoomReassign(vacantRoom.id)}
                                                    className="rounded-lg border p-2 text-center hover:bg-green-50 hover:border-green-300 transition-colors"
                                                >
                                                    <span className="font-semibold text-sm">{vacantRoom.roomNumber}</span>
                                                    <p className="text-[10px] text-gray-500">{vacantRoom.type}</p>
                                                </button>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* Override Reason (required for all) */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Override Reason *</label>
                                <textarea
                                    value={overrideReason}
                                    onChange={(e) => setOverrideReason(e.target.value)}
                                    placeholder="Enter reason for this override action..."
                                    className="w-full rounded-lg border px-3 py-2 text-sm min-h-[80px]"
                                    required
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOverrideModal({ type: null, room: null })}>
                                Cancel
                            </Button>
                            {(overrideModal.type === "status" || overrideModal.type === "unblock") && (
                                <Button
                                    onClick={overrideModal.type === "status" ? handleStatusOverride : handleForceUnblock}
                                    disabled={actionLoading || !overrideReason}
                                    variant={overrideModal.type === "unblock" ? "default" : "destructive"}
                                >
                                    {actionLoading ? "Processing..." : overrideModal.type === "unblock" ? "Force Unblock" : "Change Status"}
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

// Helper for SelectItem since we can't import from UI directly in this context
function SelectItem({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
    return (
        <option value={value} className={className}>
            {children}
        </option>
    );
}
