// packages/types/index.ts
// Shared TypeScript types across all The Rooms apps

// ─── Roles ──────────────────────────────────────────────────────────────────
export type Role = "SUPER_ADMIN" | "ADMIN" | "FRONT_OFFICE" | "GUEST";

// ─── Room Types ─────────────────────────────────────────────────────────────
export type RoomType = "STUDIO" | "PREMIUM";
export type RoomStatus = "VACANT" | "OCCUPIED" | "MAINTENANCE" | "BLOCKED";

// ─── Booking Types ───────────────────────────────────────────────────────────
export type BookingType = "DAILY" | "MONTHLY";
export type BookingStatus = "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED" | "NO_SHOW";
export type BookingSource = "WEBSITE" | "WALK_IN" | "PHONE" | "OTA";
export type PaymentStatus = "PENDING" | "PAID" | "REFUNDED" | "FAILED" | "PARTIAL";
export type PaymentMethod = "ONLINE" | "UPI" | "CARD" | "CASH" | "BANK_TRANSFER" | "CORPORATE_INVOICE";
export type DocumentType = "AADHAAR" | "PASSPORT" | "VOTER_ID" | "DRIVING_LICENSE";

// ─── Expense Types ───────────────────────────────────────────────────────────
export type ExpenseCategory =
  | "UTILITIES"
  | "SALARIES"
  | "MAINTENANCE"
  | "SUPPLIES"
  | "MARKETING"
  | "INSURANCE"
  | "TAXES"
  | "OTHER";

// ─── API Response Types ───────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
    hasNextPage?: boolean;
  };
}

// ─── User ───────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name?: string;
  role: Role;
  isActive: boolean;
  lastLogin?: string | null;
  createdAt: string;
}

// ─── Session ─────────────────────────────────────────────────────────────────
export interface SessionUser {
  id: string;
  email: string;
  name?: string;
  role: Role;
}
