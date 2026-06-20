import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";

// ─── Tally export helpers (accounting package not yet available) ───────────────

function buildXmlRow(tx: Record<string, unknown>): string {
    return `  <transaction date="${tx.date}" amount="${tx.amount}" description="${tx.description}" />`;
}

function generateTallyXml(transactions: Record<string, unknown>[]): string {
    return `<?xml version="1.0" encoding="UTF-8"?>\n<ENVELOPE>\n${transactions.map(buildXmlRow).join("\n")}\n</ENVELOPE>`;
}

function generateCsv(transactions: Record<string, unknown>[]): string {
    const header = "Date,Amount,Description\n";
    const rows = transactions.map(t => `${t.date},${t.amount},"${t.description}"`).join("\n");
    return header + rows;
}

function consolidate(
    invoices: { issuedAt: Date; totalAmount: { toNumber: () => number }; invoiceNumber: string; bookingNumber: string; guestName: string }[],
    payments: { createdAt: Date; amount: { toNumber: () => number }; method: string; bookingNumber: string; guestName: string }[],
): { transactions: Record<string, unknown>[] } {
    const transactions: Record<string, unknown>[] = [
        ...invoices.map(inv => ({
            date: inv.issuedAt.toISOString().split("T")[0],
            amount: inv.totalAmount.toNumber(),
            description: `Invoice ${inv.invoiceNumber} – ${inv.guestName} (${inv.bookingNumber})`,
        })),
        ...payments.map(pay => ({
            date: pay.createdAt.toISOString().split("T")[0],
            amount: pay.amount.toNumber(),
            description: `Payment ${pay.method} – ${pay.guestName} (${pay.bookingNumber})`,
        })),
    ];
    return { transactions };
}

// ─── GET /api/tally-export ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

        const { searchParams } = new URL(request.url);
        const from = searchParams.get("from");
        const to = searchParams.get("to");
        const format = searchParams.get("format") || "xml";

        if (!from || !to) return new NextResponse("Missing date range", { status: 400 });

        const fromDate = new Date(from);
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);

        const [invoices, payments] = await Promise.all([
            prisma.invoice.findMany({
                where: { issuedAt: { gte: fromDate, lte: toDate } },
                include: { booking: { select: { bookingNumber: true, guest: { select: { name: true } } } } },
            }),
            prisma.payment.findMany({
                where: { createdAt: { gte: fromDate, lte: toDate } },
                include: { booking: { select: { bookingNumber: true, guest: { select: { name: true } } } } },
            }),
        ]);

        const { transactions } = consolidate(
            invoices.map(inv => ({ ...inv, guestName: inv.booking.guest.name, bookingNumber: inv.booking.bookingNumber })),
            payments.map(pay => ({ ...pay, guestName: pay.booking.guest.name, bookingNumber: pay.booking.bookingNumber })),
        );

        if (format === "excel" || format === "csv") {
            const csv = generateCsv(transactions);
            return new NextResponse(csv, {
                headers: {
                    "Content-Type": "text/csv",
                    "Content-Disposition": `attachment; filename="tally-export-${from}-to-${to}.csv"`,
                },
            });
        }

        const xml = generateTallyXml(transactions);
        return new NextResponse(xml, {
            headers: {
                "Content-Type": "application/xml",
                "Content-Disposition": `attachment; filename="tally-export-${from}-to-${to}.xml"`,
            },
        });
    } catch (error) {
        console.error("Error generating tally export:", error);
        return new NextResponse("Failed to generate export", { status: 500 });
    }
}
