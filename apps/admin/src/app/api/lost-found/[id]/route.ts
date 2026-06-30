import { NextRequest } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, notFound, badRequest, unauthorized, serverError } from "@the-rooms/api/response";
import { z } from "zod";

const UpdateSchema = z.object({
  status: z.enum(["UNCLAIMED", "CLAIMED", "DISPOSED", "RETURNED_TO_GUEST"]).optional(),
  claimedDate: z.string().optional(),
  itemDescription: z.string().optional(),
  color: z.string().optional(),
  roomNumber: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized("Authentication required");

    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.errors.map((e) => e.message).join(", "));
    }

    const existing = await db.lostAndFound.findUnique({ where: { id } });
    if (!existing) return notFound("Item not found");

    const updateData: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.claimedDate) {
      updateData.claimedDate = new Date(parsed.data.claimedDate);
    }

    const item = await db.lostAndFound.update({ where: { id }, data: updateData });
    return ok({ item });
  } catch (error) {
    console.error("Error updating lost & found item:", error);
    return serverError("Failed to update item", "INTERNAL_ERROR");
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized("Authentication required");

    const { id } = await params;
    const item = await db.lostAndFound.findUnique({
      where: { id },
      include: {
        booking: {
          select: { bookingNumber: true, guest: { select: { name: true, phone: true } } },
        },
      },
    });
    if (!item) return notFound("Item not found");
    return ok({ item });
  } catch (error) {
    console.error("Error fetching lost & found item:", error);
    return serverError("Failed to fetch item", "INTERNAL_ERROR");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized("Authentication required");

    const { id } = await params;
    const existing = await db.lostAndFound.findUnique({ where: { id } });
    if (!existing) return notFound("Item not found");

    await db.lostAndFound.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (error) {
    console.error("Error deleting lost & found item:", error);
    return serverError("Failed to delete item", "INTERNAL_ERROR");
  }
}
