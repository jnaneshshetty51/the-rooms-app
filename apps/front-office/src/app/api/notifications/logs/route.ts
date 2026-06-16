// apps/front-office/src/app/api/notifications/logs/route.ts
// GET /api/notifications/logs - Get notification logs

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, unauthorized, forbidden, serverError } from "@the-rooms/api/response";
import { getNotificationLogs } from "@the-rooms/db/queries/notificationQueries";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        const userRole = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN', 'FRONT_OFFICE'].includes(userRole)) {
            return forbidden("You don't have permission to view notification logs");
        }

        const { searchParams } = new URL(request.url);
        const channel = searchParams.get("channel") || undefined;
        const status = searchParams.get("status") || undefined;
        const entityType = searchParams.get("entityType") || undefined;
        const entityId = searchParams.get("entityId") || undefined;
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const page = parseInt(searchParams.get("page") || "1");
        const perPage = parseInt(searchParams.get("perPage") || "20");

        const result = await getNotificationLogs({
            channel: channel as any,
            status: status as any,
            entityType,
            entityId,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            page,
            perPage,
        });

        return ok(result);
    } catch (error) {
        console.error("Error fetching notification logs:", error);
        return serverError();
    }
}