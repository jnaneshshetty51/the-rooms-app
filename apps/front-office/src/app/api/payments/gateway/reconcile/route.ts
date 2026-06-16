// apps/front-office/src/app/api/payments/gateway/reconcile/route.ts
// POST /api/payments/gateway/reconcile - Reconcile gateway payments

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, unauthorized, forbidden, badRequest, serverError } from "@the-rooms/api/response";
import { reconcileGatewayPayments } from "@the-rooms/db/queries/paymentGatewayQueries";

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        const userRole = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
            return forbidden("You don't have permission to reconcile payments");
        }

        const body = await request.json();
        const { gateway, date, propertyId } = body;

        if (!gateway || !date) {
            return badRequest("gateway and date are required");
        }

        const result = await reconcileGatewayPayments(
            gateway,
            new Date(date),
            propertyId
        );

        return ok({
            message: "Reconciliation completed",
            ...result,
        });
    } catch (error) {
        console.error("Error reconciling payments:", error);
        return serverError();
    }
}