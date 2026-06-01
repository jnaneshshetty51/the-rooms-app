import { getBookingsByGuest, getGuestByPhone } from "@the-rooms/db";
// apps/guest-portal/src/app/api/bookings/route.ts
// GET /api/bookings — fetch all bookings for the authenticated guest
import { auth } from "@the-rooms/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get guest by user email
    const guest = await getGuestByPhone(session.user.email ?? "");
    // Fallback: try to find by email
    let guestId = guest?.id;
    if (!guestId) {
      // Try to find guest by email in the session
      const { prisma } = await import("@the-rooms/db");
      const guestByEmail = await prisma.guest.findFirst({
        where: { email: session.user.email ?? "" },
      });
      guestId = guestByEmail?.id;
    }

    if (!guestId) {
      return NextResponse.json({ bookings: [] });
    }

    const bookings = await getBookingsByGuest(guestId);

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}
