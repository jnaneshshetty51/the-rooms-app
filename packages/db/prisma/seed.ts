/**
 * Database seed script for The Rooms Hotel
 *
 * Usage:
 *   DATABASE_URL=postgresql://... npx tsx prisma/seed.ts
 *
 * Run after: npx prisma migrate dev / npx prisma db push
 */

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

// ── Helpers ───────────────────────────────────────────────────────────────
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// ── Seed Functions ──────────────────────────────────────────────────────────

async function seedAmenities() {
  const amenities = [
    { name: 'WiFi',             icon: 'Wifi',     category: 'ESSENTIAL',     description: 'High-speed wireless internet' },
    { name: 'Air Conditioning', icon: 'AirVent',  category: 'ESSENTIAL',     description: 'Split AC with temperature control' },
    { name: 'Power Backup',     icon: 'Zap',      category: 'ESSENTIAL',     description: 'Generator backup for uninterrupted power' },
    { name: 'Hot Water',        icon: 'Droplets', category: 'ESSENTIAL',     description: '24/7 solar + electric hot water' },
    { name: 'Housekeeping',     icon: 'Sparkles',  category: 'ESSENTIAL',     description: 'Daily housekeeping service' },
    { name: 'Parking',         icon: 'Car',       category: 'ESSENTIAL',     description: 'Secure on-site parking space' },
    { name: 'CCTV Security',    icon: 'Shield',    category: 'ESSENTIAL',     description: '24/7 CCTV surveillance' },
    { name: 'Smart TV',        icon: 'Tv',        category: 'ENTERTAINMENT', description: '43" Android smart TV with OTT apps' },
    { name: 'Coffee Machine',   icon: 'Coffee',    category: 'COMFORT',       description: 'Nespresso-style pod coffee machine' },
    { name: 'Room Service',    icon: 'Bell',      category: 'COMFORT',       description: 'In-room dining service' },
    { name: 'Work Desk',       icon: 'Laptop',    category: 'BUSINESS',      description: 'Ergonomic work desk with USB charging' },
    { name: 'Iron & Board',    icon: 'Iron',      category: 'COMFORT',        description: 'Steam iron and ironing board' },
    { name: 'Mini Bar',        icon: 'Wine',      category: 'COMFORT',        description: 'Stocked mini refrigerator with drinks & snacks' },
    { name: 'Electronic Safe', icon: 'Lock',      category: 'ESSENTIAL',     description: 'In-room digital safe with personal code' },
    { name: 'Luggage Storage', icon: 'Briefcase', category: 'ESSENTIAL',     description: 'Secure baggage storage at reception' },
  ];

  for (const a of amenities) {
    await prisma.amenity.upsert({
      where: { name: a.name },
      update: a,
      create: a,
    });
  }

  console.log(`✓ Seeded ${amenities.length} amenities`);
}

async function seedRooms() {
  const amenities = await prisma.amenity.findMany();
  const amenityIds = amenities.map(a => a.id);
  const miniBarIdx = amenities.findIndex(a => a.name === 'Mini Bar');

  // 18 STUDIO rooms: S101–S118, floors 1–4
  // Distribution: floor 1 (S101-S105), floor 2 (S201-S205),
  //              floor 3 (S301-S308), floor 4 (S401-S418) — wait,
  //              S101 means floor 1, room number 01 on floor
  const studioDistribution = [
    1, 1, 1, 1, 1, // S101-S105: floor 1
    2, 2, 2, 2, 2, // S201-S205: floor 2
    3, 3, 3, 3, 3, 3, 3, 3, // S301-S308: floor 3
    4, 4, 4, 4, 4, 4, 4, 4, 4, 4, // S401-S410: floor 4
  ];

  const studios = studioDistribution.map((floor, i) => ({
    roomNumber: `S${floor}${String(i + 1).padStart(2, '0')}`,
    floor,
    basePriceSingle: 999.00,
    basePriceDouble: 1799.00,
    monthlyPriceSingle: 29999.00,
    monthlyPriceDouble: 39999.00,
    maxOccupancy: 2,
    sizeSqft: randInt(180, 250),
  }));

  // 18 PREMIUM rooms: P101–P118, floors 5–9
  // Distribution: floor 5 (4), floor 6 (4), floor 7 (4), floor 8 (4), floor 9 (2)
  const premiumDistribution = [
    5, 5, 5, 5, // P501-P504: floor 5
    6, 6, 6, 6, // P601-P604: floor 6
    7, 7, 7, 7, // P701-P704: floor 7
    8, 8, 8, 8, // P801-P804: floor 8
    9, 9, 9, 9, // P901-P904: floor 9
  ].slice(0, 18);

  const premiums = premiumDistribution.map((floor, i) => ({
    roomNumber: `P${floor}${String(i + 1).padStart(2, '0')}`,
    floor,
    basePriceSingle: 1999.00,
    basePriceDouble: 2999.00,
    maxOccupancy: 2,
    sizeSqft: randInt(280, 380),
  }));

  // Seed STUDIO rooms
  for (const r of studios) {
    const room = await prisma.room.upsert({
      where: { roomNumber: r.roomNumber },
      update: {
        floor: r.floor,
        type: 'STUDIO',
        basePriceSingle: String(r.basePriceSingle),
        basePriceDouble: String(r.basePriceDouble),
        monthlyPriceSingle: String(r.monthlyPriceSingle),
        monthlyPriceDouble: String(r.monthlyPriceDouble),
        maxOccupancy: r.maxOccupancy,
        sizeSqft: r.sizeSqft,
        status: 'VACANT',
      },
      create: {
        roomNumber: r.roomNumber,
        floor: r.floor,
        type: 'STUDIO',
        basePriceSingle: String(r.basePriceSingle),
        basePriceDouble: String(r.basePriceDouble),
        monthlyPriceSingle: String(r.monthlyPriceSingle),
        monthlyPriceDouble: String(r.monthlyPriceDouble),
        maxOccupancy: r.maxOccupancy,
        sizeSqft: r.sizeSqft,
        status: 'VACANT',
      },
    });

    // Attach all 15 amenities (STUDIO rooms S415-S418 skip Mini Bar for variety)
    const skipMiniBar = parseInt(r.roomNumber.slice(1)) >= 415;
    for (const amenityId of amenityIds) {
      if (skipMiniBar && amenityId === amenities[miniBarIdx].id) continue;
      try {
        await prisma.roomAmenity.create({
          data: { roomId: room.id, amenityId },
        });
      } catch {
        // Already exists — skip silently
      }
    }
  }

  // Seed PREMIUM rooms
  for (const r of premiums) {
    const room = await prisma.room.upsert({
      where: { roomNumber: r.roomNumber },
      update: {
        floor: r.floor,
        type: 'PREMIUM',
        basePriceSingle: String(r.basePriceSingle),
        basePriceDouble: String(r.basePriceDouble),
        maxOccupancy: r.maxOccupancy,
        sizeSqft: r.sizeSqft,
        status: 'VACANT',
      },
      create: {
        roomNumber: r.roomNumber,
        floor: r.floor,
        type: 'PREMIUM',
        basePriceSingle: String(r.basePriceSingle),
        basePriceDouble: String(r.basePriceDouble),
        maxOccupancy: r.maxOccupancy,
        sizeSqft: r.sizeSqft,
        status: 'VACANT',
      },
    });

    for (const amenityId of amenityIds) {
      try {
        await prisma.roomAmenity.create({ data: { roomId: room.id, amenityId } });
      } catch {
        // Already exists — skip silently
      }
    }
  }

  console.log(`✓ Seeded ${studios.length} STUDIO + ${premiums.length} PREMIUM rooms with amenities`);
}

async function seedAdminUsers() {
  const admins = [
    { email: "superadmin@therooms.in", name: "Super Admin", role: "SUPER_ADMIN" as const, password: "SuperAdmin@2026" },
    { email: "admin@therooms.in",      name: "Hotel Admin",  role: "ADMIN" as const,       password: "Admin@2026" },
    { email: "fo@therooms.in",         name: "Front Office", role: "FRONT_OFFICE" as const, password: "FrontOffice@2026" },
  ]

  for (const admin of admins) {
    const hash = await bcrypt.hash(admin.password, 12)
    await prisma.user.upsert({
      where: { email: admin.email },
      update: { name: admin.name, role: admin.role, passwordHash: hash },
      create: { email: admin.email, name: admin.name, role: admin.role, passwordHash: hash },
    })
  }

  console.log(`✓ Seeded ${admins.length} admin accounts`)
}

async function seedAnnouncement() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const superAdmin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  if (!superAdmin) { console.warn('⚠ No super admin found — skipping announcement'); return; }

  await prisma.announcement.upsert({
    where: { id: 'welcome-banner' },
    update: {
      title: 'Welcome to The Rooms',
      body: 'Premium stays from ₹999. Book direct, save more.',
      activeFrom: today,
      priority: 0,
      isActive: true,
    },
    create: {
      id: 'welcome-banner',
      title: 'Welcome to The Rooms',
      body: 'Premium stays from ₹999. Book direct, save more.',
      activeFrom: today,
      priority: 0,
      isActive: true,
      createdById: superAdmin.id,
    },
  });

  console.log('✓ Seeded welcome announcement');
}

async function seedDiscounts() {
  const discounts = [
    { id: 'student15', name: 'Student Discount', code: 'STUDENT15', type: 'STUDENT' as const,
      discountPercent: '15.00', minDays: 3, maxUses: 100 },
    { id: 'corp10',   name: 'Corporate Discount', code: 'CORP10',  type: 'CORPORATE' as const,
      discountPercent: '10.00', minDays: 5, maxUses: 500 },
    { id: 'welcome5', name: 'Welcome Discount',  code: 'WELCOME5', type: 'CUSTOM' as const,
      discountPercent: '5.00',  minDays: 1 },
  ];

  for (const d of discounts) {
    await prisma.discount.upsert({
      where: { code: d.code },
      update: d,
      create: d,
    });
  }

  console.log(`✓ Seeded ${discounts.length} discount codes`);
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🌱 Starting The Rooms database seed...\n');

  await seedAmenities();
  await seedRooms();
  await seedAdminUsers();
  await seedAnnouncement();
  await seedDiscounts();

  console.log('\n✅ Database seed complete!');
  console.log('\nDefault admin credentials:');
  console.log('  superadmin@therooms.in / SuperAdmin@2026');
  console.log('  admin@therooms.in      / Admin@2026');
  console.log('  fo@therooms.in        / FrontOffice@2026');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
