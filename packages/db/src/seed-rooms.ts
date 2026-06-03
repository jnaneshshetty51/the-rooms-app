import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding rooms...');

  const rooms = [];

  // 18 Studio Rooms: S101 - S118
  for (let i = 1; i <= 18; i++) {
    const numberStr = i.toString().padStart(2, '0');
    rooms.push({
      roomNumber: `S1${numberStr}`,
      type: 'STUDIO' as const,
      floor: 1,
      status: 'VACANT' as const,
      description: `Cozy studio room ${i} with essential amenities.`,
      maxOccupancy: 2,
      basePriceSingle: 999,
      basePriceDouble: 1799,
    });
  }

  // 18 Premium Rooms: P101 - P118
  for (let i = 1; i <= 18; i++) {
    const numberStr = i.toString().padStart(2, '0');
    rooms.push({
      roomNumber: `P1${numberStr}`,
      type: 'PREMIUM' as const,
      floor: 1,
      status: 'VACANT' as const,
      description: `Spacious premium room ${i} with luxury amenities.`,
      maxOccupancy: 4,
      basePriceSingle: 1999,
      basePriceDouble: 2999,
    });
  }

  let createdCount = 0;
  for (const room of rooms) {
    // UPSERT to avoid duplicates
    await prisma.room.upsert({
      where: { roomNumber: room.roomNumber },
      update: {}, // do nothing if it exists
      create: room,
    });
    createdCount++;
  }

  console.log(`Successfully seeded ${createdCount} rooms.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
