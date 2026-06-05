// apps/web/src/app/api/room-types/route.ts
// GET /api/room-types — Returns available room types with pricing for marketing site

import { NextResponse } from "next/server";
import { db } from "@the-rooms/db";

export async function GET() {
    try {
        // Get room counts and pricing by type
        const roomCounts = await db.room.groupBy({
            by: ["type"],
            _count: { id: true },
        });

        // Get vacant room counts by type
        const vacantCounts = await db.room.groupBy({
            by: ["type"],
            where: { status: "VACANT" },
            _count: { id: true },
        });

        // Get pricing from any room of each type (they should all have same pricing)
        const studioRoom = await db.room.findFirst({
            where: { type: "STUDIO" },
            select: {
                basePriceSingle: true,
                basePriceDouble: true,
                monthlyPriceSingle: true,
                monthlyPriceDouble: true,
                sizeSqft: true,
            },
        });

        const premiumRoom = await db.room.findFirst({
            where: { type: "PREMIUM" },
            select: {
                basePriceSingle: true,
                basePriceDouble: true,
                monthlyPriceSingle: true,
                monthlyPriceDouble: true,
                sizeSqft: true,
            },
        });

        const roomTypes = [
            {
                type: "STUDIO",
                title: "Studio Room",
                description: "Perfect for solo travellers and digital nomads. All essentials included.",
                features: ["Queen Bed", "Work Desk", "WiFi", "AC"],
                totalRooms: roomCounts.find((r) => r.type === "STUDIO")?._count.id ?? 0,
                vacantRooms: vacantCounts.find((r) => r.type === "STUDIO")?._count.id ?? 0,
                basePriceSingle: studioRoom?.basePriceSingle ? Number(studioRoom.basePriceSingle) : 999,
                basePriceDouble: studioRoom?.basePriceDouble ? Number(studioRoom.basePriceDouble) : 1799,
                monthlyPriceSingle: studioRoom?.monthlyPriceSingle ? Number(studioRoom.monthlyPriceSingle) : 29999,
                monthlyPriceDouble: studioRoom?.monthlyPriceDouble ? Number(studioRoom.monthlyPriceDouble) : 39999,
                sizeSqft: studioRoom?.sizeSqft ?? 200,
            },
            {
                type: "PREMIUM",
                title: "Premium Room",
                description: "Spacious rooms with premium amenities. Ideal for couples and business travellers.",
                features: ["King Bed", "Mini Bar", "City View", "Room Service"],
                totalRooms: roomCounts.find((r) => r.type === "PREMIUM")?._count.id ?? 0,
                vacantRooms: vacantCounts.find((r) => r.type === "PREMIUM")?._count.id ?? 0,
                basePriceSingle: premiumRoom?.basePriceSingle ? Number(premiumRoom.basePriceSingle) : 1999,
                basePriceDouble: premiumRoom?.basePriceDouble ? Number(premiumRoom.basePriceDouble) : 2999,
                monthlyPriceSingle: premiumRoom?.monthlyPriceSingle ? Number(premiumRoom.monthlyPriceSingle) : null,
                monthlyPriceDouble: premiumRoom?.monthlyPriceDouble ? Number(premiumRoom.monthlyPriceDouble) : null,
                sizeSqft: premiumRoom?.sizeSqft ?? 320,
            },
        ];

        return NextResponse.json({ data: roomTypes });
    } catch (error) {
        console.error("[ROOM_TYPES]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
