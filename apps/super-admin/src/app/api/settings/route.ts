import { NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    let settings = await db.hotelSettings.findUnique({ where: { id: "default" } });
    
    // Seed default settings if they don't exist
    if (!settings) {
      settings = await db.hotelSettings.create({
        data: { id: "default" }
      });
    }

    return NextResponse.json({ data: settings });
  } catch (error) {
    console.error("[SETTINGS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const {
      hotelName,
      hotelAddress,
      hotelPhone,
      hotelEmail,
      checkInTime,
      checkOutTime,
      lateCheckOutFee,
      earlyCheckInFee,
      gstNumber,
      bankName,
      accountNumber,
      ifscCode,
      cancellationPolicy,
    } = body;

    const settings = await db.hotelSettings.upsert({
      where: { id: "default" },
      update: {
        hotelName,
        address: hotelAddress,
        phone: hotelPhone,
        email: hotelEmail,
        checkInTime,
        checkOutTime,
        lateCheckOutFee,
        earlyCheckInFee,
        gstNumber,
        bankName,
        accountNumber,
        ifscCode,
        cancellationPolicy,
      },
      create: {
        id: "default",
        hotelName,
        address: hotelAddress,
        phone: hotelPhone,
        email: hotelEmail,
        checkInTime,
        checkOutTime,
        lateCheckOutFee,
        earlyCheckInFee,
        gstNumber,
        bankName,
        accountNumber,
        ifscCode,
        cancellationPolicy,
      },
    });

    return NextResponse.json({ data: settings });
  } catch (error) {
    console.error("[SETTINGS_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
