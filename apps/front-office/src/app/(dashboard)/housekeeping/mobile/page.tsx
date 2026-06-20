"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@the-rooms/ui";
import {
    Search,
    Filter,
    Bed,
    Sparkles,
    Trash2,
    Clock,
    Check,
    Loader2,
    RefreshCw,
    Home,
    Building2,
    ChevronRight,
    AlertCircle,
} from "lucide-react";
import { formatDate } from "@the-rooms/ui";

interface RoomEntry {
    id: string;
    roomNumber: string;
    type: "STUDIO" | "PREMIUM";
    floor: number;
    wing?: string;
    status: "VACANT" | "BOOKED" | "OCCUPIED" | "MAINTENANCE" | "BLOCKED";
    cleaningStatus: "CLEAN" | "DIRTY" | "CLEANING";
    currentBooking?: {
        guestName: string;
        checkOut: string;
    } | null;
}

interface HousekeepingStats {
    total: number;
    clean: number;
    dirty: number;
    cleaning: number;
    inspection: number;
}

export default function MobileHousekeepingPage() {
    const [rooms, setRooms] = useState<RoomEntry[]>([]);
    const [stats, setStats] = useState<HousekeepingStats>({
        total: 0,
        clean: 0,
        dirty: 0,
        cleaning: 0,
        inspection: 0,
    });
    const [loading, setLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [filterFloor, setFilterFloor] = useState<string>("all");
    const [filterWing, setFilterWing] = useState<string>("all");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const fetchRooms = useCallback(async () => {
        try {
            setError(null);
            const res = await fetch("/api/housekeeping/rooms");
            if (!res.ok) throw new Error("Failed to fetch rooms");
            const data = await res.json();
            setRooms(data.rooms || []);
            setStats(data.stats || { total: 0, clean: 0, dirty: 0, cleaning: 0, inspection: 0 });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load rooms");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRooms();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchRooms, 30000);
        return () => clearInterval(interval);
    }, [fetchRooms]);

    // Mark room as clean
    const markClean = async (roomId: string) => {
        setIsUpdating(roomId);
        setSuccess(null);
        try {
            const res = await fetch(`/api/rooms/${roomId}/clean`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            if (!res.ok) throw new Error("Failed to update room");
            setSuccess(`Room marked as clean!`);
            fetchRooms();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update room");
        } finally {
            setIsUpdating(null);
        }
    };

    // Mark room as dirty
    const markDirty = async (roomId: string) => {
        setIsUpdating(roomId);
        setSuccess(null);
        try {
            const res = await fetch(`/api/rooms/${roomId}/mark-dirty`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            if (!res.ok) throw new Error("Failed to update room");
            setSuccess(`Room marked as dirty!`);
            fetchRooms();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update room");
        } finally {
            setIsUpdating(null);
        }
    };

    // Filter rooms
    const filteredRooms = rooms.filter((room) => {
        const matchesSearch = room.roomNumber.toLowerCase().includes(search.toLowerCase());
        const matchesFloor = filterFloor === "all" || room.floor.toString() === filterFloor;
        const matchesWing = filterWing === "all" || room.wing === filterWing;
        const matchesStatus = filterStatus === "all" || room.cleaningStatus.toLowerCase() === filterStatus.toLowerCase();
        return matchesSearch && matchesFloor && matchesWing && matchesStatus;
    });

    // Get unique floors and wings
    const floors = [...new Set(rooms.map((r) => r.floor))].sort();
    const wings = [...new Set(rooms.map((r) => r.wing).filter(Boolean))];

    // Group rooms by floor
    const roomsByFloor = filteredRooms.reduce((acc, room) => {
        const key = `Floor ${room.floor}${room.wing ? ` - ${room.wing}` : ""}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(room);
        return acc;
    }, {} as Record<string, RoomEntry[]>);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
                <Loader2 className="w-12 h-12 text-[#E17055] animate-spin" />
                <p className="mt-4 text-gray-600">Loading rooms...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <div className="bg-white border-b px-4 py-4 sticky top-0 z-10">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Housekeeping</h1>
                        <p className="text-sm text-gray-500">{formatDate(new Date().toISOString(), "long")}</p>
                    </div>
                    <button
                        onClick={fetchRooms}
                        className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                        disabled={loading}
                    >
                        <RefreshCw className={cn("w-5 h-5 text-gray-600", loading && "animate-spin")} />
                    </button>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                    <button
                        onClick={() => setFilterStatus("all")}
                        className={cn(
                            "p-3 rounded-xl text-center transition-all",
                            filterStatus === "all" ? "bg-[#E17055] text-white" : "bg-gray-100 text-gray-700"
                        )}
                    >
                        <p className="text-lg font-bold">{stats.total}</p>
                        <p className="text-[10px] opacity-80">Total</p>
                    </button>
                    <button
                        onClick={() => setFilterStatus("clean")}
                        className={cn(
                            "p-3 rounded-xl text-center transition-all",
                            filterStatus === "clean" ? "bg-green-600 text-white" : "bg-green-50 text-green-700"
                        )}
                    >
                        <p className="text-lg font-bold">{stats.clean}</p>
                        <p className="text-[10px] opacity-80">Clean</p>
                    </button>
                    <button
                        onClick={() => setFilterStatus("dirty")}
                        className={cn(
                            "p-3 rounded-xl text-center transition-all",
                            filterStatus === "dirty" ? "bg-red-600 text-white" : "bg-red-50 text-red-700"
                        )}
                    >
                        <p className="text-lg font-bold">{stats.dirty}</p>
                        <p className="text-[10px] opacity-80">Dirty</p>
                    </button>
                    <button
                        onClick={() => setFilterStatus("cleaning")}
                        className={cn(
                            "p-3 rounded-xl text-center transition-all",
                            filterStatus === "cleaning" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700"
                        )}
                    >
                        <p className="text-lg font-bold">{stats.cleaning}</p>
                        <p className="text-[10px] opacity-80">Cleaning</p>
                    </button>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search room number..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                    />
                </div>

                {/* Filters */}
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                    <select
                        value={filterFloor}
                        onChange={(e) => setFilterFloor(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#E17055] min-w-[100px]"
                    >
                        <option value="all">All Floors</option>
                        {floors.map((floor) => (
                            <option key={floor} value={floor.toString()}>
                                Floor {floor}
                            </option>
                        ))}
                    </select>
                    {wings.length > 0 && (
                        <select
                            value={filterWing}
                            onChange={(e) => setFilterWing(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#E17055] min-w-[100px]"
                        >
                            <option value="all">All Wings</option>
                            {wings.map((wing) => (
                                <option key={wing} value={wing || ""}>
                                    {wing}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {/* Messages */}
            {error && (
                <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                    <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                        <span className="text-lg">&times;</span>
                    </button>
                </div>
            )}

            {success && (
                <div className="mx-4 mt-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-green-800 flex-1">{success}</p>
                    <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700">
                        <span className="text-lg">&times;</span>
                    </button>
                </div>
            )}

            {/* Room List */}
            <div className="p-4 space-y-6">
                {Object.keys(roomsByFloor).length === 0 ? (
                    <div className="text-center py-12">
                        <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">No rooms found</p>
                        <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
                    </div>
                ) : (
                    Object.entries(roomsByFloor).map(([floorKey, floorRooms]) => (
                        <div key={floorKey}>
                            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Building2 className="w-4 h-4" />
                                {floorKey}
                            </h2>
                            <div className="grid grid-cols-1 gap-3">
                                {floorRooms.map((room) => (
                                    <div
                                        key={room.id}
                                        className={cn(
                                            "rounded-2xl border-2 p-4 transition-all",
                                            room.cleaningStatus === "CLEAN" && "bg-green-50 border-green-200",
                                            room.cleaningStatus === "DIRTY" && "bg-red-50 border-red-200",
                                            room.cleaningStatus === "CLEANING" && "bg-blue-50 border-blue-200"
                                        )}
                                    >
                                        {/* Room Header */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={cn(
                                                        "w-14 h-14 rounded-xl flex items-center justify-center",
                                                        room.cleaningStatus === "CLEAN" && "bg-green-100",
                                                        room.cleaningStatus === "DIRTY" && "bg-red-100",
                                                        room.cleaningStatus === "CLEANING" && "bg-blue-100"
                                                    )}
                                                >
                                                    <Bed className={cn(
                                                        "w-7 h-7",
                                                        room.cleaningStatus === "CLEAN" && "text-green-600",
                                                        room.cleaningStatus === "DIRTY" && "text-red-600",
                                                        room.cleaningStatus === "CLEANING" && "text-blue-600"
                                                    )} />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-900">Room {room.roomNumber}</h3>
                                                    <p className="text-sm text-gray-500">{room.type}</p>
                                                </div>
                                            </div>
                                            {/* Status Badge */}
                                            <div
                                                className={cn(
                                                    "px-3 py-1.5 rounded-full text-xs font-semibold",
                                                    room.cleaningStatus === "CLEAN" && "bg-green-100 text-green-700",
                                                    room.cleaningStatus === "DIRTY" && "bg-red-100 text-red-700",
                                                    room.cleaningStatus === "CLEANING" && "bg-blue-100 text-blue-700"
                                                )}
                                            >
                                                {room.cleaningStatus === "CLEAN" && (
                                                    <span className="flex items-center gap-1">
                                                        <Sparkles className="w-3 h-3" /> Clean
                                                    </span>
                                                )}
                                                {room.cleaningStatus === "DIRTY" && (
                                                    <span className="flex items-center gap-1">
                                                        <Trash2 className="w-3 h-3" /> Dirty
                                                    </span>
                                                )}
                                                {room.cleaningStatus === "CLEANING" && (
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" /> Cleaning
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Guest Info */}
                                        {room.currentBooking && (
                                            <div className="mb-3 p-3 bg-white/60 rounded-xl">
                                                <p className="text-sm font-medium text-gray-900">{room.currentBooking.guestName}</p>
                                                <p className="text-xs text-gray-500">
                                                    Checkout: {formatDate(room.currentBooking.checkOut, "short")}
                                                </p>
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="flex gap-2">
                                            {room.cleaningStatus !== "CLEAN" && (
                                                <button
                                                    onClick={() => markClean(room.id)}
                                                    disabled={isUpdating === room.id || room.cleaningStatus === "CLEANING"}
                                                    className={cn(
                                                        "flex-1 py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all",
                                                        room.cleaningStatus === "CLEANING"
                                                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                            : "bg-green-600 text-white hover:bg-green-700 active:bg-green-800"
                                                    )}
                                                >
                                                    {isUpdating === room.id ? (
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <Check className="w-5 h-5" />
                                                            Mark Clean
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                            {room.cleaningStatus !== "DIRTY" && (
                                                <button
                                                    onClick={() => markDirty(room.id)}
                                                    disabled={isUpdating === room.id}
                                                    className={cn(
                                                        "flex-1 py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all",
                                                        room.cleaningStatus === "CLEANING" && "bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700",
                                                        room.cleaningStatus === "CLEAN" && "bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300"
                                                    )}
                                                >
                                                    {isUpdating === room.id ? (
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <Trash2 className="w-5 h-5" />
                                                            Mark Dirty
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Bottom Quick Stats */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3">
                <div className="flex items-center justify-around text-center">
                    <div>
                        <p className="text-lg font-bold text-green-600">{stats.clean}</p>
                        <p className="text-[10px] text-gray-500">Clean</p>
                    </div>
                    <div className="w-px h-8 bg-gray-200" />
                    <div>
                        <p className="text-lg font-bold text-red-600">{stats.dirty}</p>
                        <p className="text-[10px] text-gray-500">Dirty</p>
                    </div>
                    <div className="w-px h-8 bg-gray-200" />
                    <div>
                        <p className="text-lg font-bold text-blue-600">{stats.cleaning}</p>
                        <p className="text-[10px] text-gray-500">Cleaning</p>
                    </div>
                    <div className="w-px h-8 bg-gray-200" />
                    <div>
                        <p className="text-lg font-bold text-gray-600">{stats.total}</p>
                        <p className="text-[10px] text-gray-500">Total</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
