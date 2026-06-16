import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";
import { z } from "zod";

// ─── Request Schema ───────────────────────────────────────────────────────────

const CreateWaitlistSchema = z.object({
    guestName: z.string().min(1, "Guest name is required"),
    guestPhone: z.string().min(10, "Valid phone number is required"),
    guestEmail: z.string().email().optional(),
    roomType: z.enum(["STUDIO", "PREMIUM"]),
    checkIn: z.string().datetime({ message: "Invalid check-in date" }),
    checkOut: z.string().datetime({ message: "Invalid check-out date" }),
    guestsCount: z.number().int().min(1).default(1),
    priority: z.number().int().default(0),
    propertyId: z.string().default("default"),
});

const WaitlistFiltersSchema = z.object({
    status: z.enum(["WAITING", "NOTIFIED", "CONVERTED", "EXPIRED", "CANCELLED"]).optional(),
    roomType: z.enum(["STUDIO", "PREMIUM"]).optional(),
    propertyId: z.string().optional(),
    page: z.number().int().positive().default(1),
    perPage: z.number().int().positive().max(100).default(20),
});

// ─── Get Waitlist ─────────────────────────────────────────────────────────────

/**
 * GET /api/bookings/waitlist
 * Get waitlist entries with optional filters
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status") ?? undefined;
        const roomType = searchParams.get("roomType") ?? undefined;
        const propertyId = searchParams.get("propertyId") ?? undefined;
        const page = parseInt(searchParams.get("page") ?? "1");
        const perPage = parseInt(searchParams.get("perPage") ?? "20");

        const filters = WaitlistFiltersSchema.parse({
            status,
            roomType,
            propertyId,
            page,
            perPage,
        });

        const where: any = {};
        if (filters.status) where.status = filters.status;
        if (filters.roomType) where.roomType = filters.roomType;
        if (filters.propertyId) where.propertyId = filters.propertyId;

        const [entries, total] = await Promise.all([
            prisma.waitlist.findMany({
                where,
                orderBy: [
                    { priority: 'desc' },
                    { createdAt: 'asc' },
                ],
                skip: (filters.page - 1) * filters.perPage,
                take: filters.perPage,
            }),
            prisma.waitlist.count({ where }),
        ]);

        return NextResponse.json({
            entries,
            total,
            pages: Math.ceil(total / filters.perPage),
            page: filters.page,
        });
    } catch (error) {
        console.error("[WAITLIST_GET_ERROR]", error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Validation error", details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: "Failed to fetch waitlist" },
            { status: 500 }
        );
    }
}

// ─── Add to Waitlist ──────────────────────────────────────────────────────────

/**
 * POST /api/bookings/waitlist
 * Add a guest to the waitlist
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only FRONT_OFFICE, ADMIN, and SUPER_ADMIN can manage waitlist
        if (!['FRONT_OFFICE', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const data = CreateWaitlistSchema.parse(body);

        const checkInDate = new Date(data.checkIn);
        const checkOutDate = new Date(data.checkOut);

        // Validate check-out is after check-in
        if (checkOutDate <= checkInDate) {
            return NextResponse.json(
                { error: "Check-out must be after check-in" },
                { status: 400 }
            );
        }

        const userId = (session.user as { id: string }).id;

        // Generate waitlist number
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const prefix = `WTL-${dateStr}-`;

        const lastEntry = await prisma.waitlist.findFirst({
            where: { waitlistNumber: { startsWith: prefix } },
            orderBy: { waitlistNumber: 'desc' },
            select: { waitlistNumber: true },
        });

        let counter = 1;
        if (lastEntry) {
            const lastCounter = parseInt(lastEntry.waitlistNumber.split('-').pop() ?? '0', 10);
            counter = lastCounter + 1;
        }

        const waitlistNumber = `${prefix}${String(counter).padStart(4, '0')}`;

        // Default expiry: 24 hours from creation
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        // Create waitlist entry
        const entry = await prisma.waitlist.create({
            data: {
                waitlistNumber,
                propertyId: data.propertyId,
                guestName: data.guestName,
                guestPhone: data.guestPhone,
                guestEmail: data.guestEmail,
                roomType: data.roomType,
                checkIn: checkInDate,
                checkOut: checkOutDate,
                guestsCount: data.guestsCount,
                priority: data.priority,
                status: 'WAITING',
                expiresAt,
            },
        });

        // Create audit log
        await prisma.auditLog.create({
            data: {
                userId,
                action: 'WAITLIST_CREATED',
                entity: 'waitlist',
                entityId: entry.id,
                metadata: {
                    waitlistNumber,
                    roomType: data.roomType,
                    checkIn: checkInDate.toISOString(),
                    checkOut: checkOutDate.toISOString(),
                    propertyId: data.propertyId,
                },
            },
        });

        return NextResponse.json(entry, { status: 201 });
    } catch (error) {
        console.error("[WAITLIST_CREATE_ERROR]", error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Validation error", details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: "Failed to create waitlist entry" },
            { status: 500 }
        );
    }
}