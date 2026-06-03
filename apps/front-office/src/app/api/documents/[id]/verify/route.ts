import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const document = await prisma.guestDocument.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const updatedDocument = await prisma.guestDocument.update({
      where: { id },
      data: {
        verified: true,
        verifiedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, document: updatedDocument });
  } catch (error) {
    console.error("Error verifying document:", error);
    return NextResponse.json({ error: "Failed to verify document" }, { status: 500 });
  }
}
