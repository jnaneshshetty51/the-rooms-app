import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { getFraudFlags } from "@the-rooms/db";

// GET /api/fraud-detection/flags - Get flagged bookings
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const propertyId = searchParams.get("propertyId") ?? undefined;
        const status = searchParams.get("status") ?? undefined;
        const page = parseInt(searchParams.get("page") ?? "1");
        const perPage = parseInt(searchParams.get("perPage") ?? "20");

        const result = await getFraudFlags({ propertyId, status, page, perPage });
        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching fraud flags:", error);
        return NextResponse.json({ error: "Failed to fetch fraud flags" }, { status: 500 });
    }
}
