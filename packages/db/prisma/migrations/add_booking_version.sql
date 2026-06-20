-- Add version column for optimistic locking
ALTER TABLE "Booking" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;