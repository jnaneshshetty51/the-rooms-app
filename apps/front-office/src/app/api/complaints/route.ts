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
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (status) {
      const statuses = status.split(",");
      where.status = { in: statuses };
    }

    const complaints = await prisma.complaint.findMany({
      where,
      include: {
        booking: {
          include: {
            guest: true,
            room: { select: { roomNumber: true, type: true } },
          },
        },
      },
      orderBy: [{ isUrgent: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ complaints });
  } catch (error) {
    console.error("Error fetching complaints:", error);
    return NextResponse.json({ error: "Failed to fetch complaints" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, resolution } = body;

    if (!id) {
      return NextResponse.json({ error: "Complaint ID required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (status) {
      updateData.status = status;
      if (status === "RESOLVED") {
        updateData.resolvedAt = new Date();
      }
    }
    if (resolution) {
      updateData.resolution = resolution;
    }

    const complaint = await prisma.complaint.update({
      where: { id },
      data: updateData,
      include: {
        booking: {
          include: {
            guest: true,
            room: { select: { roomNumber: true, type: true } },
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as { id?: string }).id,
        bookingId: complaint.bookingId,
        action: "UPDATE",
        entity: "complaint",
        entityId: id,
        metadata: { status, resolution },
      },
    });

    return NextResponse.json({ complaint });
  } catch (error) {
    console.error("Error updating complaint:", error);
    return NextResponse.json({ error: "Failed to update complaint" }, { status: 500 });
  }
}
