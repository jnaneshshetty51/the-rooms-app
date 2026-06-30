import { NextRequest, NextResponse } from "next/server";
import { db } from "@the-rooms/db";

// GET /api/partners/[id]/stats
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

    // Count overbooking policies that reference this partner (relocation bookings)
    const policies = await db.overbookingPolicy.count({
      where: { partnerHotelId: id },
    });

    return NextResponse.json({
      totalBookings: 0,
      totalRevenue: 0,
      pendingCommission: 0,
      paidCommission: 0,
      propertiesUsing: policies,
      lastUsed: null,
    });
  } catch (error) {
    console.error("Error fetching partner stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
