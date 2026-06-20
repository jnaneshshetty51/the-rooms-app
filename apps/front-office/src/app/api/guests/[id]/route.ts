import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { getPropertyIdFromSession, getPropertyIdsFromSession, createAuditLog, getClientIp } from "@the-rooms/api/middleware";

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

    // ─── Property Scoping ─────────────────────────────────────────────────────
    // Get property IDs for the user based on role
    const { propertyIds, isSuperAdmin } = await getPropertyIdsFromSession(session);

    // Find guest and verify property access
    const guest = await db.guest.findUnique({
      where: { id },
      include: {
        bookings: {
          include: { room: { select: { roomNumber: true, type: true, propertyId: true } } },
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

    // ─── Property Access Check ───────────────────────────────────────────────
    if (!isSuperAdmin && propertyIds) {
      // Check if guest has any bookings at accessible properties
      const hasAccess = guest.bookings.some(booking =>
        propertyIds.includes(booking.room.propertyId)
      );
      if (!hasAccess) {
        return NextResponse.json({ error: "Access denied to this guest" }, { status: 403 });
      }
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

    // ─── Role Check ──────────────────────────────────────────────────────────
    const userRole = session.user.role;
    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN" && userRole !== "FRONT_OFFICE") {
      return NextResponse.json({ error: "Forbidden - insufficient role" }, { status: 403 });
    }

    // ─── Property Scoping ─────────────────────────────────────────────────────
    // Get property IDs for the user based on role
    const { propertyIds, isSuperAdmin } = await getPropertyIdsFromSession(session);

    // Find guest and verify property access
    const guest = await db.guest.findUnique({
      where: { id },
      include: {
        bookings: {
          include: { room: { select: { propertyId: true } } },
        },
      },
    });

    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    // ─── Property Access Check ───────────────────────────────────────────────
    if (!isSuperAdmin && propertyIds) {
      // Check if guest has any bookings at accessible properties
      const hasAccess = guest.bookings.some(booking =>
        propertyIds.includes(booking.room.propertyId)
      );
      if (!hasAccess) {
        return NextResponse.json({ error: "Access denied to this guest" }, { status: 403 });
      }
    }

    const body = await request.json();
    const { name, phone, email, alternatePhone, address, companyName } = body;

    const updatedGuest = await db.guest.update({
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

    // ─── Audit Log ───────────────────────────────────────────────────────────
    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entity: "Guest",
      entityId: id,
      metadata: { fieldsUpdated: Object.keys(body) },
      ipAddress: getClientIp(request),
    });

    return NextResponse.json({ success: true, guest: updatedGuest });
  } catch (error) {
    console.error("Error updating guest:", error);
    return NextResponse.json({ error: "Failed to update guest" }, { status: 500 });
  }
}
