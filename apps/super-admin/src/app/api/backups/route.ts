import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const backups = await db.backup.findMany({
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ data: backups });
  } catch (error) {
    console.error("[GET_BACKUPS]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Simulate triggering a backup
    const backup = await db.backup.create({
      data: {
        size: "0 GB",
        status: "running",
        type: "Full",
        destination: "S3-compatible (Backblaze B2)",
        createdBy: session.user.id,
      },
    });

    // Simulate asynchronous completion
    setTimeout(async () => {
      await db.backup.update({
        where: { id: backup.id },
        data: {
          size: "2.5 GB",
          status: "success",
          duration: "14m",
        },
      });
    }, 15000); // 15 seconds simulation

    return NextResponse.json({ data: backup }, { status: 201 });
  } catch (error) {
    console.error("[POST_BACKUP]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
