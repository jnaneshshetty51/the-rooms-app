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
    const guestId = formData.get("guestId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const uploaderId = guestId ?? (session.user as { id?: string }).id ?? "unknown";
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadGuestDoc(uploaderId, file.name, buffer);

    return NextResponse.json({ url });
  } catch (error) {
    console.error("[DOC_UPLOAD]", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
