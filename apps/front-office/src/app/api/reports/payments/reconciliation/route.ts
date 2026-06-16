import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, badRequest, unauthorized, forbidden, serverError } from "@the-rooms/api/response";
import { getPaymentReconciliation } from "@the-rooms/db/queries/paymentReconciliationQueries";

// GET /api/reports/payments/reconciliation - Get reconciliation report
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
        const date = searchParams.get("date");

        if (!date) {
            return badRequest("date is required");
        }

        const reconciliation = await getPaymentReconciliation(
            propertyId,
            new Date(date)
        );

        return ok(reconciliation);
    } catch (error) {
        console.error("Error fetching payment reconciliation:", error);
        return serverError();
    }
}
