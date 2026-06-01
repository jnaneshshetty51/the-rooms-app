// apps/guest-portal/src/app/api/invoices/route.ts
// GET /api/invoices — fetch guest invoices
// GET /api/invoices/[id]/download — download invoice PDF
import { auth } from "@the-rooms/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma, getGuestInvoices, getInvoiceById } from "@the-rooms/db";

async function getGuestIdFromSession(session: Awaited<ReturnType<typeof auth>>) {
  if (!session?.user?.email) return null;
  const guest = await prisma.guest.findFirst({
    where: { email: session.user.email },
  });
  return guest?.id;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get("id");

    if (invoiceId) {
      // Get specific invoice
      const invoice = await getInvoiceById(invoiceId);
      if (!invoice) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }

      // Verify guest owns this invoice
      const guestId = await getGuestIdFromSession(session);
      if (invoice.booking.guestId !== guestId) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 403 }
        );
      }

      return NextResponse.json({ invoice });
    }

    // Get all invoices for guest
    const guestId = await getGuestIdFromSession(session);
    if (!guestId) {
      return NextResponse.json({ invoices: [] });
    }

    const invoices = await getGuestInvoices(guestId);
    return NextResponse.json({ invoices });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}
