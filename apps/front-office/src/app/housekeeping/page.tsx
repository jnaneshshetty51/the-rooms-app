"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@the-rooms/ui";
import { Loader2, Sparkles, AlertCircle, Clock, Trash2, Home, User } from "lucide-react";
import { signOut } from "next-auth/react";

interface Room {
  id: string;
  roomNumber: string;
  floor: number;
  status: string;
  cleaningStatus: "CLEAN" | "DIRTY" | "CLEANING";
  type: string;
}

export default function HousekeepingDashboard() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "DIRTY" | "CLEANING">("DIRTY");
  
  useEffect(() => {
    async function fetchRooms() {
      try {
        const res = await fetch("/api/housekeeping/rooms");
        if (res.ok) {
          const data = await res.json();
          setRooms(data);
        }
      } catch (e) {
        console.error("Failed to load rooms", e);
      } finally {
        setLoading(false);
      }
    }
    fetchRooms();
  }, []);

  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  const filteredRooms = rooms.filter(r => {
    if (filter === "ALL") return true;
    return r.cleaningStatus === filter;
  });

  const dirtyCount = rooms.filter(r => r.cleaningStatus === "DIRTY").length;
  const cleaningCount = rooms.filter(r => r.cleaningStatus === "CLEANING").length;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Housekeeping</h1>
          <p className="text-sm text-gray-500">Today's Tasks</p>
        </div>
        <button onClick={handleLogout} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200">
          <User className="w-5 h-5 text-gray-600" />
        </button>
      </header>

      <div className="p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div onClick={() => setFilter("DIRTY")} className={cn("p-4 rounded-xl border cursor-pointer transition-all", filter === "DIRTY" ? "border-red-400 bg-red-50 ring-2 ring-red-400" : "bg-white border-gray-200")}>
            <div className="flex items-center gap-2 mb-1">
              <Trash2 className={cn("w-5 h-5", filter === "DIRTY" ? "text-red-600" : "text-gray-400")} />
              <span className="font-semibold text-gray-900">Dirty</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{dirtyCount}</p>
          </div>
          <div onClick={() => setFilter("CLEANING")} className={cn("p-4 rounded-xl border cursor-pointer transition-all", filter === "CLEANING" ? "border-blue-400 bg-blue-50 ring-2 ring-blue-400" : "bg-white border-gray-200")}>
            <div className="flex items-center gap-2 mb-1">
              <Clock className={cn("w-5 h-5", filter === "CLEANING" ? "text-blue-600" : "text-gray-400")} />
              <span className="font-semibold text-gray-900">In Progress</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{cleaningCount}</p>
          </div>
        </div>

        <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar">
          <button onClick={() => setFilter("DIRTY")} className={cn("px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap", filter === "DIRTY" ? "bg-gray-900 text-white" : "bg-white border text-gray-600")}>To Clean ({dirtyCount})</button>
          <button onClick={() => setFilter("CLEANING")} className={cn("px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap", filter === "CLEANING" ? "bg-gray-900 text-white" : "bg-white border text-gray-600")}>In Progress ({cleaningCount})</button>
          <button onClick={() => setFilter("ALL")} className={cn("px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap", filter === "ALL" ? "bg-gray-900 text-white" : "bg-white border text-gray-600")}>All Rooms</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border">
            <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No rooms found in this view.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRooms.map(room => (
              <Link href={`/housekeeping/${room.id}`} key={room.id} className="block bg-white p-4 rounded-xl border shadow-sm active:scale-[0.98] transition-transform">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", 
                      room.cleaningStatus === "DIRTY" ? "bg-red-100" : 
                      room.cleaningStatus === "CLEANING" ? "bg-blue-100" : "bg-green-100"
                    )}>
                      {room.cleaningStatus === "DIRTY" ? <Trash2 className="w-6 h-6 text-red-600" /> : 
                       room.cleaningStatus === "CLEANING" ? <Clock className="w-6 h-6 text-blue-600" /> : 
                       <Sparkles className="w-6 h-6 text-green-600" />}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Room {room.roomNumber}</h3>
                      <p className="text-sm text-gray-500">Floor {room.floor} • {room.type}</p>
                    </div>
                  </div>
                  {room.status === "MAINTENANCE" && (
                    <span className="flex flex-col items-center gap-1 text-xs font-medium text-yellow-600">
                      <AlertCircle className="w-5 h-5" />
                      Maintenance
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
