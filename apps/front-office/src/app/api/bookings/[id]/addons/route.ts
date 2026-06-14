import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { getBookingById, getAddonsByBooking, createAddon, getAddonTypes, ADDON_TYPES } from "@the-rooms/db";
import { createAuditLog, getClientIp } from "@the-rooms/api/middleware";
import { z } from "zod";

// ─── Addon Types API ───────────────────────────────────────────────────────────

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify booking exists
        const booking = await getBookingById(id);
        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        const addons = await getAddonsByBooking(id);
        const totals = await import("@the-rooms/db").then(m => m.getAddonTotalsByBooking(id));

        return NextResponse.json({
            addons,
            totals,
        });
    } catch (error) {
        console.error("Error fetching addons:", error);
        return NextResponse.json({ error: "Failed to fetch addons" }, { status: 500 });
    }
}

// ─── Create Addon Schema ───────────────────────────────────────────────────────

const createAddonSchema = z.object({
    type: z.enum(["FB", "LAUNDRY", "SPA", "MINIBAR", "RESTAURANT", "TRANSPORT", "ROOM_SERVICE", "OTHER"]),
    description: z.string().min(1, "Description is required"),
    amount: z.number().positive("Amount must be positive"),
    quantity: z.number().int().positive().default(1),
    serviceDate: z.string().or(z.date()).transform(val => new Date(val)),
});

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify booking exists
        const booking = await getBookingById(id);
        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        // Only allow addons for CONFIRMED or CHECKED_IN bookings
        if (booking.status !== "CONFIRMED" && booking.status !== "CHECKED_IN") {
            return NextResponse.json(
                { error: "Cannot add addons to this booking. Only CONFIRMED or CHECKED_IN bookings allow addons." },
                { status: 400 }
            );
        }

        const body = await request.json();
        const parsed = createAddonSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Validation failed", details: parsed.error.errors },
                { status: 400 }
            );
        }

        const { type, description, amount, quantity, serviceDate } = parsed.data;
        const userId = (session.user as { id?: string }).id;

        const addon = await createAddon({
            bookingId: id,
            type,
            description,
            amount,
            quantity,
            serviceDate,
            addedById: userId,
        });

        // Create audit log
        await createAuditLog({
            userId,
            bookingId: id,
            action: "ADDON_ADDED",
            entity: "booking_addon",
            entityId: addon.id,
            metadata: {
                type,
                description,
                amount,
                quantity,
                totalAmount: addon.totalAmount.toNumber(),
            },
            ipAddress: getClientIp(request),
        });

        return NextResponse.json({ addon }, { status: 201 });
    } catch (error) {
        console.error("Error creating addon:", error);
        return NextResponse.json({ error: "Failed to create addon" }, { status: 500 });
    }
}
