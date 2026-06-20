import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";

function settingsShape(settings: {
  hotelName: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  gstNumber: string | null;
  cancellationPolicy: string | null;
}) {
  return {
    hotelName: settings.hotelName,
    checkInTime: settings.checkInTime,
    checkOutTime: settings.checkOutTime,
    address: settings.address,
    phone: settings.phone,
    email: settings.email,
    gstNumber: settings.gstNumber,
    cancellationPolicy: settings.cancellationPolicy,
  };
}

// GET /api/settings?propertyId=xxx
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("propertyId");

    if (!propertyId) {
      const properties = await db.property.findMany({ orderBy: { createdAt: "desc" } });
      const propertiesWithSettings = await Promise.all(
        properties.map(async (property) => {
          const settings = await db.hotelSettings.findUnique({ where: { propertyId: property.id } });
          return {
            propertyId: property.id,
            propertyName: property.name,
            propertyCode: property.code,
            ...(settings ? settingsShape(settings) : null),
          };
        })
      );
      return NextResponse.json({ data: propertiesWithSettings, isAggregated: true });
    }

    const property = await db.property.findUnique({ where: { id: propertyId } });
    if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

    let settings = await db.hotelSettings.findUnique({ where: { propertyId } });
    if (!settings) {
      settings = await db.hotelSettings.create({ data: { propertyId } });
    }

    return NextResponse.json({
      data: {
        propertyId: property.id,
        propertyName: property.name,
        propertyCode: property.code,
        ...settingsShape(settings),
      },
      isAggregated: false,
    });
  } catch (error) {
    console.error("[SETTINGS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/settings
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { propertyId, ...updateData } = body;

    if (!propertyId) return NextResponse.json({ error: "propertyId is required" }, { status: 400 });

    const property = await db.property.findUnique({ where: { id: propertyId } });
    if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

    const settings = await db.hotelSettings.upsert({
      where: { propertyId },
      update: updateData,
      create: { propertyId, ...updateData },
    });

    return NextResponse.json({
      data: {
        propertyId: property.id,
        propertyName: property.name,
        propertyCode: property.code,
        ...settingsShape(settings),
      },
    });
  } catch (error) {
    console.error("[SETTINGS_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
