// apps/admin/src/app/api/rooms/[id]/photos/route.ts
import { NextRequest } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, created, badRequest, serverError, notFound } from "@the-rooms/api/response";
import { uploadRoomPhotoWithDeduplication, getMinioClient, deleteObject } from "@/lib/minio";
import { z } from "zod";

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const UpdatePhotoSchema = z.object({
  photoId: z.string().min(1),
  caption: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return badRequest("Unauthorized", "UNAUTHORIZED");

    const userRole = session.user.role;
    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      return badRequest("Forbidden", "FORBIDDEN");
    }

    const { id } = await params;
    const photos = await db.roomPhoto.findMany({
      where: { roomId: id },
      orderBy: { sortOrder: "asc" },
    });

    return ok({ photos });
  } catch (error) {
    console.error("[ROOM_PHOTOS_GET]", error);
    return serverError("Internal server error", "INTERNAL_ERROR");
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return badRequest("Unauthorized", "UNAUTHORIZED");

    const userRole = session.user.role;
    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      return badRequest("Forbidden", "FORBIDDEN");
    }

    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const caption = formData.get("caption") as string | null;
    const url = formData.get("url") as string | null;

    if (!url && !file) {
      return badRequest("No file or URL provided", "VALIDATION_ERROR");
    }

    let photoUrl = url ?? "";
    let storageKey: string | null = null;
    let isDupe = false;

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await uploadRoomPhotoWithDeduplication(id, file.name, buffer);
      photoUrl = result.url;
      storageKey = result.storageKey;
      isDupe = result.isDupe;
    }

    // Get max sort order
    const lastPhoto = await db.roomPhoto.findFirst({
      where: { roomId: id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const photo = await db.roomPhoto.create({
      data: {
        roomId: id,
        url: photoUrl,
        caption: caption ?? null,
        sortOrder: (lastPhoto?.sortOrder ?? -1) + 1,
        storageKey: storageKey as string | undefined,
      },
    });

    return created({ photo });
  } catch (error) {
    console.error("[ROOM_PHOTOS_POST]", error);
    return serverError("Internal server error", "INTERNAL_ERROR");
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return badRequest("Unauthorized", "UNAUTHORIZED");

    const userRole = session.user.role;
    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      return badRequest("Forbidden", "FORBIDDEN");
    }

    const body = await request.json();
    const parsed = UpdatePhotoSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(
        parsed.error.errors.map(e => e.message).join(', '),
        "VALIDATION_ERROR"
      );
    }

    const { photoId, caption, sortOrder } = parsed.data;

    const photo = await db.roomPhoto.update({
      where: { id: photoId },
      data: {
        ...(caption !== undefined && { caption }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return ok({ photo });
  } catch (error) {
    console.error("[ROOM_PHOTOS_PATCH]", error);
    return serverError("Internal server error", "INTERNAL_ERROR");
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return badRequest("Unauthorized", "UNAUTHORIZED");

    const userRole = session.user.role;
    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      return badRequest("Forbidden", "FORBIDDEN");
    }

    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get("photoId");

    if (!photoId) return badRequest("photoId required", "VALIDATION_ERROR");

    // Get the photo record first to access storageKey for MinIO deletion
    const photo = await db.roomPhoto.findUnique({ where: { id: photoId } });
    if (!photo) {
      return notFound("Photo", "NOT_FOUND");
    }

    // Delete from MinIO if storageKey exists
    const storageKey = (photo as { storageKey?: string | null }).storageKey;
    if (storageKey) {
      try {
        const client = getMinioClient();
        const bucket = process.env.MINIO_BUCKET || 'therooms-storage';
        await deleteObject(bucket, storageKey);
      } catch (minioError) {
        console.error("[ROOM_PHOTOS_MINIO_DELETE]", minioError);
      }
    }

    // Delete from database
    await db.roomPhoto.delete({ where: { id: photoId } });
    return ok({ success: true });
  } catch (error) {
    console.error("[ROOM_PHOTOS_DELETE]", error);
    return serverError("Internal server error", "INTERNAL_ERROR");
  }
}
