import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const room = await prisma.room.findUnique({
      where: { id },
      select: { id: true, roomNumber: true, type: true, floor: true, status: true, cleaningStatus: true }
    });
    
    if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(room);
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const body = await request.json();
    const updateData: any = {};
    if (body.cleaningStatus) updateData.cleaningStatus = body.cleaningStatus;
    if (body.status) updateData.status = body.status;
    if (body.notes) {
      // Append note to internalNotes (in a real app you'd use HousekeepingTask)
      const room = await prisma.room.findUnique({ where: { id } });
      updateData.internalNotes = room?.internalNotes 
        ? `${room.internalNotes}\n[Housekeeping ${new Date().toISOString().split('T')[0]}]: ${body.notes}`
        : `[Housekeeping ${new Date().toISOString().split('T')[0]}]: ${body.notes}`;
    }

    const updatedRoom = await prisma.room.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedRoom);
  } catch (error) {
    console.error("Error updating room:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
