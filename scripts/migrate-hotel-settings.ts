/**
 * Migration Script: HotelSettings Singleton to Per-Property
 * 
 * This script migrates the singleton HotelSettings (id: "default") to
 * per-property HotelSettings records.
 * 
 * Usage (from packages/db directory):
 *   DATABASE_URL=postgresql://... npx tsx ../../scripts/migrate-hotel-settings.ts
 * 
 * WARNING: Take a backup before running this script.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function migrateHotelSettings() {
    console.log("\n📦 HotelSettings Migration: Singleton → Per-Property\n");

    try {
        // Step 1: Read existing default settings (if any)
        const defaultSettings = await prisma.hotelSettings.findUnique({
            where: { id: "default" }
        });

        if (!defaultSettings) {
            console.log("ℹ️  No existing HotelSettings found with id='default'");
            console.log("ℹ️  Each property will get empty settings on first access.\n");

            // Just verify properties exist
            const propertyCount = await prisma.property.count();
            console.log(`ℹ️  Found ${propertyCount} properties in the database.`);
            console.log("✅ Migration check complete - no data to migrate.\n");
            return;
        }

        console.log("✅ Found existing HotelSettings with id='default'");
        console.log(`   Hotel Name: ${defaultSettings.hotelName}`);
        console.log(`   Address: ${defaultSettings.address || "N/A"}`);

        // Step 2: Get all properties
        const properties = await prisma.property.findMany({
            select: { id: true, name: true }
        });

        console.log(`\n📋 Found ${properties.length} properties`);

        if (properties.length === 0) {
            console.log("⚠️  No properties found. Cannot migrate settings.");
            return;
        }

        // Step 3: Check if any properties already have settings
        const existingPropertySettings = await prisma.hotelSettings.findMany({
            where: {
                propertyId: { in: properties.map(p => p.id) }
            },
            select: { propertyId: true }
        });

        const propertiesWithSettings = new Set(existingPropertySettings.map(s => s.propertyId));
        const propertiesWithoutSettings = properties.filter(p => !propertiesWithSettings.has(p.id));

        console.log(`   - ${propertiesWithSettings.size} already have settings`);
        console.log(`   - ${propertiesWithoutSettings.length} need new settings`);

        // Step 4: Migrate default settings to each property that doesn't have settings
        let migratedCount = 0;
        for (const property of propertiesWithoutSettings) {
            await prisma.hotelSettings.create({
                data: {
                    propertyId: property.id,
                    hotelName: defaultSettings.hotelName,
                    address: defaultSettings.address,
                    phone: defaultSettings.phone,
                    email: defaultSettings.email,
                    checkInTime: defaultSettings.checkInTime,
                    checkOutTime: defaultSettings.checkOutTime,
                    lateCheckOutFee: defaultSettings.lateCheckOutFee,
                    earlyCheckInFee: defaultSettings.earlyCheckInFee,
                    extraGuestRateDaily: defaultSettings.extraGuestRateDaily,
                    gstNumber: defaultSettings.gstNumber,
                    bankName: defaultSettings.bankName,
                    accountNumber: defaultSettings.accountNumber,
                    ifscCode: defaultSettings.ifscCode,
                    cancellationPolicy: defaultSettings.cancellationPolicy,
                    noShowChargeType: defaultSettings.noShowChargeType,
                    noShowChargeValue: defaultSettings.noShowChargeValue,
                    noShowCutoffHour: defaultSettings.noShowCutoffHour,
                    noShowEnabled: defaultSettings.noShowEnabled,
                    earlyCheckinEnabled: defaultSettings.earlyCheckinEnabled,
                    earlyCheckinCutoffHour: defaultSettings.earlyCheckinCutoffHour,
                    earlyCheckinChargeType: defaultSettings.earlyCheckinChargeType,
                    lateCheckoutEnabled: defaultSettings.lateCheckoutEnabled,
                    lateCheckoutCutoffHour: defaultSettings.lateCheckoutCutoffHour,
                    lateCheckoutChargeType: defaultSettings.lateCheckoutChargeType,
                    lateCheckoutMaxHour: defaultSettings.lateCheckoutMaxHour,
                    lateCheckoutFee: defaultSettings.lateCheckoutFee,
                    emailOnBooking: defaultSettings.emailOnBooking,
                    emailOnCancel: defaultSettings.emailOnCancel,
                    dailyReport: defaultSettings.dailyReport,
                    maintenanceAlerts: defaultSettings.maintenanceAlerts,
                }
            });
            migratedCount++;
            console.log(`   ✅ Created settings for: ${property.name} (${property.id})`);
        }

        // Step 5: Delete the old default settings
        console.log(`\n🗑️  Deleting old default settings...`);
        await prisma.hotelSettings.delete({
            where: { id: "default" }
        });
        console.log("   ✅ Deleted HotelSettings with id='default'");

        console.log(`\n✅ Migration complete!`);
        console.log(`   - Migrated settings to ${migratedCount} properties`);
        console.log(`   - Deleted 1 singleton record`);
        console.log(`   - ${propertiesWithSettings.size} properties kept their existing settings\n`);

    } catch (error) {
        console.error("\n❌ Migration failed:", error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

migrateHotelSettings()
    .then(() => {
        console.log("Migration script finished.");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Migration script failed:", error);
        process.exit(1);
    });
