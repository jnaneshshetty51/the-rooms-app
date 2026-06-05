// apps/web/src/app/api/amenities/route.ts
// GET /api/amenities — Returns all amenities for the marketing site

import { NextResponse } from "next/server";
import { db } from "@the-rooms/db";

export async function GET() {
    try {
        const amenities = await db.amenity.findMany({
            orderBy: [
                { category: "asc" },
                { name: "asc" },
            ],
        });

        return NextResponse.json({ data: amenities });
    } catch (error) {
        console.error("[AMENITIES]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
