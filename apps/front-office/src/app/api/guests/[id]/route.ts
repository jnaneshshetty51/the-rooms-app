import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const guest = await prisma.guest.findUnique({
      where: { id },
      include: {
        bookings: {
          include: { room: { select: { roomNumber: true, type: true } } },
          orderBy: { checkIn: "desc" },
        },
        documents: {
          orderBy: { uploadedAt: "desc" },
        },
      },
    });

    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    return NextResponse.json(guest);
  } catch (error) {
    console.error("Error fetching guest:", error);
    return NextResponse.json({ error: "Failed to fetch guest" }, { status: 500 });
  }
}

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

    const body = await request.json();
    const { name, phone, email, alternatePhone, address, companyName } = body;

    const guest = await prisma.guest.findUnique({ where: { id } });
    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    const updatedGuest = await prisma.guest.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        phone: phone !== undefined ? phone : undefined,
        email: email !== undefined ? email : undefined,
        alternatePhone: alternatePhone !== undefined ? alternatePhone : undefined,
        address: address !== undefined ? address : undefined,
        companyName: companyName !== undefined ? companyName : undefined,
      },
    });

    return NextResponse.json({ success: true, guest: updatedGuest });
  } catch (error) {
    console.error("Error updating guest:", error);
    return NextResponse.json({ error: "Failed to update guest" }, { status: 500 });
  }
}
