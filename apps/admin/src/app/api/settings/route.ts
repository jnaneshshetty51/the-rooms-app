import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";

// Helper to get propertyId from session
async function getPropertyIdFromSession(session: any): Promise<string | null> {
  const userId = session?.user?.id;
  if (!userId) return null;

  // Get the user's property access - for ADMIN/SUPER_ADMIN, get their primary property
  const propertyAccess = await prisma.userPropertyAccess.findFirst({
    where: {
      userId,
      role: { in: ["ADMIN", "MANAGER"] }
    },
    include: { property: true }
  });

  if (!propertyAccess) {
    // Fallback: try to get any property access
    const anyAccess = await prisma.userPropertyAccess.findFirst({
      where: { userId },
      include: { property: true }
    });
    return anyAccess?.propertyId || null;
  }

  return propertyAccess.propertyId;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as { role?: string }).role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const propertyId = await getPropertyIdFromSession(session);
    if (!propertyId) {
      return NextResponse.json({ error: "No property access found" }, { status: 403 });
    }

    let settings = await prisma.hotelSettings.findUnique({
      where: { propertyId },
    });

    // Create default settings if they don't exist
    if (!settings) {
      settings = await prisma.hotelSettings.create({
        data: { propertyId },
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

    const propertyId = await getPropertyIdFromSession(session);
    if (!propertyId) {
      return NextResponse.json({ error: "No property access found" }, { status: 403 });
    }

    const body = await request.json();

    // Whitelist the fields we allow updating
    const updateData: any = {};
    const allowedFields = [
      "hotelName", "address", "phone", "email",
      "checkInTime", "checkOutTime", "lateCheckOutFee", "earlyCheckInFee",
      "extraGuestRateDaily", "gstNumber",
      "emailOnBooking", "emailOnCancel", "dailyReport", "maintenanceAlerts",
      // Policy settings
      "noShowChargeType", "noShowChargeValue", "noShowCutoffHour", "noShowEnabled",
      "earlyCheckinEnabled", "earlyCheckinCutoffHour", "earlyCheckinChargeType",
      "lateCheckoutEnabled", "lateCheckoutCutoffHour", "lateCheckoutChargeType", "lateCheckoutMaxHour", "lateCheckoutFee",
      "cancellationPolicy", "bankName", "accountNumber", "ifscCode",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const settings = await prisma.hotelSettings.upsert({
      where: { propertyId },
      update: updateData,
      create: {
        propertyId,
        ...updateData,
      },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error updating hotel settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
