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

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // SECURITY FIX: Derive guestId from session, not from request body
    // Front-office users can only upload documents for guests they have access to
    const userEmail = session.user.email;
    if (!userEmail) {
      return NextResponse.json({ error: "User email not found in session" }, { status: 401 });
    }

    // Find guest by email from session
    const guest = await prisma.guest.findFirst({
      where: { email: userEmail }
    });

    if (!guest) {
      return NextResponse.json({ error: "Guest not found for this user" }, { status: 404 });
    }

    const body = await request.json();
    const { bookingId, documentType, frontUrl, backUrl } = body;

    // documentType and frontUrl are still required from body (not security sensitive)
    if (!documentType || !frontUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { uploadGuestDocument } = await import("@the-rooms/db");

    // Use guestId from session-derived guest record, not from request body
    const document = await uploadGuestDocument({
      guestId: guest.id,
      bookingId: bookingId || undefined,
      uploadedById: (session.user as { id: string }).id,
      documentType,
      frontUrl,
      backUrl: backUrl || undefined,
    });

    return NextResponse.json({ document });
  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}
