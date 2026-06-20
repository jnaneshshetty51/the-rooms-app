import { ok, badRequest, serverError } from "@the-rooms/api/response";
import { auth } from "@the-rooms/auth";
import { getBookingById, db } from "@the-rooms/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return badRequest("Unauthorized", "UNAUTHORIZED");
    }

    const resolvedParams = await params;
    const bookingId = resolvedParams.id;

    // Get the booking
    const booking = await getBookingById(bookingId);
    if (!booking) {
      return badRequest("Booking not found", "NOT_FOUND");
    }

    // Verify state is CONFIRMED
    if (booking.status !== "CONFIRMED") {
      return badRequest("Only confirmed bookings can be cancelled", "INVALID_STATUS");
    }

    // Cancel the booking and release the room in a transaction
    await db.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: "CANCELLED" }
      });

      // Release the room back to VACANT
      await tx.room.update({
        where: { id: booking.roomId },
        data: { status: "VACANT" }
      });

      // Update any PENDING payments to FAILED
      await tx.payment.updateMany({
        where: { bookingId, status: "PENDING" },
        data: { status: "FAILED" }
      });
    });

    return ok({ success: true });
  } catch (error) {
    console.error("Failed to cancel booking:", error);
    return serverError("Internal Server Error", "INTERNAL_ERROR");
  }
}
