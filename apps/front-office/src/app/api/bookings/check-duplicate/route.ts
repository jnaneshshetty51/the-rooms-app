import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";
import { z } from "zod";

// ─── Request Schema ───────────────────────────────────────────────────────────

const DuplicateCheckSchema = z.object({
    guestPhone: z.string().optional(),
    guestEmail: z.string().email().optional(),
    guestName: z.string().optional(),
    checkIn: z.string().datetime({ message: "Invalid check-in date" }),
    checkOut: z.string().datetime({ message: "Invalid check-out date" }),
    roomType: z.enum(["STUDIO", "PREMIUM"]).optional(),
    excludeBookingId: z.string().optional(),
    propertyId: z.string().default("default"),
});

// ─── Check for Duplicates ─────────────────────────────────────────────────────

/**
 * POST /api/bookings/check-duplicate
 * Check if a booking might be a duplicate
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const data = DuplicateCheckSchema.parse(body);

        const checkIn = new Date(data.checkIn);
        const checkOut = new Date(data.checkOut);

        // Build date overlap condition
        const dateOverlapCondition = {
            OR: [
                // New check-in during existing booking
                { checkIn: { lte: checkIn }, checkOut: { gt: checkIn } },
                // New check-out during existing booking
                { checkIn: { lt: checkOut }, checkOut: { gte: checkOut } },
                // New booking contains existing
                { checkIn: { gte: checkIn }, checkOut: { lte: checkOut } },
            ],
        };

        const matches: any[] = [];
        let matchType: string | null = null;
        let confidence = 0;

        // 1. Exact phone + date overlap check (highest confidence)
        if (data.guestPhone) {
            const phoneMatches = await prisma.booking.findMany({
                where: {
                    guest: { phone: data.guestPhone },
                    id: data.excludeBookingId ? { not: data.excludeBookingId } : undefined,
                    status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                    propertyId: data.propertyId,
                    ...dateOverlapCondition,
                },
                include: {
                    guest: { select: { name: true, phone: true, email: true } },
                    room: { select: { roomNumber: true, type: true } },
                },
            });

            if (phoneMatches.length > 0) {
                matchType = 'EXACT_PHONE';
                confidence = 100;
                matches.push(...phoneMatches.map((b: any) => ({
                    bookingId: b.id,
                    bookingNumber: b.bookingNumber,
                    checkIn: b.checkIn,
                    checkOut: b.checkOut,
                    room: b.room,
                    guest: b.guest,
                })));
            }
        }

        // 2. Exact email + date overlap check
        if (data.guestEmail && confidence < 100) {
            const emailMatches = await prisma.booking.findMany({
                where: {
                    guest: { email: data.guestEmail },
                    id: data.excludeBookingId ? { not: data.excludeBookingId } : undefined,
                    status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                    propertyId: data.propertyId,
                    ...dateOverlapCondition,
                },
                include: {
                    guest: { select: { name: true, phone: true, email: true } },
                    room: { select: { roomNumber: true, type: true } },
                },
            });

            if (emailMatches.length > 0) {
                matchType = 'EXACT_EMAIL';
                confidence = 100;
                for (const booking of emailMatches) {
                    if (!matches.some((m: any) => m.bookingId === booking.id)) {
                        matches.push({
                            bookingId: booking.id,
                            bookingNumber: booking.bookingNumber,
                            checkIn: booking.checkIn,
                            checkOut: booking.checkOut,
                            room: booking.room,
                            guest: booking.guest,
                        });
                    }
                }
            }
        }

        // 3. Same room type + date overlap check (medium confidence)
        if (data.roomType && confidence < 100) {
            const roomMatches = await prisma.booking.findMany({
                where: {
                    room: { type: data.roomType },
                    id: data.excludeBookingId ? { not: data.excludeBookingId } : undefined,
                    status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                    propertyId: data.propertyId,
                    ...dateOverlapCondition,
                },
                include: {
                    guest: { select: { name: true, phone: true, email: true } },
                    room: { select: { roomNumber: true, type: true } },
                },
            });

            if (roomMatches.length > 0) {
                matchType = 'EXACT_DATES_ROOM';
                confidence = 90;
            }
        }

        // 4. Fuzzy name matching (lower confidence - just a warning)
        if (data.guestName && confidence < 100) {
            const namePrefix = data.guestName.substring(0, 3).toLowerCase();
            const fuzzyMatches = await prisma.booking.findMany({
                where: {
                    guest: { name: { contains: namePrefix } },
                    id: data.excludeBookingId ? { not: data.excludeBookingId } : undefined,
                    status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                    propertyId: data.propertyId,
                    ...dateOverlapCondition,
                },
                include: {
                    guest: { select: { name: true, phone: true, email: true } },
                    room: { select: { roomNumber: true, type: true } },
                },
            });

            if (fuzzyMatches.length > 0) {
                matchType = 'FUZZY_NAME';
                confidence = 60;
            }
        }

        const result = {
            isDuplicate: confidence >= 90,
            matchType,
            confidence,
            existingBookings: matches,
            action: confidence >= 100 ? 'BLOCK' : confidence >= 60 ? 'WARN' : 'ALLOW',
        };

        return NextResponse.json(result);
    } catch (error) {
        console.error("[DUPLICATE_CHECK_ERROR]", error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Validation error", details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: "Failed to check for duplicates" },
            { status: 500 }
        );
    }
}