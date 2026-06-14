import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { getAddonTypes, ADDON_TYPES } from "@the-rooms/db";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const addonTypes = getAddonTypes();

        return NextResponse.json({ addonTypes });
    } catch (error) {
        console.error("Error fetching addon types:", error);
        return NextResponse.json({ error: "Failed to fetch addon types" }, { status: 500 });
    }
}
