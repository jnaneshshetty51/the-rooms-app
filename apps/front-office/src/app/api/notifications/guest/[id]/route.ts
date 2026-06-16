// apps/front-office/src/app/api/notifications/guest/[id]/route.ts
// GET /api/notifications/guest/[id] - Get guest notifications

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, unauthorized, forbidden, notFound, serverError } from "@the-rooms/api/response";
import { getGuestNotifications } from "@the-rooms/db/queries/notificationQueries";
import { db } from "@the-rooms/db";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        const userRole = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN', 'FRONT_OFFICE'].includes(userRole)) {
            return forbidden("You don't have permission to view guest notifications");
        }

        const { id } = await params;

        // Check if guest exists
        const guest = await db.guest.findUnique({
            where: { id },
            select: { id: true, name: true },
        });

        if (!guest) {
            return notFound("Guest");
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get("limit") || "50");

        const notifications = await getGuestNotifications(id, limit);

        return ok({
            guest: {
                id: guest.id,
                name: guest.name,
            },
            notifications,
            count: notifications.length,
        });
    } catch (error) {
        console.error("Error fetching guest notifications:", error);
        return serverError();
    }
}