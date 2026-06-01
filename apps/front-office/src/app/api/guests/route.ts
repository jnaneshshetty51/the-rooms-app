import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { createGuest } from "@the-rooms/db";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, email, alternatePhone, address, companyName, notes } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
    }

    const guest = await createGuest({ name, phone, email, alternatePhone, address, companyName, notes });
    return NextResponse.json(guest, { status: 201 });
  } catch (error) {
    console.error("Error creating guest:", error);
    return NextResponse.json({ error: "Failed to create guest" }, { status: 500 });
  }
}
