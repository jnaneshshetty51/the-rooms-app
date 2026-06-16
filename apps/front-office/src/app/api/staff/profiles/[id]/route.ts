import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from "@the-rooms/api/response";
import { z } from "zod";
import { updateStaffProfile, getStaffProfileById } from "@the-rooms/db/queries/staffQueries";

// ─── Guest Lookup ─────────────────────────────────────────────────────────

// Schema for updating staff profile
const updateStaffProfileSchema = z.object({
    employeeId: z.string().optional(),
    department: z.enum(['FRONT_OFFICE', 'HOUSEKEEPING', 'MAINTENANCE', 'FOOD_BEVERAGE', 'ADMIN']).optional(),
    designation: z.string().optional(),
    terminationDate: z.string().transform(s => new Date(s)).optional(),
    personalPhone: z.string().optional(),
    emergencyContact: z.string().optional(),
    emergencyPhone: z.string().optional(),
    isActive: z.boolean().optional(),
});

// PATCH /api/staff/profiles/[id]
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        // Only ADMIN and SUPER_ADMIN can update staff profiles
        const userRole = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
            return forbidden("You don't have permission to update staff profiles");
        }

        const staffId = params.id;
        const body = await request.json();
        const parsed = updateStaffProfileSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(parsed.error.errors[0]?.message || "Invalid input");
        }

        const existingProfile = await getStaffProfileById(staffId);
        if (!existingProfile) {
            return notFound("Staff profile");
        }

        const updatedProfile = await updateStaffProfile(staffId, parsed.data);

        // Create audit log
        await db.auditLog.create({
            data: {
                userId: session.user.id,
                action: "STAFF_PROFILE_UPDATED",
                entity: "staffProfile",
                entityId: staffId,
                metadata: {
                    previousData: {
                        department: existingProfile.department,
                        designation: existingProfile.designation,
                        isActive: existingProfile.isActive,
                    },
                    newData: parsed.data,
                },
            },
        });

        return ok(updatedProfile);
    } catch (error) {
        console.error("Error updating staff profile:", error);
        return serverError();
    }
}
