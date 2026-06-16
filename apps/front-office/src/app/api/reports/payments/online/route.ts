import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, badRequest, unauthorized, forbidden, serverError } from "@the-rooms/api/response";
import { getOnlineCollections } from "@the-rooms/db/queries/paymentQueries";

// GET /api/reports/payments/online - Get online collections
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        const userRole = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN', 'FRONT_OFFICE'].includes(userRole)) {
            return forbidden("You don't have permission to view payment reports");
        }

        const { searchParams } = new URL(request.url);
        const propertyId = searchParams.get("propertyId") || "default";
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        if (!startDate || !endDate) {
            return badRequest("startDate and endDate are required");
        }

        const collections = await getOnlineCollections(
            propertyId,
            new Date(startDate),
            new Date(endDate)
        );

        return ok(collections);
    } catch (error) {
        console.error("Error fetching online collections:", error);
        return serverError();
    }
}
