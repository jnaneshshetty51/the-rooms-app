import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { searchGuests } from "@the-rooms/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ guests: [] });
    }

    const guests = await searchGuests(query);
    return NextResponse.json({ guests });
  } catch (error) {
    console.error("Error searching guests:", error);
    return NextResponse.json({ error: "Failed to search guests" }, { status: 500 });
  }
}
