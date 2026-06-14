import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { getBookingById, getAddonById, deleteAddon } from "@the-rooms/db";
import { createAuditLog, getClientIp } from "@the-rooms/api/middleware";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; addonId: string }> }
) {
    const { id, addonId } = await params;

    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify booking exists
        const booking = await getBookingById(id);
        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        // Verify addon exists and belongs to this booking
        const addon = await getAddonById(addonId);
        if (!addon) {
            return NextResponse.json({ error: "Addon not found" }, { status: 404 });
        }

        if (addon.bookingId !== id) {
            return NextResponse.json({ error: "Addon does not belong to this booking" }, { status: 400 });
        }

        const userId = (session.user as { id?: string }).id;

        // Store addon info for audit log before deletion
        const addonInfo = {
            type: addon.type,
            description: addon.description,
            amount: addon.amount.toNumber(),
            quantity: addon.quantity,
            totalAmount: addon.totalAmount.toNumber(),
        };

        // Delete the addon
        await deleteAddon(addonId);

        // Create audit log
        await createAuditLog({
            userId,
            bookingId: id,
            action: "ADDON_DELETED",
            entity: "booking_addon",
            entityId: addonId,
            metadata: addonInfo,
            ipAddress: getClientIp(request),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting addon:", error);
        return NextResponse.json({ error: "Failed to delete addon" }, { status: 500 });
    }
}
