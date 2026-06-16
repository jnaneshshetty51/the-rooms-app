import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, created, badRequest, unauthorized, forbidden, serverError } from "@the-rooms/api/response";
import { z } from "zod";
import { getShiftTypes, createShiftType } from "@the-rooms/db/queries/shiftQueries";

// ─── Guest Lookup ─────────────────────────────────────────────────────────

// Schema for creating shift type
const createShiftTypeSchema = z.object({
    name: z.string(),
    code: z.string(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    durationHours: z.number().min(1).max(24),
    gracePeriodMins: z.number().min(0).optional(),
    isNightShift: z.boolean().optional(),
    defaultFor: z.enum(['FRONT_OFFICE', 'HOUSEKEEPING', 'MAINTENANCE', 'FOOD_BEVERAGE', 'ADMIN']).optional(),
});

// GET /api/shifts/types
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        const shiftTypes = await getShiftTypes();

        return ok({ shiftTypes });
    } catch (error) {
        console.error("Error fetching shift types:", error);
        return serverError();
    }
}

// POST /api/shifts/types
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        // Only ADMIN and SUPER_ADMIN can create shift types
        const userRole = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
            return forbidden("You don't have permission to create shift types");
        }

        const body = await request.json();
        const parsed = createShiftTypeSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(parsed.error.errors[0]?.message || "Invalid input");
        }

        const shiftType = await createShiftType(parsed.data);

        return created(shiftType);
    } catch (error) {
        console.error("Error creating shift type:", error);
        return serverError();
    }
}
