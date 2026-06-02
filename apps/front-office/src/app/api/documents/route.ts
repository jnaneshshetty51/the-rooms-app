import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("bookingId");

    const whereClause: any = {};
    if (bookingId) {
      whereClause.bookingId = bookingId;
    }

    const documents = await prisma.guestDocument.findMany({
      where: whereClause,
      orderBy: { uploadedAt: "desc" },
      include: {
        guest: { select: { id: true, name: true, phone: true } },
        booking: { select: { id: true, bookingNumber: true } },
      },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}
