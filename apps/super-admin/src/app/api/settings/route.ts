import { NextRequest } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, badRequest, serverError } from "@the-rooms/api/response";

// GET /api/settings?propertyId=xxx - Get settings for a specific property
// GET /api/settings - Get settings for all properties
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    let propertyId = searchParams.get("propertyId");

    // If no propertyId provided, return all properties with their settings
    if (!propertyId) {
      const properties = await db.property.findMany({
        orderBy: { createdAt: "desc" },
      });

      const propertiesWithSettings = await Promise.all(
        properties.map(async (property) => {
          const settings = await db.hotelSettings.findUnique({
            where: { propertyId: property.id },
          });
          return {
            propertyId: property.id,
            propertyName: property.name,
            propertyCode: property.code,
            ...(settings ? {
              hotelName: settings.hotelName,
              checkInTime: settings.checkInTime,
              checkOutTime: settings.checkOutTime,
              invoicePrefix: settings.invoicePrefix,
              invoiceFooter: settings.invoiceFooter,
              taxRate: settings.taxRate,
              address: settings.address,
              phone: settings.phone,
              email: settings.email,
              website: settings.website,
              currency: settings.currency,
              timezone: settings.timezone,
              bookingRules: settings.bookingRules,
              cancellationPolicy: settings.cancellationPolicy,
              childPolicy: settings.childPolicy,
              petPolicy: settings.petPolicy,
              parkingPolicy: settings.parkingPolicy,
            } : null),
          };
        })
      );

      return NextResponse.json({
        data: propertiesWithSettings,
        isAggregated: true,
      });
    }

    // Get property info
    const property = await db.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    let settings = await db.hotelSettings.findUnique({
      where: { propertyId },
    });

    // Seed default settings if they don't exist
    if (!settings) {
      settings = await db.hotelSettings.create({
        data: { propertyId }
      });
    }

    return NextResponse.json({
      data: {
        propertyId: property.id,
        propertyName: property.name,
        propertyCode: property.code,
        hotelName: settings.hotelName,
        checkInTime: settings.checkInTime,
        checkOutTime: settings.checkOutTime,
        invoicePrefix: settings.invoicePrefix,
        invoiceFooter: settings.invoiceFooter,
        taxRate: settings.taxRate,
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
        website: settings.website,
        currency: settings.currency,
        timezone: settings.timezone,
        bookingRules: settings.bookingRules,
        cancellationPolicy: settings.cancellationPolicy,
        childPolicy: settings.childPolicy,
        petPolicy: settings.petPolicy,
        parkingPolicy: settings.parkingPolicy,
      },
      isAggregated: false,
    });
  } catch (error) {
    console.error("[SETTINGS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/settings - Update settings for a specific property
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { propertyId, ...updateData } = body;

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    // Verify property exists
    const property = await db.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const settings = await db.hotelSettings.upsert({
      where: { propertyId },
      update: updateData,
      create: {
        propertyId,
        ...updateData,
      },
    });

    return NextResponse.json({
      data: {
        propertyId: property.id,
        propertyName: property.name,
        propertyCode: property.code,
        hotelName: settings.hotelName,
        checkInTime: settings.checkInTime,
        checkOutTime: settings.checkOutTime,
        invoicePrefix: settings.invoicePrefix,
        invoiceFooter: settings.invoiceFooter,
        taxRate: settings.taxRate,
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
        website: settings.website,
        currency: settings.currency,
        timezone: settings.timezone,
        bookingRules: settings.bookingRules,
        cancellationPolicy: settings.cancellationPolicy,
        childPolicy: settings.childPolicy,
        petPolicy: settings.petPolicy,
        parkingPolicy: settings.parkingPolicy,
      },
    });
  } catch (error) {
    console.error("[SETTINGS_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
