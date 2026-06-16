import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, unauthorized, forbidden, serverError } from "@the-rooms/api/response";
import { getOutstandingPayments } from "@the-rooms/db/queries/paymentReconciliationQueries";

// GET /api/reports/payments/outstanding - Get outstanding payments
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

        const outstanding = await getOutstandingPayments(propertyId);

        return ok(outstanding);
    } catch (error) {
        console.error("Error fetching outstanding payments:", error);
        return serverError();
    }
}
