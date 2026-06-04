import { NextResponse } from "next/server";
import prisma from "@the-rooms/db";

export async function GET() {
  try {
    const settings = await prisma.hotelSettings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      return NextResponse.json({
        settings: {
          hotelName: "The Rooms",
          address: "The Rooms, 103/2, Uniworld, Neeladri Road, Behind Karnataka Bank, Electronic City Phase 1, Bangalore, Karnataka 560100",
          phone: "+91 73490 47799",
          email: "stay@therooms.in",
        }
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error fetching hotel settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}
