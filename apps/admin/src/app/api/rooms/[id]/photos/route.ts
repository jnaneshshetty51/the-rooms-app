// apps/admin/src/app/api/rooms/[id]/photos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";

function requireAdmin(session: { user?: { role?: string } | null } | null) {
  if (!session?.user) throw new Error("Unauthorized");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") throw new Error("Forbidden");
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    requireAdmin(session);

    const { id } = await params;
    const photos = await prisma.roomPhoto.findMany({
      where: { roomId: id },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ photos });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    console.error("[ROOM_PHOTOS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    requireAdmin(session);

    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const caption = formData.get("caption") as string | null;
    const url = formData.get("url") as string | null;

    if (!url && !file) {
      return NextResponse.json({ error: "No file or URL provided" }, { status: 400 });
    }

    let photoUrl = url ?? "";

    // If file is provided, upload to MinIO (simulated here — in production, use @the-rooms/storage)
    if (file) {
      // In production: const { uploadFile } = await import("@the-rooms/storage");
      // const key = `rooms-photos/${id}/${Date.now()}-${file.name}`;
      // photoUrl = await uploadFile(key, file);
      // For now, use a placeholder
      photoUrl = `/uploads/rooms/${id}/${Date.now()}-${file.name}`;
    }

    // Get max sort order
    const lastPhoto = await prisma.roomPhoto.findFirst({
      where: { roomId: id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const photo = await prisma.roomPhoto.create({
      data: {
        roomId: id,
        url: photoUrl,
        caption: caption ?? null,
        sortOrder: (lastPhoto?.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json({ photo }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    console.error("[ROOM_PHOTOS_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    requireAdmin(session);

    const body = await request.json();
    const { photoId, caption, sortOrder } = body;

    if (!photoId) return NextResponse.json({ error: "photoId required" }, { status: 400 });

    const photo = await prisma.roomPhoto.update({
      where: { id: photoId },
      data: {
        ...(caption !== undefined && { caption }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return NextResponse.json({ photo });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    console.error("[ROOM_PHOTOS_PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    requireAdmin(session);

    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get("photoId");

    if (!photoId) return NextResponse.json({ error: "photoId required" }, { status: 400 });

    await prisma.roomPhoto.delete({ where: { id: photoId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    console.error("[ROOM_PHOTOS_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
