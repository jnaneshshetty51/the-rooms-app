"use client";

import { cn } from "../../lib/utils";
import type { RoomStatus } from "../../lib/utils";

interface StatusIndicatorProps {
  status: RoomStatus;
  showLabel?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<RoomStatus, { color: string; label: string }> = {
  VACANT: { color: "bg-vacant", label: "Vacant" },
  OCCUPIED: { color: "bg-occupied", label: "Occupied" },
  MAINTENANCE: { color: "bg-maintenance", label: "Maintenance" },
  BLOCKED: { color: "bg-blocked", label: "Blocked" },
};

export function StatusIndicator({ status, showLabel = false, className }: StatusIndicatorProps) {
  const { color, label } = STATUS_CONFIG[status];
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span className={cn("block h-2 w-2 rounded-full", color)} />
      {showLabel && <span className="text-xs text-muted-foreground">{label}</span>}
    </div>
  );
}
