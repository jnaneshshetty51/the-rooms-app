// POST /api/documents/upload — upload a file to MinIO, return public URL
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { uploadGuestDoc } from "@/lib/minio";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const guestId = (session.user as { id?: string }).id ?? "unknown";
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadGuestDoc(guestId, file.name, buffer);

    return NextResponse.json({ url });
  } catch (error) {
    console.error("[DOC_UPLOAD]", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
