"use client";

import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";
import { RoomTypeBadge } from "./RoomTypeBadge";
import { StatusIndicator } from "./StatusIndicator";
import { cn, formatCurrency } from "../../lib/utils";
import type { RoomStatus } from "../../lib/utils";

interface RoomCardProps {
  roomNumber: string;
  roomType: "STUDIO" | "PREMIUM" | "DELUXE" | "SUITE";
  price: number;
  status: RoomStatus;
  thumbnail?: string;
  features?: string[];
  onClick?: () => void;
  className?: string;
}

export function RoomCard({
  roomNumber,
  roomType,
  price,
  status,
  thumbnail,
  features = [],
  onClick,
  className,
}: RoomCardProps) {
  return (
    <Card
      className={cn("overflow-hidden hover:shadow-md transition-shadow cursor-pointer", className)}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative h-36 bg-accent overflow-hidden">
        {thumbnail ? (
          <img src={thumbnail} alt={`Room ${roomNumber}`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-muted-foreground/30">
              <rect x="4" y="12" width="40" height="28" rx="2" stroke="currentColor" strokeWidth="2" />
              <rect x="8" y="16" width="14" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
              <rect x="26" y="16" width="14" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
              <line x1="4" y1="30" x2="44" y2="30" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
        )}
        {/* Room number overlay */}
        <div className="absolute top-2 left-2 rounded-md bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">
          {roomNumber}
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <RoomTypeBadge type={roomType} />
          <StatusIndicator status={status} />
        </div>

        <div>
          <p className="text-2xl font-bold text-primary font-heading">{formatCurrency(price)}</p>
          <p className="text-xs text-muted-foreground">per night</p>
        </div>

        {features.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {features.slice(0, 3).map((feat) => (
              <Badge key={feat} variant="outline" className="text-[10px]">
                {feat}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
