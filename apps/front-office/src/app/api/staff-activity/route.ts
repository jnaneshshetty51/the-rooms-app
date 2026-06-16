import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, created, unauthorized, forbidden, serverError } from "@the-rooms/api/response";
import { z } from "zod";
import { logStaffActivity, searchStaffActivities } from "@the-rooms/db/queries/staffActivityQueries";

// ─── Guest Lookup ─────────────────────────────────────────────────────────

// Schema for logging activity
const logActivitySchema = z.object({
    staffId: z.string(),
    action: z.string(),
    entityType: z.string().optional(),
    entityId: z.string().optional(),
    oldValue: z.record(z.any()).optional(),
    newValue: z.record(z.any()).optional(),
    notes: z.string().optional(),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
    propertyId: z.string().optional(),
});

// POST /api/staff-activity - Log activity (internal use)
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        const body = await request.json();
        const parsed = logActivitySchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.errors[0]?.message || "Invalid input" },
                { status: 400 }
            );
        }

        const result = await logStaffActivity(parsed.data);

        return created(result);
    } catch (error) {
        console.error("Error logging staff activity:", error);
        return serverError();
    }
}

// GET /api/staff-activity - List activities with filters
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        // Only ADMIN and SUPER_ADMIN can view all activities
        const userRole = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
            return forbidden("You don't have permission to view staff activities");
        }

        const { searchParams } = new URL(request.url);
        const query = searchParams.get("query") || '';
        const staffId = searchParams.get("staffId") || undefined;
        const startDateParam = searchParams.get("startDate");
        const endDateParam = searchParams.get("endDate");
        const action = searchParams.get("action") || undefined;
        const entityType = searchParams.get("entityType") || undefined;
        const propertyId = searchParams.get("propertyId") || "default";

        const startDate = startDateParam ? new Date(startDateParam) : undefined;
        const endDate = endDateParam ? new Date(endDateParam) : undefined;

        const activities = await searchStaffActivities(query, {
            staffId,
            startDate,
            endDate,
            action,
            entityType,
            propertyId,
        });

        return ok({ activities });
    } catch (error) {
        console.error("Error fetching staff activities:", error);
        return serverError();
    }
}
