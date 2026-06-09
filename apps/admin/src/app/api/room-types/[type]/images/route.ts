// apps/admin/src/app/api/room-types/[type]/images/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";
import { uploadRoomTypeImage } from "@/lib/minio";

function requireAdmin(session: { user?: { role?: string } | null } | null) {
  if (!session?.user) throw new Error("Unauthorized");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") throw new Error("Forbidden");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const session = await auth();
    requireAdmin(session);

    const { type } = await params;
    const roomType = type.toUpperCase() as "STUDIO" | "PREMIUM";

    // Ensure profile exists
    let profile = await prisma.roomTypeProfile.findUnique({ where: { type: roomType } });
    if (!profile) {
      profile = await prisma.roomTypeProfile.create({
        data: {
          type: roomType,
          title: roomType === "STUDIO" ? "Studio Room" : "Premium Room",
        },
      });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const caption = formData.get("caption") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadRoomTypeImage(roomType, file.name, buffer);

    const last = await prisma.roomTypeImage.findFirst({
      where: { profileId: profile.id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const image = await prisma.roomTypeImage.create({
      data: {
        profileId: profile.id,
        url,
        caption: caption ?? null,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json({ image }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal error";
    if (msg === "Unauthorized") return NextResponse.json({ error: msg }, { status: 401 });
    if (msg === "Forbidden") return NextResponse.json({ error: msg }, { status: 403 });
    console.error("[ROOM_TYPE_IMAGE_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const session = await auth();
    requireAdmin(session);
    await params; // consume params

    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get("imageId");
    if (!imageId) return NextResponse.json({ error: "imageId required" }, { status: 400 });

    await prisma.roomTypeImage.delete({ where: { id: imageId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal error";
    if (msg === "Unauthorized") return NextResponse.json({ error: msg }, { status: 401 });
    if (msg === "Forbidden") return NextResponse.json({ error: msg }, { status: 403 });
    console.error("[ROOM_TYPE_IMAGE_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
