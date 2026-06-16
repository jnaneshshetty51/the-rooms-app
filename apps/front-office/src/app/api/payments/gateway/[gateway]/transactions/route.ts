// apps/front-office/src/app/api/payments/gateway/[gateway]/transactions/route.ts
// GET /api/payments/gateway/[gateway]/transactions - Get gateway transactions

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, unauthorized, forbidden, serverError, badRequest } from "@the-rooms/api/response";
import { getGatewayTransactions } from "@the-rooms/db/queries/paymentGatewayQueries";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ gateway: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        const userRole = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN', 'FRONT_OFFICE'].includes(userRole)) {
            return forbidden("You don't have permission to view gateway transactions");
        }

        const { gateway } = await params;
        const { searchParams } = new URL(request.url);
        const dateParam = searchParams.get("date");

        if (!dateParam) {
            return badRequest("date parameter is required");
        }

        const transactions = await getGatewayTransactions(gateway, new Date(dateParam));

        return ok({
            gateway,
            date: dateParam,
            transactions,
            count: transactions.length,
        });
    } catch (error) {
        console.error("Error fetching gateway transactions:", error);
        return serverError();
    }
}