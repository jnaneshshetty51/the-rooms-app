"use client";

import { useState } from "react";
import { cn } from "@the-rooms/ui";

const ROOMS = [
  ...Array.from({ length: 18 }, (_, i) => ({
    roomNumber: `S${String(i + 101).padStart(3, "0")}`,
    type: "STUDIO",
    floor: Math.floor(i / 5) + 1,
    status: (["VACANT", "OCCUPIED", "MAINTENANCE", "VACANT", "VACANT"] as const)[i % 5],
  })),
  ...Array.from({ length: 18 }, (_, i) => ({
    roomNumber: `P${String(i + 101).padStart(3, "0")}`,
    type: "PREMIUM",
    floor: Math.floor(i / 4) + 5,
    status: (["VACANT", "VACANT", "OCCUPIED", "VACANT"] as const)[i % 4],
  })),
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function AvailabilityCalendarPage() {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [filterType, setFilterType] = useState<"ALL" | "STUDIO" | "PREMIUM">("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "VACANT">("ALL");

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const filteredRooms = ROOMS.filter((r) => {
    if (filterType !== "ALL" && r.type !== filterType) return false;
    if (filterStatus !== "ALL" && r.status !== filterStatus) return false;
    return true;
  });

  const vacantCount = ROOMS.filter((r) => r.status === "VACANT").length;
  const occupiedCount = ROOMS.filter((r) => r.status === "OCCUPIED").length;
  const maintenanceCount = ROOMS.filter((r) => r.status === "MAINTENANCE").length;

  return (
    <div className="pt-20">
      {/* Header */}
      <div className="bg-primary text-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-4">
            Room Availability
          </h1>
          <p className="text-white/70 text-lg max-w-2xl">
            Check real-time room availability. Updated every 30 seconds.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Vacant", value: vacantCount, color: "text-vacant", bg: "bg-vacant/10" },
            { label: "Occupied", value: occupiedCount, color: "text-occupied", bg: "bg-occupied/10" },
            { label: "Maintenance", value: maintenanceCount, color: "text-maintenance", bg: "bg-maintenance/10" },
          ].map((stat) => (
            <div key={stat.label} className={cn("rounded-xl p-4 text-center", stat.bg)}>
              <div className={cn("font-heading text-3xl font-bold", stat.color)}>{stat.value}</div>
              <div className="text-sm text-muted">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          {(["ALL", "STUDIO", "PREMIUM"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-semibold transition-colors",
                filterType === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent text-primary hover:bg-accent/80"
              )}
            >
              {t === "ALL" ? "All Rooms" : t}
            </button>
          ))}
          <button
            onClick={() => setFilterStatus(filterStatus === "ALL" ? "VACANT" : "ALL")}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-semibold transition-colors",
              filterStatus !== "ALL"
                ? "bg-vacant text-white"
                : "bg-accent text-primary hover:bg-accent/80"
            )}
          >
            {filterStatus === "ALL" ? "Show All" : "Vacant Only"}
          </button>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-accent transition-colors">
            ←
          </button>
          <h2 className="font-heading font-bold text-lg text-primary">
            {MONTHS[viewMonth]} {viewYear}
          </h2>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-accent transition-colors">
            →
          </button>
        </div>

        {/* Room Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredRooms.map((room) => (
            <div
              key={room.roomNumber}
              className={cn(
                "rounded-xl border p-4 transition-all",
                room.status === "VACANT" && "border-vacant/30 bg-vacant/5 hover:shadow-sm",
                room.status === "OCCUPIED" && "border-occupied/30 bg-occupied/5 opacity-70",
                room.status === "MAINTENANCE" && "border-maintenance/30 bg-maintenance/5"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-heading font-bold text-primary">{room.roomNumber}</span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-xs font-bold",
                  room.type === "STUDIO" ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"
                )}>
                  {room.type}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  room.status === "VACANT" && "bg-vacant",
                  room.status === "OCCUPIED" && "bg-occupied",
                  room.status === "MAINTENANCE" && "bg-maintenance"
                )} />
                <span className="text-xs text-muted font-medium">{room.status}</span>
              </div>
              {room.status === "VACANT" && (
                <a
                  href={`/book?room=${room.roomNumber}`}
                  className="mt-3 block w-full py-2 bg-vacant text-white text-xs font-semibold rounded-lg text-center hover:bg-vacant/90 transition-colors"
                >
                  Book Now
                </a>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-muted mt-6 text-center">
          * Availability shown is for today ({new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}). Select a date above to check availability for a specific date.
        </p>
      </div>
    </div>
  );
}
