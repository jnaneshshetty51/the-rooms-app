// apps/front-office/src/app/api/exports/tally/route.ts
// Tally-ready accounting export API
// Generates XML and Excel exports for Tally import

import { NextRequest } from 'next/server';
import { auth } from '@the-rooms/auth';
import { db, Prisma } from '@the-rooms/db';
import { ok, badRequest, serverError } from '@the-rooms/api';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
import {
    invoiceToVouchers,
    paymentToVouchers,
    refundToVouchers,
    creditNoteToVouchers,
    generateTallyXml,
    generateTallyExcel,
    consolidateDailyTransactions,
    LEDGER_MAPPING,
} from '@the-rooms/accounting';

// ─── Ledger Mapping Reference ───────────────────────────────────────────────
/**
 * GET /api/exports/tally/ledgers
 * Returns the ledger mapping configuration for Tally setup
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return badRequest('Unauthorized');
        }

        const { searchParams } = new URL(request.url);
        const format = searchParams.get('format') ?? 'json';
        const dateFrom = searchParams.get('from');
        const dateTo = searchParams.get('to');

        if (format === 'ledgers') {
            // Return ledger mapping for Tally setup reference
            return ok({
                ledgers: Object.entries(LEDGER_MAPPING).map(([key, value]) => ({
                    key,
                    ledgerName: value,
                })),
                instructions: [
                    '1. Create these ledgers in Tally before first export',
                    '2. Revenue ledgers should be under "Revenue" group',
                    '3. Tax ledgers should be under "Duties & Taxes" group',
                    '4. Payment ledgers should match your bank/cash accounts',
                    '5. Guest Receivable should be under "Sundry Debtors"',
                ],
            });
        }

        // Date range for export
        const startDate = dateFrom ? new Date(dateFrom) : new Date();
        startDate.setHours(0, 0, 0, 0);
        const endDate = dateTo ? new Date(dateTo) : new Date();
        endDate.setHours(23, 59, 59, 999);

        // Fetch invoices issued in date range
        const invoices: any[] = await db.invoice.findMany({
            where: {
                issuedAt: { gte: startDate, lte: endDate },
            },
            include: {
                items: true,
                booking: {
                    include: { guest: true },
                },
            },
        });

        // Fetch payments in date range
        const payments: any[] = await db.payment.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate },
                status: 'PAID',
            },
            include: {
                booking: {
                    include: { guest: true },
                },
            },
        });

        // Fetch refunds in date range
        const refunds: any[] = await db.payment.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate },
                status: 'REFUNDED',
            },
            include: {
                booking: {
                    include: { guest: true },
                },
            },
        });

        // Convert to accounting transactions
        const invoiceTransactions = invoices.map((inv: any) =>
            invoiceToVouchers({
                id: inv.id,
                invoiceNumber: inv.invoiceNumber,
                issuedAt: inv.issuedAt,
                subtotal: inv.subtotal?.toNumber() ?? 0,
                cgst: inv.cgst?.toNumber() ?? 0,
                sgst: inv.sgst?.toNumber() ?? 0,
                igst: inv.igst?.toNumber() ?? 0,
                taxAmount: inv.taxAmount?.toNumber() ?? 0,
                totalAmount: inv.totalAmount?.toNumber() ?? 0,
                isInterstate: inv.isInterstate ?? false,
                guestName: inv.booking?.guest?.name ?? 'Unknown',
                bookingNumber: inv.booking?.bookingNumber ?? '',
                items: (inv.items ?? []).map((item: any) => ({
                    description: item.description,
                    amount: item.amount?.toNumber() ?? 0,
                    cgst: item.cgst?.toNumber() ?? 0,
                    sgst: item.sgst?.toNumber() ?? 0,
                    igst: item.igst?.toNumber() ?? 0,
                    taxAmount: item.taxAmount?.toNumber() ?? 0,
                    sourceType: item.sourceType ?? undefined,
                })),
            })
        );

        const paymentTransactions = payments.map((pay: any) =>
            paymentToVouchers({
                id: pay.id,
                amount: pay.amount.toNumber(),
                method: pay.method,
                transactionId: pay.transactionId ?? undefined,
                createdAt: pay.createdAt,
                bookingId: pay.bookingId,
                bookingNumber: pay.booking?.bookingNumber ?? '',
                guestName: pay.booking?.guest?.name ?? 'Unknown',
            })
        );

        const refundTransactions = refunds.map((ref: any) =>
            refundToVouchers({
                id: ref.id,
                originalPaymentId: ref.id,
                refundAmount: ref.refundAmount?.toNumber() ?? 0,
                reason: ref.refundReason ?? 'Refund',
                processedAt: ref.createdAt,
                bookingNumber: ref.booking?.bookingNumber ?? '',
                guestName: ref.booking?.guest?.name ?? 'Unknown',
            })
        );

        // Consolidate
        const exportData = consolidateDailyTransactions(
            invoices.map((inv: any) => ({
                id: inv.id,
                invoiceNumber: inv.invoiceNumber,
                issuedAt: inv.issuedAt,
                subtotal: inv.subtotal?.toNumber() ?? 0,
                cgst: inv.cgst?.toNumber() ?? 0,
                sgst: inv.sgst?.toNumber() ?? 0,
                igst: inv.igst?.toNumber() ?? 0,
                taxAmount: inv.taxAmount?.toNumber() ?? 0,
                totalAmount: inv.totalAmount?.toNumber() ?? 0,
                isInterstate: inv.isInterstate ?? false,
                guestName: inv.booking?.guest?.name ?? 'Unknown',
                bookingNumber: inv.booking?.bookingNumber ?? '',
                items: (inv.items ?? []).map((item: any) => ({
                    description: item.description,
                    amount: item.amount?.toNumber() ?? 0,
                    cgst: item.cgst?.toNumber() ?? 0,
                    sgst: item.sgst?.toNumber() ?? 0,
                    igst: item.igst?.toNumber() ?? 0,
                    taxAmount: item.taxAmount?.toNumber() ?? 0,
                    sourceType: item.sourceType ?? undefined,
                })),
            })),
            payments.map((pay: any) => ({
                id: pay.id,
                amount: pay.amount.toNumber(),
                method: pay.method,
                transactionId: pay.transactionId ?? undefined,
                createdAt: pay.createdAt,
                bookingId: pay.bookingId,
                bookingNumber: pay.booking?.bookingNumber ?? '',
                guestName: pay.booking?.guest?.name ?? 'Unknown',
            })),
            refunds.map((ref: any) => ({
                id: ref.id,
                originalPaymentId: ref.id,
                refundAmount: ref.refundAmount?.toNumber() ?? 0,
                reason: ref.refundReason ?? 'Refund',
                processedAt: ref.createdAt,
                bookingNumber: ref.booking?.bookingNumber ?? '',
                guestName: ref.booking?.guest?.name ?? 'Unknown',
            }))
        );

        // Return summary if no format specified
        return ok({
            dateRange: {
                from: startDate.toISOString(),
                to: endDate.toISOString(),
            },
            summary: exportData.summary,
            transactionCount: {
                invoices: invoiceTransactions.length,
                payments: paymentTransactions.length,
                refunds: refundTransactions.length,
                total: exportData.transactions.length,
            },
            transactions: exportData.transactions.map((txn: any) => ({
                id: txn.id,
                type: txn.type,
                date: txn.date,
                referenceNumber: txn.referenceNumber,
                entryCount: txn.entries.length,
            })),
        });
    } catch (error) {
        console.error('Error generating Tally export:', error);
        return serverError('Failed to generate Tally export');
    }
}

// ─── XML Export ───────────────────────────────────────────────────────────────
/**
 * GET /api/exports/tally/xml
 * Generate Tally-compatible XML file
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return badRequest('Unauthorized');
        }

        const userRole = (session.user as { role?: string }).role;
        if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole ?? '')) {
            return badRequest('Insufficient permissions for export');
        }

        const body = await request.json();
        const { format = 'xml', dateFrom, dateTo } = body;

        const startDate = dateFrom ? new Date(dateFrom) : new Date();
        startDate.setHours(0, 0, 0, 0);
        const endDate = dateTo ? new Date(dateTo) : new Date();
        endDate.setHours(23, 59, 59, 999);

        // Fetch data
        const invoices: any[] = await db.invoice.findMany({
            where: {
                issuedAt: { gte: startDate, lte: endDate },
            },
            include: { items: true, booking: { include: { guest: true } } },
        });

        const payments: any[] = await db.payment.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate },
                status: 'PAID',
            },
            include: { booking: { include: { guest: true } } },
        });

        const refunds: any[] = await db.payment.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate },
                status: 'REFUNDED',
            },
            include: { booking: { include: { guest: true } } },
        });

        // Convert to transactions
        const transactions = [
            ...invoices.map((inv: any) =>
                invoiceToVouchers({
                    id: inv.id,
                    invoiceNumber: inv.invoiceNumber,
                    issuedAt: inv.issuedAt,
                    subtotal: inv.subtotal?.toNumber() ?? 0,
                    cgst: inv.cgst?.toNumber() ?? 0,
                    sgst: inv.sgst?.toNumber() ?? 0,
                    igst: inv.igst?.toNumber() ?? 0,
                    taxAmount: inv.taxAmount?.toNumber() ?? 0,
                    totalAmount: inv.totalAmount?.toNumber() ?? 0,
                    isInterstate: inv.isInterstate ?? false,
                    guestName: inv.booking?.guest?.name ?? 'Unknown',
                    bookingNumber: inv.booking?.bookingNumber ?? '',
                    items: (inv.items ?? []).map((item: any) => ({
                        description: item.description,
                        amount: item.amount?.toNumber() ?? 0,
                        cgst: item.cgst?.toNumber() ?? 0,
                        sgst: item.sgst?.toNumber() ?? 0,
                        igst: item.igst?.toNumber() ?? 0,
                        taxAmount: item.taxAmount?.toNumber() ?? 0,
                        sourceType: item.sourceType ?? undefined,
                    })),
                })
            ),
            ...payments.map((pay: any) =>
                paymentToVouchers({
                    id: pay.id,
                    amount: pay.amount.toNumber(),
                    method: pay.method,
                    transactionId: pay.transactionId ?? undefined,
                    createdAt: pay.createdAt,
                    bookingId: pay.bookingId,
                    bookingNumber: pay.booking?.bookingNumber ?? '',
                    guestName: pay.booking?.guest?.name ?? 'Unknown',
                })
            ),
            ...refunds.map((ref: any) =>
                refundToVouchers({
                    id: ref.id,
                    originalPaymentId: ref.id,
                    refundAmount: ref.refundAmount?.toNumber() ?? 0,
                    reason: ref.refundReason ?? 'Refund',
                    processedAt: ref.createdAt,
                    bookingNumber: ref.booking?.bookingNumber ?? '',
                    guestName: ref.booking?.guest?.name ?? 'Unknown',
                })
            ),
        ];

        if (format === 'xml') {
            const xml = generateTallyXml(transactions);

            // Create audit log
            await createAuditLog({
                userId: (session.user as { id?: string }).id,
                action: 'EXPORT',
                entity: 'accounting',
                entityId: 'tally-xml',
                metadata: {
                    format: 'xml',
                    dateRange: { from: startDate.toISOString(), to: endDate.toISOString() },
                    transactionCount: transactions.length,
                },
                ipAddress: getClientIp(request),
            });

            return new Response(xml, {
                headers: {
                    'Content-Type': 'application/xml',
                    'Content-Disposition': `attachment; filename="tally-export-${startDate.toISOString().slice(0, 10)}.xml"`,
                },
            });
        }

        if (format === 'excel') {
            const excel = generateTallyExcel(transactions);

            // Create audit log
            await createAuditLog({
                userId: (session.user as { id?: string }).id,
                action: 'EXPORT',
                entity: 'accounting',
                entityId: 'tally-excel',
                metadata: {
                    format: 'excel',
                    dateRange: { from: startDate.toISOString(), to: endDate.toISOString() },
                    transactionCount: transactions.length,
                },
                ipAddress: getClientIp(request),
            });

            return new Response(new Uint8Array(excel), {
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="tally-export-${startDate.toISOString().slice(0, 10)}.xlsx"`,
                },
            });
        }

        return badRequest('Invalid format. Use "xml" or "excel"');
    } catch (error) {
        console.error('Error generating Tally export:', error);
        return serverError('Failed to generate Tally export');
    }
}
