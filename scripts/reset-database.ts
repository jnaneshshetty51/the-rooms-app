/**
 * Database Reset Script for The Rooms Hotel
 *
 * This script clears all transactional data (bookings, payments, guests, etc.)
 * while preserving baseline data (rooms, amenities, users, discounts).
 *
 * Usage (from packages/db directory):
 *   DATABASE_URL=postgresql://... npx tsx ../../scripts/reset-database.ts
 *
 * WARNING: This will delete all bookings, guests, payments, invoices, etc.
 *          DO NOT run in production without a backup.
 */

// Use require for standalone execution
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Tables to clear (in order of dependencies - children first)
const TABLES_TO_CLEAR = [
    // Transactional data
    "BookingAddon",
    "RoomAmenity",
    "Invoice",
    "Payment",
    "Expense",
    "Complaint",
    "AuditLog",
    "Document",
    "Guest",
    "Booking",
    "Announcement",
    "DiscountUsage",
    "Feedback",
];

// Tables to preserve (baseline/reference data)
const TABLES_TO_PRESERVE = [
    "User",
    "Room",
    "Amenity",
    "Discount",
    "RoomPhoto",
];

async function resetDatabase() {
    console.log("\n⚠️  DATABASE RESET SCRIPT");
    console.log("⚠️  This will delete all transactional data!");
    console.log("⚠️  Press Ctrl+C to cancel...\n");

    // Wait 3 seconds before proceeding
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log("\n🔄 Starting database reset...\n");

    try {
        // Clear transactional tables
        for (const table of TABLES_TO_CLEAR) {
            try {
                await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
                console.log(`✓ Cleared: ${table}`);
            } catch (error) {
                // Table might not exist or be empty
                console.log(`○ Skipped: ${table} (${error instanceof Error ? error.message : "Unknown error"})`);
            }
        }

        // Reset room statuses to VACANT
        await prisma.room.updateMany({
            data: { status: "VACANT" },
        });
        console.log("✓ Reset all rooms to VACANT status");

        console.log("\n✅ Database reset complete!");
        console.log("\nBaseline data preserved:");
        console.log(`  - ${TABLES_TO_PRESERVE.length} tables preserved`);
        console.log("\nYou can now run the seed script to add fresh data:");
        console.log("  npx tsx prisma/seed.ts");

    } catch (error) {
        console.error("\n❌ Error during reset:", error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

resetDatabase()
    .catch((error) => {
        console.error("Fatal error:", error);
        process.exit(1);
    });
