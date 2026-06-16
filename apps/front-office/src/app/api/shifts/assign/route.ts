import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, created, badRequest, unauthorized, forbidden, serverError } from "@the-rooms/api/response";
import { z } from "zod";
import { assignShift } from "@the-rooms/db/queries/shiftQueries";

// ─── Guest Lookup ─────────────────────────────────────────────────────────

// Schema for assigning shift
const assignShiftSchema = z.object({
    staffId: z.string(),
    shiftTypeId: z.string(),
    date: z.string().transform(s => new Date(s)),
    propertyId: z.string().optional(),
});

// POST /api/shifts/assign
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        // Role check
        const userRole = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN', 'FRONT_OFFICE'].includes(userRole)) {
            return forbidden("You don't have permission to assign shifts");
        }

        const body = await request.json();
        const parsed = assignShiftSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(parsed.error.errors[0]?.message || "Invalid input");
        }

        const { staffId, shiftTypeId, date, propertyId } = parsed.data;

        // Verify staff exists
        const staff = await db.staffProfile.findUnique({
            where: { id: staffId },
        });

        if (!staff) {
            return badRequest("Staff member not found");
        }

        // Verify shift type exists
        const shiftType = await db.shiftType.findUnique({
            where: { id: shiftTypeId },
        });

        if (!shiftType) {
            return badRequest("Shift type not found");
        }

        const result = await assignShift({
            staffId,
            shiftTypeId,
            date,
            propertyId,
        });

        // Create audit log
        await db.auditLog.create({
            data: {
                userId: session.user.id,
                action: "SHIFT_ASSIGNED",
                entity: "staffShift",
                entityId: result.id,
                metadata: {
                    staffId,
                    staffName: staff.user?.name,
                    shiftTypeId,
                    shiftTypeName: shiftType.name,
                    date: date.toISOString(),
                },
            },
        });

        return created(result);
    } catch (error) {
        console.error("Error assigning shift:", error);
        return serverError();
    }
}
