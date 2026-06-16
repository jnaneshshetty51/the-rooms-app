import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { z } from "zod";
import { createOfflineBooking } from "@the-rooms/db";

const createOfflineSchema = z.object({
    localId: z.string().min(1, "Local ID is required"),
    clientTimestamp: z.string().transform(val => new Date(val)),
    guestName: z.string().min(1, "Guest name is required"),
    guestPhone: z.string().min(1, "Guest phone is required"),
    guestEmail: z.string().optional(),
    roomId: z.string().min(1, "Room ID is required"),
    checkIn: z.string().transform(val => new Date(val)),
    checkOut: z.string().transform(val => new Date(val)),
    guestsCount: z.number().optional().default(1),
    bookingType: z.enum(["DAILY", "MONTHLY"]).optional().default("DAILY"),
    bookingSource: z.enum(["WEBSITE", "WALK_IN", "PHONE", "OTA"]).optional().default("WALK_IN"),
    baseAmount: z.number().min(0),
    totalAmount: z.number().min(0),
    specialRequests: z.string().optional(),
    propertyId: z.string().optional(),
});

// POST /api/offline/bookings - Create an offline booking entry
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const data = createOfflineSchema.parse(body);

        const entry = await createOfflineBooking(
            {
                guestName: data.guestName,
                guestPhone: data.guestPhone,
                guestEmail: data.guestEmail,
                roomId: data.roomId,
                checkIn: data.checkIn,
                checkOut: data.checkOut,
                guestsCount: data.guestsCount,
                bookingType: data.bookingType,
                bookingSource: data.bookingSource,
                baseAmount: data.baseAmount,
                totalAmount: data.totalAmount,
                specialRequests: data.specialRequests,
            },
            data.localId,
            data.clientTimestamp,
            data.propertyId
        );

        return NextResponse.json({ entry }, { status: 201 });
    } catch (error) {
        console.error("Error creating offline booking:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        return NextResponse.json({ error: "Failed to create offline booking" }, { status: 500 });
    }
}
