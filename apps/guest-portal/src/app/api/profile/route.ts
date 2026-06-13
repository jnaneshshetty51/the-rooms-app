import { NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { getGuestByEmail, db } from "@the-rooms/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const guest = await getGuestByEmail(session.user.email);
    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    return NextResponse.json({ profile: guest });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const guest = await getGuestByEmail(session.user.email);
    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, phone, alternatePhone, address, city, state, pincode, companyName } = body;

    const updatedGuest = await db.guest.update({
      where: { id: guest.id },
      data: {
        name,
        phone,
        alternatePhone,
        address,
        city,
        state,
        pincode,
        companyName,
      },
    });

    return NextResponse.json({ profile: updatedGuest });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
