// apps/guest-portal/src/app/api/stats/route.ts
// GET /api/stats — guest dashboard stats
import { auth } from "@the-rooms/auth";
import { NextResponse } from "next/server";
import { prisma, getGuestDashboardStats } from "@the-rooms/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const guest = await prisma.guest.findFirst({
      where: { email: session.user.email ?? "" },
    });

    if (!guest) {
      return NextResponse.json({
        totalStays: 0,
        upcomingStays: 0,
        pastStays: 0,
        pendingDocuments: 0,
        openComplaints: 0,
      });
    }

    const stats = await getGuestDashboardStats(guest.id);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
