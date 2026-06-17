// apps/front-office/src/app/api/property/settings/route.ts
// Property settings API for Front Office app
import { NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { getPropertyIdFromSession } from "@the-rooms/api/middleware";
import prisma from "@the-rooms/db";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const role = (session.user as { role?: string }).role;

        // Allow FRONT_OFFICE, ADMIN, SUPER_ADMIN, HOUSEKEEPING to access property settings
        const allowedRoles = ["FRONT_OFFICE", "ADMIN", "SUPER_ADMIN", "HOUSEKEEPING"];
        if (!role || !allowedRoles.includes(role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const propertyId = await getPropertyIdFromSession(session);
        if (!propertyId) {
            return NextResponse.json({ error: "No property access found" }, { status: 403 });
        }

        let settings = await prisma.hotelSettings.findFirst({
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
        console.error("Error fetching property settings:", error);
        return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }
}
