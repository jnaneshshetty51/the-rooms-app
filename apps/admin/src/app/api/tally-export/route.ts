import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";
import { 
    consolidateDailyTransactions, 
    generateTallyXml, 
    generateTallyExcel 
} from "@the-rooms/accounting";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const from = searchParams.get("from");
        const to = searchParams.get("to");
        const format = searchParams.get("format") || "xml";

        if (!from || !to) {
            return new NextResponse("Missing date range", { status: 400 });
        }

        const fromDate = new Date(from);
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);

        // Fetch data for the accounting module
        const invoices = await prisma.invoice.findMany({
            where: {
                issuedAt: {
                    gte: fromDate,
                    lte: toDate,
                },
            },
            include: {
                items: true,
                booking: {
                    select: {
                        bookingNumber: true,
                        guest: {
                            select: { name: true }
                        }
                    }
                }
            }
        });

        const payments = await prisma.payment.findMany({
            where: {
                createdAt: {
                    gte: fromDate,
                    lte: toDate,
                },
            },
            include: {
                booking: {
                    select: {
                        bookingNumber: true,
                        guest: {
                            select: { name: true }
                        }
                    }
                }
            }
        });

        // Format data to match accounting module expectations
        const formattedInvoices = invoices.map(inv => ({
            ...inv,
            guestName: inv.booking.guest.name,
            bookingNumber: inv.booking.bookingNumber,
        }));

        const formattedPayments = payments.map(pay => ({
            ...pay,
            guestName: pay.booking.guest.name,
            bookingNumber: pay.booking.bookingNumber,
        }));

        const dailyExport = consolidateDailyTransactions(
            formattedInvoices,
            formattedPayments,
            [] // Refunds not implemented as a separate model
        );

        if (format === "excel") {
            const excelBuffer = generateTallyExcel(dailyExport.transactions);
            return new NextResponse(excelBuffer, {
                headers: {
                    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "Content-Disposition": `attachment; filename="tally-export-${from}-to-${to}.xlsx"`,
                },
            });
        }

        const xmlString = generateTallyXml(dailyExport.transactions);
        return new NextResponse(xmlString, {
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
