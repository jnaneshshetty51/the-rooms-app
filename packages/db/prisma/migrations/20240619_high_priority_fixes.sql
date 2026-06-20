-- Migration: 20240619_high_priority_fixes.sql
-- High Priority Backend Fixes

-- ── Fix 1 & 4: User.lockedUntil field for time-based lockout reset ──────────────
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3);

-- Index on lockedUntil for efficient lockout queries
CREATE INDEX IF NOT EXISTS "idx_users_lockedUntil" ON "users"("lockedUntil");

-- ── Fix 2: RoomCharge unique constraint to prevent duplicate charges ────────────
-- First drop the existing index and add a unique constraint
ALTER TABLE "room_charges" ADD CONSTRAINT "room_charges_bookingId_chargeDate_unique" 
  UNIQUE ("bookingId", "chargeDate");

-- ── Fix 5: GuestBlacklist.expiresAt index for efficient expiry queries ───────────
CREATE INDEX IF NOT EXISTS "idx_guest_blacklist_expiresAt" ON "guest_blacklist"("expiresAt");

-- ── Fix 6: AuditLog composite index for entity+createdAt reports ────────────────
CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity_createdAt" ON "audit_logs"("entity", "createdAt");