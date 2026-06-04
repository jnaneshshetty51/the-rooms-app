import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const communications = await db.communication.findMany({
      orderBy: { sentAt: "desc" },
    });

    const alerts = await db.alert.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: { communications, alerts } });
  } catch (error) {
    console.error("[GET_COMMUNICATIONS]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
