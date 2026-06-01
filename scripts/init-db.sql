-- Initialize The Rooms database
-- This runs on first startup when POSTGRES_DB=the_rooms
-- Prisma migrations will be run separately via: npx prisma migrate deploy

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Note: Prisma manages all types via Migration system
