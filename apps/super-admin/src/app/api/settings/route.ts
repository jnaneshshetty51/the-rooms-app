import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    let propertyId = searchParams.get("propertyId");

    // If no propertyId provided, get the first property
    if (!propertyId) {
      const firstProperty = await db.property.findFirst();
      if (!firstProperty) {
        return NextResponse.json({ error: "No properties found" }, { status: 404 });
      }
      propertyId = firstProperty.id;
    }

    let settings = await db.hotelSettings.findUnique({
      where: { propertyId }
    });

    // Seed default settings if they don't exist
    if (!settings) {
      settings = await db.hotelSettings.create({
        data: { propertyId }
      });
    }

    return NextResponse.json({ data: settings, propertyId });
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

    return NextResponse.json({ data: settings });
  } catch (error) {
    console.error("[SETTINGS_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
