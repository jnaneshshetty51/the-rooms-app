import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { getInvoiceByBookingId } from "@the-rooms/db";
import prisma from "@the-rooms/db";
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import React from "react";

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, padding: 40, color: "#1a1a1a" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 32 },
  hotelName: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#E17055" },
  hotelDetails: { fontSize: 9, color: "#666", marginTop: 4, lineHeight: 1.5 },
  invoiceLabel: { fontSize: 28, fontFamily: "Helvetica-Bold", color: "#e0e0e0", textAlign: "right" },
  invoiceMeta: { fontSize: 9, color: "#666", textAlign: "right", marginTop: 4, lineHeight: 1.6 },
  divider: { borderBottomWidth: 1, borderBottomColor: "#e5e7eb", marginVertical: 20 },
  sectionTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#666", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  twoCol: { flexDirection: "row", gap: 40, marginBottom: 24 },
  col: { flex: 1 },
  label: { fontSize: 8, color: "#888", marginBottom: 2 },
  value: { fontSize: 10, color: "#1a1a1a" },
  tableHeader: { flexDirection: "row", backgroundColor: "#f9fafb", padding: "8 12", borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#e5e7eb" },
  tableRow: { flexDirection: "row", padding: "10 12", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  colDesc: { flex: 4 },
  colRight: { flex: 1, textAlign: "right" },
  thText: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#666" },
  tdText: { fontSize: 10 },
  summaryRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 4 },
  summaryLabel: { width: 140, fontSize: 10, color: "#666", textAlign: "right", paddingRight: 16 },
  summaryValue: { width: 80, fontSize: 10, textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#e5e7eb" },
  totalLabel: { width: 140, fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "right", paddingRight: 16 },
  totalValue: { width: 80, fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "right" },
  paidBadge: { backgroundColor: "#d1fae5", borderRadius: 4, paddingVertical: 4, paddingHorizontal: 10, alignSelf: "flex-end", marginTop: 12 },
  paidText: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#065f46" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 10, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 8, color: "#999" },
});

// ─── Helper ──────────────────────────────────────────────────────────────────

function fmt(amount: string | number | { toNumber: () => number }) {
  const n = typeof amount === "object" ? amount.toNumber() : Number(amount);
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function nights(checkIn: Date | string, checkOut: Date | string) {
  return Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000);
}

// ─── PDF Document ─────────────────────────────────────────────────────────────

function InvoicePDF({ invoice, hotel }: { invoice: any; hotel: any }) {
  const b = invoice.booking;
  const n = nights(b.checkIn, b.checkOut);
  const base = Number(b.baseAmount);
  const discount = Number(b.discountAmount);
  const extras = Number(b.extrasAmount);
  const subtotal = base - discount + extras;
  const gst = Number(b.totalAmount) - subtotal;
  const cgst = gst / 2;
  const sgst = gst / 2;
  const totalPaid = (invoice.payment?.amount ? Number(invoice.payment.amount) : 0);
  const isPaid = b.paymentStatus === "PAID" || b.paymentStatus === "OVERPAID";

  return React.createElement(
    Document,
    { title: `Invoice ${invoice.invoiceNumber}` },
    React.createElement(
      Page,
      { size: "A4", style: styles.page },

      // ── Header ──
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: styles.hotelName }, hotel?.hotelName || "The Rooms"),
          React.createElement(Text, { style: styles.hotelDetails },
            [hotel?.address, hotel?.phone, hotel?.email, hotel?.gstNumber ? `GST: ${hotel.gstNumber}` : null]
              .filter(Boolean).join("  |  ")
          )
        ),
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: styles.invoiceLabel }, "INVOICE"),
          React.createElement(Text, { style: styles.invoiceMeta },
            `Invoice #: ${invoice.invoiceNumber}\nDate: ${fmtDate(invoice.issuedAt)}\nBooking #: ${b.bookingNumber}`
          )
        )
      ),

      React.createElement(View, { style: styles.divider }),

      // ── Guest + Stay ──
      React.createElement(
        View,
        { style: styles.twoCol },
        React.createElement(
          View,
          { style: styles.col },
          React.createElement(Text, { style: styles.sectionTitle }, "Bill To"),
          React.createElement(Text, { style: styles.value }, b.guest.name),
          React.createElement(Text, { style: [styles.value, { color: "#666" }] as any }, b.guest.phone),
          b.guest.email ? React.createElement(Text, { style: [styles.value, { color: "#666" }] as any }, b.guest.email) : null,
          b.guest.companyName ? React.createElement(Text, { style: [styles.value, { color: "#666" }] as any }, b.guest.companyName) : null,
        ),
        React.createElement(
          View,
          { style: styles.col },
          React.createElement(Text, { style: styles.sectionTitle }, "Stay Details"),
          React.createElement(View, { style: { flexDirection: "row", gap: 32 } as any },
            React.createElement(View, null,
              React.createElement(Text, { style: styles.label }, "Check-in"),
              React.createElement(Text, { style: styles.value }, fmtDate(b.checkIn)),
            ),
            React.createElement(View, null,
              React.createElement(Text, { style: styles.label }, "Check-out"),
              React.createElement(Text, { style: styles.value }, fmtDate(b.checkOut)),
            ),
          ),
          React.createElement(View, { style: { flexDirection: "row", gap: 32, marginTop: 8 } as any },
            React.createElement(View, null,
              React.createElement(Text, { style: styles.label }, "Room"),
              React.createElement(Text, { style: styles.value }, `${b.room.roomNumber} (${b.room.type})`),
            ),
            React.createElement(View, null,
              React.createElement(Text, { style: styles.label }, "Duration"),
              React.createElement(Text, { style: styles.value }, `${n} night${n !== 1 ? "s" : ""}`),
            ),
          ),
        )
      ),

      // ── Line items ──
      React.createElement(View, { style: styles.tableHeader },
        React.createElement(Text, { style: [styles.thText, styles.colDesc] as any }, "Description"),
        React.createElement(Text, { style: [styles.thText, styles.colRight] as any }, "Nights"),
        React.createElement(Text, { style: [styles.thText, styles.colRight] as any }, "Rate"),
        React.createElement(Text, { style: [styles.thText, styles.colRight] as any }, "Amount"),
      ),

      React.createElement(View, { style: styles.tableRow },
        React.createElement(Text, { style: [styles.tdText, styles.colDesc] as any },
          `Room ${b.room.roomNumber} — ${b.bookingType === "MONTHLY" ? "Monthly" : "Daily"} Rate (${b.guestsCount} guest${b.guestsCount > 1 ? "s" : ""})`
        ),
        React.createElement(Text, { style: [styles.tdText, styles.colRight] as any }, String(n)),
        React.createElement(Text, { style: [styles.tdText, styles.colRight] as any }, fmt(base / n)),
        React.createElement(Text, { style: [styles.tdText, styles.colRight] as any }, fmt(base)),
      ),

      discount > 0 ? React.createElement(View, { style: styles.tableRow },
        React.createElement(Text, { style: [styles.tdText, styles.colDesc, { color: "#065f46" }] as any },
          `Discount${b.discountCode ? ` (${b.discountCode})` : ""}`),
        React.createElement(Text, { style: [styles.tdText, styles.colRight] as any }, ""),
        React.createElement(Text, { style: [styles.tdText, styles.colRight] as any }, ""),
        React.createElement(Text, { style: [styles.tdText, styles.colRight, { color: "#065f46" }] as any }, `-${fmt(discount)}`),
      ) : null,

      extras > 0 ? React.createElement(View, { style: styles.tableRow },
        React.createElement(Text, { style: [styles.tdText, styles.colDesc] as any }, "Additional Charges"),
        React.createElement(Text, { style: [styles.tdText, styles.colRight] as any }, ""),
        React.createElement(Text, { style: [styles.tdText, styles.colRight] as any }, ""),
        React.createElement(Text, { style: [styles.tdText, styles.colRight] as any }, fmt(extras)),
      ) : null,

      // ── Summary ──
      React.createElement(View, { style: { marginTop: 16 } },
        React.createElement(View, { style: styles.summaryRow },
          React.createElement(Text, { style: styles.summaryLabel }, "Subtotal (before GST)"),
          React.createElement(Text, { style: styles.summaryValue }, fmt(subtotal)),
        ),
        React.createElement(View, { style: styles.summaryRow },
          React.createElement(Text, { style: styles.summaryLabel }, "CGST (9%)"),
          React.createElement(Text, { style: styles.summaryValue }, fmt(cgst)),
        ),
        React.createElement(View, { style: styles.summaryRow },
          React.createElement(Text, { style: styles.summaryLabel }, "SGST (9%)"),
          React.createElement(Text, { style: styles.summaryValue }, fmt(sgst)),
        ),
        React.createElement(View, { style: styles.totalRow },
          React.createElement(Text, { style: styles.totalLabel }, "Total"),
          React.createElement(Text, { style: styles.totalValue }, fmt(b.totalAmount)),
        ),
        isPaid
          ? React.createElement(View, { style: styles.paidBadge },
              React.createElement(Text, { style: styles.paidText }, "✓ PAID"))
          : React.createElement(View, { style: styles.summaryRow },
              React.createElement(Text, { style: [styles.summaryLabel, { color: "#dc2626", fontFamily: "Helvetica-Bold" }] as any }, "Balance Due"),
              React.createElement(Text, { style: [styles.summaryValue, { color: "#dc2626", fontFamily: "Helvetica-Bold" }] as any },
                fmt(Number(b.totalAmount) - totalPaid)),
            ),
      ),

      // ── Footer ──
      React.createElement(View, { style: styles.footer },
        React.createElement(Text, { style: styles.footerText }, `${hotel?.hotelName || "The Rooms"}  ·  ${hotel?.address || ""}  ·  ${hotel?.gstNumber ? `GST ${hotel.gstNumber}` : ""}`),
        React.createElement(Text, { style: styles.footerText }, "Thank you for your stay!"),
      ),
    )
  );
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const invoice = await getInvoiceByBookingId(id);
    if (!invoice) {
      return new NextResponse("Invoice not found", { status: 404 });
    }

    const hotel = await prisma.hotelSettings.findUnique({ where: { id: "default" } });

    const element = React.createElement(InvoicePDF, { invoice, hotel });
    // @ts-expect-error react-pdf types diverge from React types
    const buffer = await renderToBuffer(element);

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    console.error("Error generating invoice PDF:", error);
    return new NextResponse("Failed to generate PDF", { status: 500 });
  }
}
