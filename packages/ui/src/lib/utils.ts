import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// ─── Core utility ────────────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Currency ────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Date ────────────────────────────────────────────────────────────────────

export function formatDate(date: Date | string, format: "short" | "long" | "full" = "short"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";

  const options: Intl.DateTimeFormatOptions =
    format === "short"
      ? { day: "2-digit", month: "short", year: "numeric" }
      : format === "long"
      ? { day: "2-digit", month: "long", year: "numeric" }
      : { weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" };

  return new Intl.DateTimeFormat("en-IN", options).format(d);
}

// ─── Phone ───────────────────────────────────────────────────────────────────

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return phone;
}

// ─── Truncate ────────────────────────────────────────────────────────────────

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length).trimEnd() + "…";
}

// ─── Initials ────────────────────────────────────────────────────────────────

export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

// ─── Status helpers ─────────────────────────────────────────────────────────

export type BookingStatus = "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED";
export type RoomStatus = "VACANT" | "OCCUPIED" | "MAINTENANCE" | "BLOCKED";
export type PaymentStatus = "PENDING" | "PARTIAL" | "PAID" | "REFUNDED" | "FAILED";

export const BOOKING_STATUS_VARIANT: Record<BookingStatus, string> = {
  PENDING: "warning",
  CONFIRMED: "success",
  CHECKED_IN: "primary",
  CHECKED_OUT: "secondary",
  CANCELLED: "destructive",
};

export const ROOM_STATUS_VARIANT: Record<RoomStatus, string> = {
  VACANT: "vacant",
  OCCUPIED: "occupied",
  MAINTENANCE: "maintenance",
  BLOCKED: "blocked",
};

export const PAYMENT_STATUS_VARIANT: Record<PaymentStatus, string> = {
  PENDING: "warning",
  PARTIAL: "secondary",
  PAID: "success",
  REFUNDED: "outline",
  FAILED: "destructive",
};
