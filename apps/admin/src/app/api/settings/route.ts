import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Since it's a singleton, we always get the first (and only) record,
    // or create a default one if none exists.
    let settings = await prisma.hotelSettings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      settings = await prisma.hotelSettings.create({
        data: { id: "default" },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error fetching hotel settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as { role?: string }).role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Whitelist the fields we allow updating
    const updateData: any = {};
    const allowedFields = [
      "hotelName", "address", "phone", "email",
      "checkInTime", "checkOutTime", "lateCheckOutFee", "earlyCheckInFee",
      "extraGuestRateDaily", "gstNumber",
      "emailOnBooking", "emailOnCancel", "dailyReport", "maintenanceAlerts",
    ];
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const settings = await prisma.hotelSettings.upsert({
      where: { id: "default" },
      update: updateData,
      create: {
        id: "default",
        ...updateData,
      },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error updating hotel settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
