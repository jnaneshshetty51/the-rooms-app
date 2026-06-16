import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, unauthorized, forbidden, notFound, serverError } from "@the-rooms/api/response";
import { checkOutFromShift } from "@the-rooms/db/queries/shiftQueries";
import { logStaffActivity } from "@the-rooms/db/queries/staffActivityQueries";

// ─── Guest Lookup ─────────────────────────────────────────────────────────

// POST /api/shifts/[id]/check-out
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        const { id } = await params; const shiftId = id;

        // Get the shift to verify ownership
        const shift = await db.staffShift.findUnique({
            where: { id: shiftId },
            include: { shiftType: true },
        });

        if (!shift) {
            return notFound("Shift");
        }

        // Staff can only check out from their own shifts unless ADMIN/SUPER_ADMIN
        const userRole = session.user.role;
        const staffProfile = await db.staffProfile.findUnique({
            where: { userId: session.user.id },
        });

        if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole) && shift.staffId !== staffProfile?.id) {
            return forbidden("You can only check out from your own shifts");
        }

        if (!shift.checkInTime) {
            return notFound("Shift not checked in");
        }

        const body = await request.json().catch(() => ({}));
        const checkOutTime = body.checkOutTime ? new Date(body.checkOutTime) : undefined;

        const result = await checkOutFromShift(shiftId, checkOutTime);

        // Log staff activity
        if (staffProfile) {
            await logStaffActivity({
                staffId: staffProfile.id,
                action: 'SHIFT_CHECK_OUT',
                entityType: 'shift',
                entityId: shiftId,
                notes: `Checked out from ${shift.shiftType?.name || 'shift'}`,
                propertyId: shift.propertyId,
            });
        }

        // Create audit log
        await db.auditLog.create({
            data: {
                userId: session.user.id,
                action: "SHIFT_CHECK_OUT",
                entity: "staffShift",
                entityId: shiftId,
                metadata: {
                    staffId: shift.staffId,
                    shiftDate: shift.shiftDate,
                    checkInTime: shift.checkInTime?.toISOString(),
                    checkOutTime: (checkOutTime || new Date()).toISOString(),
                },
            },
        });

        return ok(result);
    } catch (error) {
        console.error("Error checking out from shift:", error);
        if (error instanceof Error && error.message.includes("not checked in")) {
            return notFound("Shift not checked in");
        }
        return serverError();
    }
}
