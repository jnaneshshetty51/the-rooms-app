// apps/front-office/src/app/api/payments/gateway/discrepancies/route.ts
// GET /api/payments/gateway/discrepancies - Get payment discrepancies

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, unauthorized, forbidden, serverError } from "@the-rooms/api/response";
import { getPaymentDiscrepancies } from "@the-rooms/db/queries/paymentGatewayQueries";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        const userRole = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN', 'FRONT_OFFICE'].includes(userRole)) {
            return forbidden("You don't have permission to view discrepancies");
        }

        const { searchParams } = new URL(request.url);
        const gateway = searchParams.get("gateway") || undefined;
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const status = searchParams.get("status") as 'OPEN' | 'RESOLVED' | 'INVESTIGATING' | null;

        const discrepancies = await getPaymentDiscrepancies(
            gateway,
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined,
            status || undefined
        );

        return ok({
            discrepancies,
            count: discrepancies.length,
        });
    } catch (error) {
        console.error("Error fetching discrepancies:", error);
        return serverError();
    }
}