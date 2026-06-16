import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, created, badRequest, unauthorized, forbidden, serverError } from "@the-rooms/api/response";
import { z } from "zod";
import { getAllStaffProfiles, createStaffProfile } from "@the-rooms/db/queries/staffQueries";

// ─── Guest Lookup ─────────────────────────────────────────────────────────

// Schema for creating staff profile
const createStaffProfileSchema = z.object({
    userId: z.string(),
    employeeId: z.string().optional(),
    department: z.enum(['FRONT_OFFICE', 'HOUSEKEEPING', 'MAINTENANCE', 'FOOD_BEVERAGE', 'ADMIN']).optional(),
    designation: z.string().optional(),
    hireDate: z.string().transform(s => new Date(s)).optional(),
    personalPhone: z.string().optional(),
    emergencyContact: z.string().optional(),
    emergencyPhone: z.string().optional(),
});

// GET /api/staff/profiles
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        // Role check - ADMIN and SUPER_ADMIN can view all, others see their own
        const userRole = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
            return forbidden("You don't have permission to view staff profiles");
        }

        const { searchParams } = new URL(request.url);
        const department = searchParams.get("department") as any;
        const isActive = searchParams.get("isActive");
        const search = searchParams.get("search");

        const profiles = await getAllStaffProfiles({
            department: department || undefined,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
            search: search || undefined,
        });

        return ok({ profiles });
    } catch (error) {
        console.error("Error fetching staff profiles:", error);
        return serverError();
    }
}

// POST /api/staff/profiles
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        // Only ADMIN and SUPER_ADMIN can create staff profiles
        const userRole = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
            return forbidden("You don't have permission to create staff profiles");
        }

        const body = await request.json();
        const parsed = createStaffProfileSchema.safeParse(body);

        if (!parsed.success) {
            return badRequest(parsed.error.errors[0]?.message || "Invalid input");
        }

        const data = parsed.data;

        // Check if user exists
        const user = await db.user.findUnique({
            where: { id: data.userId },
        });

        if (!user) {
            return badRequest("User not found");
        }

        // Check if staff profile already exists
        const existingProfile = await db.staffProfile.findUnique({
            where: { userId: data.userId },
        });

        if (existingProfile) {
            return badRequest("Staff profile already exists for this user");
        }

        const profile = await createStaffProfile(data);

        // Create audit log
        await db.auditLog.create({
            data: {
                userId: session.user.id,
                action: "STAFF_PROFILE_CREATED",
                entity: "staffProfile",
                entityId: profile.id,
                metadata: {
                    userId: data.userId,
                    userName: user.name,
                    userEmail: user.email,
                    department: data.department || 'FRONT_OFFICE',
                    designation: data.designation,
                },
            },
        });

        return created(profile);
    } catch (error) {
        console.error("Error creating staff profile:", error);
        return serverError();
    }
}
