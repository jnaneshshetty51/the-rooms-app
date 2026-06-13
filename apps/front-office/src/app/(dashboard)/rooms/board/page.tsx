"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@the-rooms/ui";
import { Bed, Users, Wrench, Lock, Loader2, RefreshCw, Sparkles, Trash2, Clock, Bell } from "lucide-react";
import { formatDate } from "@the-rooms/ui";

interface CurrentBooking {
  id: string;
  bookingNumber: string | null;
  guestName: string;
  guestPhone: string | null;
  checkIn: string;
  checkOut: string;
  status: string;
  arrivingToday: boolean;
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
  arrivingToday: number;
}

const STATUS_CONFIG = {
  VACANT:      { label: "Vacant",      bgColor: "bg-green-100",  borderColor: "border-green-300",  textColor: "text-green-800",  icon: Bed },
  BOOKED:      { label: "Booked",      bgColor: "bg-purple-100", borderColor: "border-purple-300", textColor: "text-purple-800", icon: Lock },
  OCCUPIED:    { label: "Occupied",    bgColor: "bg-blue-100",   borderColor: "border-blue-300",   textColor: "text-blue-800",   icon: Users },
  MAINTENANCE: { label: "Maintenance", bgColor: "bg-yellow-100", borderColor: "border-yellow-300", textColor: "text-yellow-800", icon: Wrench },
  BLOCKED:     { label: "Blocked",     bgColor: "bg-gray-100",   borderColor: "border-gray-300",   textColor: "text-gray-800",   icon: Lock },
};

export default function RoomBoardPage() {
  const [data, setData] = useState<RoomBoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selectedRoom, setSelectedRoom] = useState<RoomEntry | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchRoomBoard = useCallback(async () => {
    try {
      const res = await fetch("/api/rooms/board");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoomBoard(); }, [fetchRoomBoard]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchRoomBoard, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchRoomBoard]);

  const filteredRooms = data?.rooms.filter((room) => {
    if (filter === "all") return true;
    if (filter === "arriving") return room.currentBooking?.arrivingToday;
    return room.status === filter.toUpperCase();
  }) ?? [];

  const roomsByFloor = filteredRooms.reduce((acc, room) => {
    if (!acc[room.floor]) acc[room.floor] = [];
    acc[room.floor].push(room);
    return acc;
  }, {} as Record<number, RoomEntry[]>);

  const floors = Object.keys(roomsByFloor).map(Number).sort((a, b) => a - b);
  const occupancyPercent = data?.totalRooms ? Math.round((data.occupied / data.totalRooms) * 100) : 0;

  if (loading && !data) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#E17055]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Room Board</h2>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm">
            <span className="text-gray-500">{data?.totalRooms ?? 0} rooms</span>
            <span className="text-gray-300">·</span>
            <span className="font-medium text-blue-600">In-house: {data?.occupied ?? 0} ({occupancyPercent}%)</span>
            {(data?.arrivingToday ?? 0) > 0 && (
              <>
                <span className="text-gray-300">·</span>
                <span className="font-medium text-orange-600">Arriving today: {data?.arrivingToday}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
              autoRefresh ? "border-green-300 bg-green-50 text-green-700" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            )}
          >
            <RefreshCw className={cn("h-4 w-4", autoRefresh && "animate-spin")} />
            {autoRefresh ? "Auto" : "Paused"}
          </button>
          <button onClick={fetchRoomBoard} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {([
          { key: "all",         label: "All",        count: data?.totalRooms ?? 0,   colorClass: "text-gray-600",   activeRing: "ring-gray-400",   activeBg: "bg-gray-50",     Icon: Bed },
          { key: "vacant",      label: "Vacant",     count: data?.vacant ?? 0,       colorClass: "text-green-600",  activeRing: "ring-green-400",  activeBg: "bg-green-50",    Icon: Bed },
          { key: "booked",      label: "Booked",     count: data?.booked ?? 0,       colorClass: "text-purple-600", activeRing: "ring-purple-400", activeBg: "bg-purple-50",   Icon: Lock },
          { key: "occupied",    label: "In-House",   count: data?.occupied ?? 0,     colorClass: "text-blue-600",   activeRing: "ring-blue-400",   activeBg: "bg-blue-50",     Icon: Users },
          { key: "arriving",    label: "Arriving",   count: data?.arrivingToday ?? 0,colorClass: "text-orange-600", activeRing: "ring-orange-400", activeBg: "bg-orange-50",   Icon: Bell },
          { key: "maintenance", label: "Maint.",     count: data?.maintenance ?? 0,  colorClass: "text-yellow-600", activeRing: "ring-yellow-400", activeBg: "bg-yellow-50",   Icon: Wrench },
        ] as const).map(({ key, label, count, colorClass, activeRing, activeBg, Icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              "rounded-xl border p-4 text-left transition-all",
              filter === key ? `ring-2 ${activeRing} ${activeBg} border-transparent` : "border-gray-200 bg-white hover:border-gray-300"
            )}
          >
            <div className="flex items-center justify-between">
              <Icon className={cn("h-5 w-5", colorClass)} />
              <span className="text-xl font-bold text-gray-900">{count}</span>
            </div>
            <p className={cn("mt-1.5 text-xs font-semibold", colorClass)}>{label}</p>
          </button>
        ))}
      </div>

      {/* Room grid by floor */}
      <div className="space-y-6">
        {floors.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
            <p className="text-gray-400">No rooms match this filter.</p>
          </div>
        ) : floors.map((floor) => (
          <div key={floor}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-500">Floor {floor}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {roomsByFloor[floor].map((room) => {
                const config = STATUS_CONFIG[room.status];
                const StatusIcon = config.icon;
                const isSelected = selectedRoom?.id === room.id;
                const arriving = room.currentBooking?.arrivingToday;

                return (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoom(isSelected ? null : room)}
                    className={cn(
                      "relative rounded-xl border-2 p-3 text-left transition-all min-h-[120px]",
                      arriving ? "border-orange-400 bg-orange-50" : `${config.borderColor} ${config.bgColor}`,
                      isSelected && "ring-2 ring-[#E17055] ring-offset-1"
                    )}
                  >
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

      {/* Room detail popup */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedRoom(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className={cn("p-5 rounded-t-2xl", selectedRoom.currentBooking?.arrivingToday ? "bg-orange-50" : STATUS_CONFIG[selectedRoom.status].bgColor)}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Room {selectedRoom.roomNumber}</h3>
                  <p className="text-sm text-gray-500">{selectedRoom.type} · Floor {selectedRoom.floor}</p>
                </div>
                <span className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold border",
                  selectedRoom.currentBooking?.arrivingToday
                    ? "bg-orange-100 border-orange-300 text-orange-800"
                    : `${STATUS_CONFIG[selectedRoom.status].bgColor} border ${STATUS_CONFIG[selectedRoom.status].borderColor} ${STATUS_CONFIG[selectedRoom.status].textColor}`
                )}>
                  {selectedRoom.currentBooking?.arrivingToday ? "Arriving Today" : STATUS_CONFIG[selectedRoom.status].label}
                </span>
              </div>
            </div>

            <div className="p-5 space-y-4">
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
                      View Booking
                    </a>
                    {selectedRoom.currentBooking.arrivingToday && (
                      <a href={`/bookings/${selectedRoom.currentBooking.id}/check-in`} className="flex-1 rounded-lg bg-green-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-green-700">
                        Check In
                      </a>
                    )}
                    {selectedRoom.status === "OCCUPIED" && (
                      <a href={`/bookings/${selectedRoom.currentBooking.id}/check-out`} className="flex-1 rounded-lg border border-gray-300 py-2.5 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50">
                        Check Out
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-center text-sm text-gray-500 py-2">This room is vacant and available for booking.</p>
                  <a href={`/bookings/new?room=${selectedRoom.id}`} className="block w-full rounded-lg bg-[#E17055] py-2.5 text-center text-sm font-semibold text-white hover:bg-[#D35B3F]">
                    Book This Room
                  </a>
                </>
              )}
            </div>
            <div className="border-t px-5 py-3">
              <button onClick={() => setSelectedRoom(null)} className="w-full rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
