"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@the-rooms/ui";
import { Bed, Users, Wrench, Lock, Loader2, RefreshCw, Calendar, Sparkles, Trash2, Clock } from "lucide-react";
import { formatDate } from "@the-rooms/ui";

interface RoomBoardData {
  rooms: Array<{ id: string; roomNumber: string; type: "STUDIO" | "PREMIUM"; floor: number; status: "VACANT" | "OCCUPIED" | "MAINTENANCE" | "BLOCKED"; cleaningStatus: "CLEAN" | "DIRTY" | "CLEANING"; currentBooking: { id: string; guestName: string; checkIn: string; checkOut: string } | null }>;
  totalRooms: number; vacant: number; occupied: number; maintenance: number; blocked: number;
}

const STATUS_CONFIG = {
  VACANT: { label: "Vacant", bgColor: "bg-green-100", borderColor: "border-green-300", textColor: "text-green-800", icon: Bed },
  OCCUPIED: { label: "Occupied", bgColor: "bg-blue-100", borderColor: "border-blue-300", textColor: "text-blue-800", icon: Users },
  MAINTENANCE: { label: "Maintenance", bgColor: "bg-yellow-100", borderColor: "border-yellow-300", textColor: "text-yellow-800", icon: Wrench },
  BLOCKED: { label: "Blocked", bgColor: "bg-gray-100", borderColor: "border-gray-300", textColor: "text-gray-800", icon: Lock },
};

export default function RoomBoardPage() {
  const [data, setData] = useState<RoomBoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selectedRoom, setSelectedRoom] = useState<RoomBoardData["rooms"][0] | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchRoomBoard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/board?date=${selectedDate}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { fetchRoomBoard(); }, [fetchRoomBoard]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchRoomBoard();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchRoomBoard]);

  const filteredRooms = data?.rooms.filter((room) => filter === "all" || room.status === filter.toUpperCase() || (filter === "vacant" && room.status === "VACANT") || (filter === "occupied" && room.status === "OCCUPIED") || (filter === "maintenance" && room.status === "MAINTENANCE")) ?? [];
  const roomsByFloor = filteredRooms.reduce((acc, room) => { if (!acc[room.floor]) acc[room.floor] = []; acc[room.floor].push(room); return acc; }, {} as Record<number, typeof filteredRooms>);
  const floors = Object.keys(roomsByFloor).map(Number).sort((a, b) => a - b);

  // Calculate occupancy percentage
  const occupancyPercent = data?.totalRooms ? Math.round((data.occupied / data.totalRooms) * 100) : 0;

  if (loading && !data) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#E17055]" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Room Availability Board</h2>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-gray-500">{data?.totalRooms ?? 0} rooms across 4 floors</p>
            <span className="hidden sm:inline text-gray-300">|</span>
            <p className="text-sm font-medium text-blue-600">
              In-House: {data?.occupied ?? 0}/{data?.totalRooms ?? 0} ({occupancyPercent}%)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Date Picker */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
            />
          </div>
          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
              autoRefresh
                ? "border-green-300 bg-green-50 text-green-700"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            )}
          >
            <RefreshCw className={cn("h-4 w-4", autoRefresh && "animate-spin")} />
            {autoRefresh ? "Auto" : "Paused"}
          </button>
          {/* Manual refresh */}
          <button onClick={fetchRoomBoard} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button onClick={() => setFilter("vacant")} className={cn("rounded-xl border p-4 text-left transition-all", filter === "vacant" ? "border-green-500 bg-green-50 ring-2 ring-green-500" : "border-gray-200 bg-white hover:border-green-300")}><div className="flex items-center justify-between"><Bed className="h-6 w-6 text-green-600" /><span className="text-2xl font-bold text-gray-900">{data?.vacant ?? 0}</span></div><p className="mt-2 text-sm font-medium text-green-700">Vacant</p></button>
        <button onClick={() => setFilter("occupied")} className={cn("rounded-xl border p-4 text-left transition-all", filter === "occupied" ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500" : "border-gray-200 bg-white hover:border-blue-300")}><div className="flex items-center justify-between"><Users className="h-6 w-6 text-blue-600" /><span className="text-2xl font-bold text-gray-900">{data?.occupied ?? 0}</span></div><p className="mt-2 text-sm font-medium text-blue-700">Occupied</p></button>
        <button onClick={() => setFilter("maintenance")} className={cn("rounded-xl border p-4 text-left transition-all", filter === "maintenance" ? "border-yellow-500 bg-yellow-50 ring-2 ring-yellow-500" : "border-gray-200 bg-white hover:border-yellow-300")}><div className="flex items-center justify-between"><Wrench className="h-6 w-6 text-yellow-600" /><span className="text-2xl font-bold text-gray-900">{data?.maintenance ?? 0}</span></div><p className="mt-2 text-sm font-medium text-yellow-700">Maintenance</p></button>
        <button onClick={() => setFilter("all")} className={cn("rounded-xl border p-4 text-left transition-all", filter === "all" ? "border-gray-500 bg-gray-50 ring-2 ring-gray-500" : "border-gray-200 bg-white hover:border-gray-300")}><div className="flex items-center justify-between"><Bed className="h-6 w-6 text-gray-600" /><span className="text-2xl font-bold text-gray-900">{data?.totalRooms ?? 0}</span></div><p className="mt-2 text-sm font-medium text-gray-700">Total</p></button>
      </div>

      <div className="space-y-6">
        {floors.map((floor) => (
          <div key={floor}><h3 className="text-lg font-semibold text-gray-900 mb-3">Floor {floor}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {roomsByFloor[floor].map((room) => {
                const config = STATUS_CONFIG[room.status];
                const StatusIcon = config.icon;
                const isSelected = selectedRoom?.id === room.id;
                return (
                  <button key={room.id} onClick={() => setSelectedRoom(isSelected ? null : room)} className={cn("relative rounded-xl border-2 p-4 text-left transition-all min-h-[120px]", config.borderColor, config.bgColor, isSelected && "ring-2 ring-[#E17055]")}>
                    <div className="flex items-center justify-between"><span className="text-lg font-bold text-gray-900">{room.roomNumber}</span><StatusIcon className={cn("h-5 w-5", config.textColor)} /></div>
                    <p className={cn("mt-1 text-xs font-medium", config.textColor)}>{config.label}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-500">{room.type}</p>
                      {room.cleaningStatus === "DIRTY" ? <span title="Dirty"><Trash2 className="h-4 w-4 text-red-500" /></span> : room.cleaningStatus === "CLEANING" ? <span title="Cleaning"><Clock className="h-4 w-4 text-blue-500" /></span> : <span title="Clean"><Sparkles className="h-4 w-4 text-green-500" /></span>}
                    </div>
                    {room.currentBooking && <div className="mt-2 pt-2 border-t border-gray-200/50"><p className="text-xs font-medium text-gray-900 truncate">{room.currentBooking.guestName}</p><p className="text-[10px] text-gray-500">Until {formatDate(room.currentBooking.checkOut, "short")}</p></div>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className={cn("p-6 rounded-t-2xl", STATUS_CONFIG[selectedRoom.status].bgColor)}>
              <div className="flex items-center justify-between"><div><h3 className="text-2xl font-bold text-gray-900">Room {selectedRoom.roomNumber}</h3><p className="text-gray-600">{selectedRoom.type} • Floor {selectedRoom.floor}</p></div><div className={cn("rounded-full px-4 py-2", STATUS_CONFIG[selectedRoom.status].bgColor, "border", STATUS_CONFIG[selectedRoom.status].borderColor)}><span className={cn("font-medium", STATUS_CONFIG[selectedRoom.status].textColor)}>{STATUS_CONFIG[selectedRoom.status].label}</span></div></div>
            </div>
            <div className="p-6 space-y-4">
              {selectedRoom.currentBooking ? <><div><p className="text-sm font-medium text-gray-500">Current Guest</p><p className="text-lg font-semibold text-gray-900">{selectedRoom.currentBooking.guestName}</p></div><div className="grid grid-cols-2 gap-4"><div><p className="text-sm font-medium text-gray-500">Check-in</p><p className="text-gray-900">{formatDate(selectedRoom.currentBooking.checkIn, "short")}</p></div><div><p className="text-sm font-medium text-gray-500">Check-out</p><p className="text-gray-900">{formatDate(selectedRoom.currentBooking.checkOut, "short")}</p></div></div><div className="flex gap-3 pt-4"><a href={`/bookings/${selectedRoom.currentBooking.id}`} className="flex-1 rounded-lg bg-[#E17055] py-3 text-center text-sm font-medium text-white hover:bg-[#D35B3F]">View Booking</a><a href={`/bookings/${selectedRoom.currentBooking.id}/check-out`} className="flex-1 rounded-lg border border-gray-300 py-3 text-center text-sm font-medium text-gray-700 hover:bg-gray-50">Check-Out</a></div></> : <><p className="text-center text-gray-600">This room is currently vacant</p><div className="flex gap-3"><a href={`/bookings/new?room=${selectedRoom.id}`} className="flex-1 rounded-lg bg-[#E17055] py-3 text-center text-sm font-medium text-white hover:bg-[#D35B3F]">Book This Room</a></div></>}
            </div>
            <div className="border-t border-gray-200 px-6 py-4"><button onClick={() => setSelectedRoom(null)} className="w-full rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
