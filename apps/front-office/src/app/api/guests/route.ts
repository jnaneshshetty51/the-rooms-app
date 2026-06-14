import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { createGuest, getGuests } from "@the-rooms/db";

// GET /api/guests - List all guests with pagination and search
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const perPage = parseInt(searchParams.get("perPage") ?? "20");
    const search = searchParams.get("search") ?? undefined;
    const sortBy = (searchParams.get("sortBy") ?? "createdAt") as "name" | "createdAt" | "stayCount";
    const sortOrder = (searchParams.get("sortOrder") ?? "desc") as "asc" | "desc";

    const result = await getGuests({
      page,
      perPage,
      search,
      sortBy,
      sortOrder,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching guests:", error);
    return NextResponse.json({ error: "Failed to fetch guests" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, email, alternatePhone, address, city, state, pincode, companyName, notes } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
    }

    const guest = await createGuest({ name, phone, email, alternatePhone, address, city, state, pincode, companyName, notes });
    return NextResponse.json(guest, { status: 201 });
  } catch (error) {
    console.error("Error creating guest:", error);
    return NextResponse.json({ error: "Failed to create guest" }, { status: 500 });
  }
}
