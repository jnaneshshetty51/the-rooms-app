// apps/front-office/src/app/api/ota/alerts/[id]/route.ts
// PATCH /api/ota/alerts/[id] - Resolve an alert

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, unauthorized, forbidden, notFound, serverError, badRequest } from "@the-rooms/api/response";
import { resolveSyncAlert, getAlertById } from "@the-rooms/db/queries/otaSyncQueries";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        const userRole = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
            return forbidden("You don't have permission to resolve alerts");
        }

        const { id } = await params;
        const body = await request.json();
        const { resolution } = body;

        if (!resolution) {
            return badRequest("Resolution is required");
        }

        // Check if alert exists
        const alert = await getAlertById(id);
        if (!alert) {
            return notFound("Alert");
        }

        const updatedAlert = await resolveSyncAlert(id, resolution);

        return ok({
            message: "Alert resolved successfully",
            alert: updatedAlert,
        });
    } catch (error) {
        console.error("Error resolving alert:", error);
        return serverError();
    }
}