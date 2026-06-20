-- Migration: Critical Backend Fixes
-- Date: 2024-06-19
-- Description: Adds composite indexes for room availability queries and sets cascade delete on Room→Booking

-- ─── Add Composite Indexes for Room Availability ─────────────────────────────────
-- These indexes optimize:
-- 1. Room availability checks (roomId + date range overlap)
-- 2. Property-based booking queries (propertyId + status + checkIn)
-- 3. Payment status queries by property (propertyId + paymentStatus)

CREATE INDEX IF NOT EXISTS "bookings_roomId_checkIn_checkOut_idx" 
    ON "bookings" ("roomId", "checkIn", "checkOut");

CREATE INDEX IF NOT EXISTS "bookings_propertyId_status_checkIn_idx" 
    ON "bookings" ("propertyId", "status", "checkIn");

CREATE INDEX IF NOT EXISTS "bookings_propertyId_paymentStatus_idx" 
    ON "bookings" ("propertyId", "paymentStatus");

-- ─── Update Foreign Key Constraint for Room→Booking ─────────────────────────────
-- Change the onDelete behavior from default (RESTRICT) to SET NULL
-- This means when a room is deleted, the booking's roomId will be set to NULL
-- instead of preventing the deletion or cascading it

-- First, drop the existing foreign key constraint
ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "bookings_roomId_fkey";

-- Then, re-create it with ON DELETE SET NULL
ALTER TABLE "bookings" 
    ADD CONSTRAINT "bookings_roomId_fkey" 
    FOREIGN KEY ("roomId") 
    REFERENCES "rooms"("id") 
    ON DELETE SET NULL 
    ON UPDATE CASCADE;

-- Note: If you have existing bookings that reference deleted rooms, 
-- those bookings will have their roomId set to NULL after this migration.
-- Run this query to identify affected bookings before proceeding:
-- SELECT id, "bookingNumber", "roomId" FROM "bookings" WHERE "roomId" IS NOT NULL AND "roomId" NOT IN (SELECT id FROM "rooms");

-- ─── Verify Indexes ─────────────────────────────────────────────────────────────
-- After running, verify with:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'bookings';
