// apps/guest-portal/src/app/api/documents/route.ts
// GET /api/documents — fetch guest documents
// POST /api/documents — upload a guest document
import { auth } from "@the-rooms/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma, getGuestDocuments, uploadGuestDocument } from "@the-rooms/db";

async function getGuestIdFromSession(session: Awaited<ReturnType<typeof auth>>) {
  if (!session?.user?.email) return null;
  const guest = await prisma.guest.findFirst({
    where: { email: session.user.email },
  });
  return guest?.id;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const guestId = await getGuestIdFromSession(session);
    if (!guestId) {
      return NextResponse.json({ documents: [] });
    }

    const documents = await getGuestDocuments(guestId);
    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const guestId = await getGuestIdFromSession(session);
    if (!guestId) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    const body = await request.json();
    const { bookingId, documentType, frontUrl, backUrl } = body;

    if (!documentType || !frontUrl) {
      return NextResponse.json(
        { error: "documentType and frontUrl are required" },
        { status: 400 }
      );
    }

    const document = await uploadGuestDocument({
      guestId,
      bookingId,
      uploadedById: session.user.id,
      documentType,
      frontUrl,
      backUrl,
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}
