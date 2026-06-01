"use client";

import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";
import { BOOKING_STATUS_VARIANT, PAYMENT_STATUS_VARIANT, ROOM_STATUS_VARIANT } from "../../lib/utils";
import type { BookingStatus, PaymentStatus, RoomStatus } from "../../lib/utils";

type Status = BookingStatus | PaymentStatus | RoomStatus;

interface StatusBadgeProps {
  status: Status;
  type?: "booking" | "payment" | "room";
  className?: string;
}

const STATUS_LABELS: Record<Status, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CHECKED_IN: "Checked In",
  CHECKED_OUT: "Checked Out",
  CANCELLED: "Cancelled",
  PARTIAL: "Partial",
  PAID: "Paid",
  REFUNDED: "Refunded",
  FAILED: "Failed",
  VACANT: "Vacant",
  OCCUPIED: "Occupied",
  MAINTENANCE: "Maintenance",
  BLOCKED: "Blocked",
};

export function StatusBadge({ status, type = "booking", className }: StatusBadgeProps) {
  const variantMap =
    type === "booking"
      ? BOOKING_STATUS_VARIANT
      : type === "payment"
      ? PAYMENT_STATUS_VARIANT
      : ROOM_STATUS_VARIANT;

  const variant = (variantMap[status as keyof typeof variantMap] as string) || "outline";

  return (
    <Badge
      variant={variant as "default" | "secondary" | "destructive" | "success" | "warning" | "outline" | "vacant" | "occupied" | "maintenance" | "booked" | "checked_in" | "checked_out" | "cancelled"}
      className={cn("capitalize font-medium", className)}
    >
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
