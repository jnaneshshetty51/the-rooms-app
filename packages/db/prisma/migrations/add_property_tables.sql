-- Migration: Add Multi-Property Support
-- Description: Adds Property model and propertyId to Room, Booking, Expense tables
-- Run this on both development and production databases

-- 1. Create Property table
CREATE TABLE IF NOT EXISTS "properties" (
    "id" TEXT NOT NULL DEFAULT cuid(),
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL UNIQUE,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "phone" TEXT,
    "email" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- 2. Create default property
INSERT INTO "properties" ("id", "name", "code", "address", "city", "country", "phone", "email", "isActive")
VALUES ('default', 'The Rooms', 'THEROOMS-001', 'MG Road', 'Bangalore', 'India', '+91-80-4567-8900', 'info@therooms.in', true)
ON CONFLICT (code) DO NOTHING;

-- 3. Create UserPropertyAccess table
CREATE TABLE IF NOT EXISTS "user_property_access" (
    "id" TEXT NOT NULL DEFAULT cuid(),
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_property_access_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_property_access_userId_propertyId_key" UNIQUE ("userId", "propertyId"),
    CONSTRAINT "user_property_access_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 4. Add propertyId to rooms table
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "propertyId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON UPDATE CASCADE;

-- 5. Add propertyId to bookings table
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "propertyId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON UPDATE CASCADE;

-- 6. Add propertyId to expenses table
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "propertyId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON UPDATE CASCADE;

-- 7. Create index for faster property-based queries
CREATE INDEX IF NOT EXISTS "rooms_propertyId_idx" ON "rooms"("propertyId");
CREATE INDEX IF NOT EXISTS "bookings_propertyId_idx" ON "bookings"("propertyId");
CREATE INDEX IF NOT EXISTS "expenses_propertyId_idx" ON "expenses"("propertyId");
CREATE INDEX IF NOT EXISTS "user_property_access_propertyId_idx" ON "user_property_access"("propertyId");

-- 8. Grant SUPER_ADMIN users access to the default property
-- This gives all existing admins access to the default property
INSERT INTO "user_property_access" ("userId", "propertyId", "role")
SELECT id, 'default', 'ADMIN'
FROM "users"
WHERE role IN ('SUPER_ADMIN', 'ADMIN')
ON CONFLICT (userId, propertyId) DO NOTHING;

-- 9. Add comment
COMMENT ON TABLE "properties" IS 'Multi-property support - stores hotel property information';
COMMENT ON TABLE "user_property_access" IS 'Many-to-many relation between users and properties with role-based access';