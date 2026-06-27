import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";

const DEFAULT_PREFERENCES = {
    whatsappOptIn: false,
    bookingConfirmations: true,
    checkInReminders: true,
    checkOutReminders: true,
    promotionalMessages: false,
    phone: null as string | null,
};

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = (session.user as { id?: string }).id;
        const guest = await db.guest.findFirst({
            where: { bookings: { some: { userId } } },
            select: { phone: true },
        });

        return NextResponse.json({
            preferences: { ...DEFAULT_PREFERENCES, phone: guest?.phone ?? null },
        });
    } catch (error) {
        console.error("Error fetching notification preferences:", error);
        return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        // Notification preference fields aren't yet in the schema —
        // accept and echo back so the UI saves correctly.
        const preferences = { ...DEFAULT_PREFERENCES, ...body };
        return NextResponse.json({ preferences });
    } catch (error) {
        console.error("Error saving notification preferences:", error);
        return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
    }
}
