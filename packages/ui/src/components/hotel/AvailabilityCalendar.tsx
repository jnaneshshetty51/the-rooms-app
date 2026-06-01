"use client";

import { cn } from "../../lib/utils";
import type { RoomStatus } from "../../lib/utils";

interface AvailabilityCalendarProps {
  dateRange: { start: Date; end: Date };
  rooms: Array<{
    id: string;
    roomNumber: string;
    availability: Record<string, RoomStatus>;
  }>;
  onCellClick?: (roomId: string, date: string) => void;
  className?: string;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const STATUS_BG: Record<RoomStatus, string> = {
  VACANT: "bg-vacant/20",
  OCCUPIED: "bg-occupied/20",
  MAINTENANCE: "bg-maintenance/20",
  BLOCKED: "bg-gray-200",
};

export function AvailabilityCalendar({ dateRange, rooms, onCellClick, className }: AvailabilityCalendarProps) {
  const days: Date[] = [];
  const start = new Date(dateRange.start);
  const end = new Date(dateRange.end);
  let current = start;
  while (current <= end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="p-2 text-left font-medium text-muted-foreground sticky left-0 bg-background z-10 min-w-[80px]">
              Room
            </th>
            {days.map((day) => (
              <th
                key={day.toISOString()}
                className={cn(
                  "p-1.5 text-center font-medium min-w-[36px]",
                  day.getDay() === 0 || day.getDay() === 6 ? "bg-accent/50" : ""
                )}
              >
                <div className="rotate-[-30deg] origin-left text-[10px] text-muted-foreground">
                  {DAY_LABELS[day.getDay()]} {day.getDate()}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rooms.map((room) => (
            <tr key={room.id} className="border-t">
              <td className="p-2 font-medium text-muted-foreground sticky left-0 bg-card z-10 whitespace-nowrap">
                {room.roomNumber}
              </td>
              {days.map((day) => {
                const dateKey = day.toISOString().split("T")[0];
                const status = room.availability[dateKey] ?? "VACANT";
                return (
                  <td
                    key={dateKey}
                    className={cn(
                      "h-8 border-l border-border text-center cursor-pointer hover:opacity-80 transition-opacity",
                      STATUS_BG[status]
                    )}
                    onClick={() => onCellClick?.(room.id, dateKey)}
                    title={status}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
