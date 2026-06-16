// apps/front-office/src/app/api/payments/gateway/reconciliation-report/route.ts
// GET /api/payments/gateway/reconciliation-report - Get reconciliation report

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, unauthorized, forbidden, badRequest, serverError } from "@the-rooms/api/response";
import { getReconciliationReport } from "@the-rooms/db/queries/paymentGatewayQueries";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        const userRole = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
            return forbidden("You don't have permission to view reconciliation reports");
        }

        const { searchParams } = new URL(request.url);
        const gateway = searchParams.get("gateway");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        if (!gateway || !startDate || !endDate) {
            return badRequest("gateway, startDate, and endDate are required");
        }

        const report = await getReconciliationReport(
            gateway,
            new Date(startDate),
            new Date(endDate)
        );

        return ok(report);
    } catch (error) {
        console.error("Error fetching reconciliation report:", error);
        return serverError();
    }
}