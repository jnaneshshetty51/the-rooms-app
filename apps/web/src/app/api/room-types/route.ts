// apps/web/src/app/api/room-types/route.ts
// GET /api/room-types — Returns available room types with pricing, images, and features for marketing site

import { NextResponse } from "next/server";
import { db } from "@the-rooms/db";

type TypeProfile = {
  type: string;
  title: string;
  description: string | null;
  features: string[];
  images: { url: string }[];
};

export async function GET() {
  try {
    const dbAny = db as unknown as Record<string, { findMany: (args: unknown) => Promise<unknown> }>;

    const [roomCounts, vacantCounts, studioRoom, premiumRoom, rawProfiles] = await Promise.all([
      db.room.groupBy({ by: ["type"], _count: { id: true } }),
      db.room.groupBy({ by: ["type"], where: { status: "VACANT" }, _count: { id: true } }),
      db.room.findFirst({
        where: { type: "STUDIO" },
        select: { basePriceSingle: true, basePriceDouble: true, monthlyPriceSingle: true, monthlyPriceDouble: true, sizeSqft: true },
      }),
      db.room.findFirst({
        where: { type: "PREMIUM" },
        select: { basePriceSingle: true, basePriceDouble: true, monthlyPriceSingle: true, monthlyPriceDouble: true, sizeSqft: true },
      }),
      dbAny.roomTypeProfile.findMany({
        include: { images: { orderBy: { sortOrder: "asc" } } },
      }),
    ]);

    const profiles = rawProfiles as TypeProfile[];
    const profileMap = Object.fromEntries(profiles.map((p) => [p.type, p]));

    const roomTypes = [
      {
        type: "STUDIO",
        title: profileMap["STUDIO"]?.title ?? "Studio Room",
        description: profileMap["STUDIO"]?.description ?? "Perfect for solo travellers and digital nomads. All essentials included.",
        features: profileMap["STUDIO"]?.features?.length ? profileMap["STUDIO"].features : ["Queen Bed", "Work Desk", "WiFi", "AC"],
        photos: profileMap["STUDIO"]?.images?.map((i) => i.url) ?? [],
        totalRooms: roomCounts.find((r) => r.type === "STUDIO")?._count.id ?? 0,
        vacantRooms: vacantCounts.find((r) => r.type === "STUDIO")?._count.id ?? 0,
        basePriceSingle: studioRoom?.basePriceSingle ? Number(studioRoom.basePriceSingle) : 999,
        basePriceDouble: studioRoom?.basePriceDouble ? Number(studioRoom.basePriceDouble) : 1799,
        monthlyPriceSingle: studioRoom?.monthlyPriceSingle ? Number(studioRoom.monthlyPriceSingle) : 19999,
        monthlyPriceDouble: studioRoom?.monthlyPriceDouble ? Number(studioRoom.monthlyPriceDouble) : 29999,
        sizeSqft: studioRoom?.sizeSqft ?? 200,
      },
      {
        type: "PREMIUM",
        title: profileMap["PREMIUM"]?.title ?? "Premium Room",
        description: profileMap["PREMIUM"]?.description ?? "Spacious rooms with premium amenities. Ideal for couples and business travellers.",
        features: profileMap["PREMIUM"]?.features?.length ? profileMap["PREMIUM"].features : ["King Bed", "Mini Bar", "City View", "Room Service"],
        photos: profileMap["PREMIUM"]?.images?.map((i) => i.url) ?? [],
        totalRooms: roomCounts.find((r) => r.type === "PREMIUM")?._count.id ?? 0,
        vacantRooms: vacantCounts.find((r) => r.type === "PREMIUM")?._count.id ?? 0,
        basePriceSingle: premiumRoom?.basePriceSingle ? Number(premiumRoom.basePriceSingle) : 1999,
        basePriceDouble: premiumRoom?.basePriceDouble ? Number(premiumRoom.basePriceDouble) : 2999,
        monthlyPriceSingle: premiumRoom?.monthlyPriceSingle ? Number(premiumRoom.monthlyPriceSingle) : 39999,
        monthlyPriceDouble: premiumRoom?.monthlyPriceDouble ? Number(premiumRoom.monthlyPriceDouble) : 49999,
        sizeSqft: premiumRoom?.sizeSqft ?? 320,
      },
    ];

    return NextResponse.json({ data: roomTypes });
  } catch (error) {
    console.error("[ROOM_TYPES]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
