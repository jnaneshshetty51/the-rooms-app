"use client";

import { cn } from "../../lib/utils";

type RoomType = "STUDIO" | "PREMIUM" | "DELUXE" | "SUITE";

interface RoomTypeBadgeProps {
  type: RoomType;
  className?: string;
}

const ROOM_TYPE_STYLES: Record<RoomType, { variant: "default" | "secondary"; label: string }> = {
  STUDIO: { variant: "default", label: "STUDIO" },
  PREMIUM: { variant: "secondary", label: "PREMIUM" },
  DELUXE: { variant: "default", label: "DELUXE" },
  SUITE: { variant: "secondary", label: "SUITE" },
};

export function RoomTypeBadge({ type, className }: RoomTypeBadgeProps) {
  const { label } = ROOM_TYPE_STYLES[type];
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide",
        type === "PREMIUM" || type === "SUITE"
          ? "bg-secondary text-secondary-foreground"
          : "bg-primary text-primary-foreground",
        className
      )}
    >
      {label}
    </span>
  );
}
