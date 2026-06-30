import { NextRequest, NextResponse } from "next/server";
import { db } from "@the-rooms/db";

// GET /api/partners/[id]/bookings
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const partner = await db.partnerHotel.findUnique({ where: { id } });
    if (!partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    // Partner hotels are used for overbooking relocation — not tracked as bookings
    // in the current schema. Return the overbooking policies that reference this partner.
    const policies = await db.overbookingPolicy.findMany({
      where: { partnerHotelId: id },
      include: { property: { select: { id: true, name: true } } },
    });

    return NextResponse.json({
      bookings: [],
      relocations: policies.map((p) => ({
        propertyId: p.propertyId,
        propertyName: p.property.name,
        partnerRate: p.partnerHotelRate,
        isActive: p.isEnabled,
      })),
      total: 0,
    });
  } catch (error) {
    console.error("Error fetching partner bookings:", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}
