// apps/admin/src/app/api/room-types/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";

function requireAdmin(session: { user?: { role?: string } | null } | null) {
  if (!session?.user) throw new Error("Unauthorized");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") throw new Error("Forbidden");
}

export async function GET() {
  try {
    const session = await auth();
    requireAdmin(session);

    const profiles = await prisma.roomTypeProfile.findMany({
      include: { images: { orderBy: { sortOrder: "asc" } } },
      orderBy: { type: "asc" },
    });

    return NextResponse.json({ profiles });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal error";
    if (msg === "Unauthorized") return NextResponse.json({ error: msg }, { status: 401 });
    if (msg === "Forbidden") return NextResponse.json({ error: msg }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    requireAdmin(session);

    const body = await request.json();
    const { type, title, description, features } = body;

    if (!type || !title) {
      return NextResponse.json({ error: "type and title are required" }, { status: 400 });
    }

    const profile = await prisma.roomTypeProfile.upsert({
      where: { type },
      update: { title, description: description ?? null, features: features ?? [] },
      create: { type, title, description: description ?? null, features: features ?? [] },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal error";
    if (msg === "Unauthorized") return NextResponse.json({ error: msg }, { status: 401 });
    if (msg === "Forbidden") return NextResponse.json({ error: msg }, { status: 403 });
    console.error("[ROOM_TYPES_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
