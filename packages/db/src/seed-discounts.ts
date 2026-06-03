import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding discounts...');

  const discounts = [
    {
      name: 'Corporate Special 15%',
      code: 'CORP15',
      type: 'CORPORATE' as const,
      discountPercent: 15.0,
      minDays: 1,
      isActive: true,
    },
    {
      name: 'Summer Vacation 20%',
      code: 'SUMMER20',
      type: 'SEASONAL' as const,
      discountPercent: 20.0,
      minDays: 2,
      validFrom: new Date(new Date().getFullYear(), 5, 1), // June 1st
      validTo: new Date(new Date().getFullYear(), 7, 31), // August 31st
      isActive: true,
    },
    {
      name: 'Weekly Stay 10%',
      code: 'STAY7',
      type: 'EXTENDED_STAY' as const,
      discountPercent: 10.0,
      minDays: 7,
      isActive: true,
    },
  ];

  let createdCount = 0;
  for (const discount of discounts) {
    // UPSERT to avoid duplicates
    await prisma.discount.upsert({
      where: { code: discount.code },
      update: {}, // do nothing if it exists
      create: discount,
    });
    createdCount++;
  }

  console.log(`Successfully seeded ${createdCount} discounts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
