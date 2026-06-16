import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@the-rooms/api/response";
import { checkInToShift } from "@the-rooms/db/queries/shiftQueries";
import { logStaffActivity } from "@the-rooms/db/queries/staffActivityQueries";

// ─── Guest Lookup ─────────────────────────────────────────────────────────

// POST /api/shifts/[id]/check-in
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
            include: { staff: true },
        });

        if (!shift) {
            return notFound("Shift");
        }

        // Staff can only check in to their own shifts unless ADMIN/SUPER_ADMIN
        const userRole = session.user.role;
        const staffProfile = await db.staffProfile.findUnique({
            where: { userId: session.user.id },
        });

        if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole) && shift.staffId !== staffProfile?.id) {
            return forbidden("You can only check in to your own shifts");
        }

        const body = await request.json().catch(() => ({}));
        const checkInTime = body.checkInTime ? new Date(body.checkInTime) : undefined;

        const result = await checkInToShift(shiftId, checkInTime);

        // Log staff activity
        if (staffProfile) {
            await logStaffActivity({
                staffId: staffProfile.id,
                action: 'SHIFT_CHECK_IN',
                entityType: 'shift',
                entityId: shiftId,
                notes: `Checked in to ${shift.shiftType?.name || 'shift'}`,
                propertyId: shift.propertyId,
            });
        }

        // Create audit log
        await db.auditLog.create({
            data: {
                userId: session.user.id,
                action: "SHIFT_CHECK_IN",
                entity: "staffShift",
                entityId: shiftId,
                metadata: {
                    staffId: shift.staffId,
                    shiftDate: shift.shiftDate,
                    checkInTime: (checkInTime || new Date()).toISOString(),
                },
            },
        });

        return ok(result);
    } catch (error) {
        console.error("Error checking in to shift:", error);
        return serverError();
    }
}
