// packages/accounting/src/index.ts
// Tally-ready accounting export service
// Transforms HMS operational data → Tally ledger entries

import * as XLSX from 'xlsx';

// ─── Ledger Mapping Configuration ─────────────────────────────────────────────

/**
 * Service type to Tally ledger mapping
 * Hotels must pre-create these ledgers in Tally
 */
export const LEDGER_MAPPING = {
    // Revenue ledgers by service type
    ROOM: 'Room Revenue',
    FNB: 'Food & Beverage Revenue',
    LAUNDRY: 'Laundry Revenue',
    SPA: 'Spa Revenue',
    MINIBAR: 'Mini Bar Revenue',
    RESTAURANT: 'Restaurant Revenue',
    TRANSPORT: 'Transport Revenue',
    ROOM_SERVICE: 'Room Service Revenue',
    OTHER: 'Other Services Revenue',

    // Tax ledgers
    CGST: 'CGST Payable',
    SGST: 'SGST Payable',
    IGST: 'IGST Payable',

    // Payment ledgers
    CASH: 'Cash',
    BANK: 'Bank',
    UPI: 'UPI',
    CARD: 'Card',
    BANK_TRANSFER: 'Bank Transfer',
    CORPORATE_INVOICE: 'Corporate Receivable',

    // Receivables
    GUEST_RECEIVABLE: 'Guest Receivable',
    CORPORATE_RECEIVABLE: 'Corporate Receivable',

    // Advance tracking
    ADVANCE_FROM_CUSTOMER: 'Advance from Customer',

    // Refund ledger
    REFUND_PAYABLE: 'Refund Payable',
} as const;

export type LedgerType = keyof typeof LEDGER_MAPPING;

/**
 * Map addon type to revenue ledger
 */
export function getRevenueLedger(addonType: string): string {
    const mapping: Record<string, LedgerType> = {
        FB: 'FNB',
        LAUNDRY: 'LAUNDRY',
        SPA: 'SPA',
        MINIBAR: 'MINIBAR',
        RESTAURANT: 'RESTAURANT',
        TRANSPORT: 'TRANSPORT',
        ROOM_SERVICE: 'ROOM_SERVICE',
        OTHER: 'OTHER',
    };
    return LEDGER_MAPPING[mapping[addonType] ?? 'OTHER'];
}

/**
 * Map payment method to ledger
 */
export function getPaymentLedger(method: string): string {
    const mapping: Record<string, LedgerType> = {
        CASH: 'CASH',
        ONLINE: 'BANK',
        UPI: 'UPI',
        CARD: 'CARD',
        BANK_TRANSFER: 'BANK_TRANSFER',
        CORPORATE_INVOICE: 'CORPORATE_INVOICE',
    };
    return LEDGER_MAPPING[mapping[method] ?? 'BANK'];
}

// ─── Voucher Entry Types ──────────────────────────────────────────────────────

export interface VoucherEntry {
    date: string;           // YYYYMMDD format for Tally
    voucherType: string;    // Sales, Receipt, Payment, Credit Note
    voucherNumber: string; // Unique reference
    ledgerName: string;
    debit: number;
    credit: number;
    narration?: string;
}

export interface AccountingTransaction {
    id: string;
    type: 'INVOICE' | 'PAYMENT' | 'REFUND' | 'CREDIT_NOTE';
    date: Date;
    referenceNumber: string; // Invoice/Receipt number
    entries: VoucherEntry[];
    exportedToTally: boolean;
    exportedAt?: Date;
}

// ─── Invoice → Sales Voucher Conversion ─────────────────────────────────────

/**
 * Convert HMS Invoice to Tally Sales Voucher entries
 * 
 * Example:
 * Invoice: Room ₹3000 + GST ₹360
 * 
 * Dr: Guest Receivable     ₹3360
 *   Cr: Room Revenue       ₹3000
 *   Cr: CGST Payable        ₹180
 *   Cr: SGST Payable        ₹180
 */
export function invoiceToVouchers(invoice: {
    id: string;
    invoiceNumber: string;
    issuedAt: Date;
    subtotal: number;
    cgst: number;
    sgst: number;
    igst: number;
    taxAmount: number;
    totalAmount: number;
    isInterstate: boolean;
    guestName: string;
    bookingNumber: string;
    items: Array<{
        description: string;
        amount: number;
        cgst: number;
        sgst: number;
        igst: number;
        taxAmount: number;
        sourceType?: string;
    }>;
}): AccountingTransaction {
    const entries: VoucherEntry[] = [];
    const dateStr = formatDateForTally(invoice.issuedAt);
    const narration = `Invoice ${invoice.invoiceNumber} - ${invoice.guestName} (${invoice.bookingNumber})`;

    // Debit: Guest Receivable (total including tax)
    entries.push({
        date: dateStr,
        voucherType: 'Sales',
        voucherNumber: invoice.invoiceNumber,
        ledgerName: LEDGER_MAPPING.GUEST_RECEIVABLE,
        debit: invoice.totalAmount,
        credit: 0,
        narration,
    });

    // Credit: Revenue ledgers (per line item) + Tax ledgers
    for (const item of invoice.items) {
        // Revenue credit
        entries.push({
            date: dateStr,
            voucherType: 'Sales',
            voucherNumber: invoice.invoiceNumber,
            ledgerName: getItemRevenueLedger(item),
            debit: 0,
            credit: item.amount,
            narration,
        });

        // Tax credit
        if (invoice.isInterstate) {
            if (item.igst > 0) {
                entries.push({
                    date: dateStr,
                    voucherType: 'Sales',
                    voucherNumber: invoice.invoiceNumber,
                    ledgerName: LEDGER_MAPPING.IGST,
                    debit: 0,
                    credit: item.igst,
                    narration,
                });
            }
        } else {
            if (item.cgst > 0) {
                entries.push({
                    date: dateStr,
                    voucherType: 'Sales',
                    voucherNumber: invoice.invoiceNumber,
                    ledgerName: LEDGER_MAPPING.CGST,
                    debit: 0,
                    credit: item.cgst,
                    narration,
                });
            }
            if (item.sgst > 0) {
                entries.push({
                    date: dateStr,
                    voucherType: 'Sales',
                    voucherNumber: invoice.invoiceNumber,
                    ledgerName: LEDGER_MAPPING.SGST,
                    debit: 0,
                    credit: item.sgst,
                    narration,
                });
            }
        }
    }

    return {
        id: invoice.id,
        type: 'INVOICE',
        date: invoice.issuedAt,
        referenceNumber: invoice.invoiceNumber,
        entries,
        exportedToTally: false,
    };
}

/**
 * Get revenue ledger for an invoice line item
 */
function getItemRevenueLedger(item: { sourceType?: string; description: string }): string {
    if (item.sourceType === 'ROOM_CHARGE') {
        return LEDGER_MAPPING.ROOM;
    }
    // For addons, derive from description or default to OTHER
    return LEDGER_MAPPING.OTHER;
}

// ─── Payment → Receipt Voucher Conversion ───────────────────────────────────

/**
 * Convert HMS Payment to Tally Receipt Voucher entries
 * 
 * Example:
 * Payment: ₹3360 via UPI
 * 
 * Dr: UPI              ₹3360
 *   Cr: Guest Receivable ₹3360
 */
export function paymentToVouchers(payment: {
    id: string;
    amount: number;
    method: string;
    transactionId?: string;
    createdAt: Date;
    bookingId: string;
    bookingNumber: string;
    guestName: string;
}): AccountingTransaction {
    const entries: VoucherEntry[] = [];
    const dateStr = formatDateForTally(payment.createdAt);
    const narration = `Receipt for ${payment.bookingNumber} - ${payment.guestName}${payment.transactionId ? ` (Ref: ${payment.transactionId})` : ''}`;

    // Debit: Payment method ledger
    entries.push({
        date: dateStr,
        voucherType: 'Receipt',
        voucherNumber: `RCP-${payment.id.slice(0, 8)}`,
        ledgerName: getPaymentLedger(payment.method),
        debit: payment.amount,
        credit: 0,
        narration,
    });

    // Credit: Guest Receivable
    entries.push({
        date: dateStr,
        voucherType: 'Receipt',
        voucherNumber: `RCP-${payment.id.slice(0, 8)}`,
        ledgerName: LEDGER_MAPPING.GUEST_RECEIVABLE,
        debit: 0,
        credit: payment.amount,
        narration,
    });

    return {
        id: payment.id,
        type: 'PAYMENT',
        date: payment.createdAt,
        referenceNumber: `RCP-${payment.id.slice(0, 8)}`,
        entries,
        exportedToTally: false,
    };
}

// ─── Refund → Payment Voucher Conversion ──────────────────────────────────────

/**
 * Convert HMS Refund to Tally Payment Voucher entries
 * 
 * Example:
 * Refund: ₹1000 via Bank
 * 
 * Dr: Refund Payable    ₹1000
 *   Cr: Bank             ₹1000
 */
export function refundToVouchers(refund: {
    id: string;
    originalPaymentId: string;
    refundAmount: number;
    reason: string;
    processedAt: Date;
    bookingNumber: string;
    guestName: string;
}): AccountingTransaction {
    const entries: VoucherEntry[] = [];
    const dateStr = formatDateForTally(refund.processedAt);
    const narration = `Refund for ${refund.bookingNumber} - ${refund.guestName} (${refund.reason})`;

    // Debit: Refund Payable
    entries.push({
        date: dateStr,
        voucherType: 'Payment',
        voucherNumber: `REF-${refund.id.slice(0, 8)}`,
        ledgerName: LEDGER_MAPPING.REFUND_PAYABLE,
        debit: refund.refundAmount,
        credit: 0,
        narration,
    });

    // Credit: Bank (assuming bank refund)
    entries.push({
        date: dateStr,
        voucherType: 'Payment',
        voucherNumber: `REF-${refund.id.slice(0, 8)}`,
        ledgerName: LEDGER_MAPPING.BANK,
        debit: 0,
        credit: refund.refundAmount,
        narration,
    });

    return {
        id: refund.id,
        type: 'REFUND',
        date: refund.processedAt,
        referenceNumber: `REF-${refund.id.slice(0, 8)}`,
        entries,
        exportedToTally: false,
    };
}

// ─── Credit Note → Credit Note Voucher ──────────────────────────────────────

/**
 * Convert invoice cancellation to Credit Note
 * Per rules: NEVER edit invoices, always create credit note
 */
export function creditNoteToVouchers(creditNote: {
    id: string;
    originalInvoiceId: string;
    originalInvoiceNumber: string;
    reason: string;
    amount: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    issuedAt: Date;
    guestName: string;
    bookingNumber: string;
}): AccountingTransaction {
    const entries: VoucherEntry[] = [];
    const dateStr = formatDateForTally(creditNote.issuedAt);
    const narration = `Credit Note for ${creditNote.originalInvoiceNumber} - ${creditNote.reason}`;

    // Debit: Revenue (negative - reducing revenue)
    entries.push({
        date: dateStr,
        voucherType: 'Credit Note',
        voucherNumber: `CN-${creditNote.id.slice(0, 8)}`,
        ledgerName: LEDGER_MAPPING.ROOM, // Simplified - should map to original revenue ledger
        debit: creditNote.amount,
        credit: 0,
        narration,
    });

    // Credit: Guest Receivable (reducing receivable)
    entries.push({
        date: dateStr,
        voucherType: 'Credit Note',
        voucherNumber: `CN-${creditNote.id.slice(0, 8)}`,
        ledgerName: LEDGER_MAPPING.GUEST_RECEIVABLE,
        debit: 0,
        credit: creditNote.amount,
        narration,
    });

    // Tax reversal (if applicable)
    if (creditNote.cgst || creditNote.sgst || creditNote.igst) {
        const taxAmount = (creditNote.cgst ?? 0) + (creditNote.sgst ?? 0) + (creditNote.igst ?? 0);
        if (creditNote.igst && creditNote.igst > 0) {
            entries.push({
                date: dateStr,
                voucherType: 'Credit Note',
                voucherNumber: `CN-${creditNote.id.slice(0, 8)}`,
                ledgerName: LEDGER_MAPPING.IGST,
                debit: 0,
                credit: creditNote.igst,
                narration,
            });
        } else {
            if (creditNote.cgst && creditNote.cgst > 0) {
                entries.push({
                    date: dateStr,
                    voucherType: 'Credit Note',
                    voucherNumber: `CN-${creditNote.id.slice(0, 8)}`,
                    ledgerName: LEDGER_MAPPING.CGST,
                    debit: 0,
                    credit: creditNote.cgst,
                    narration,
                });
            }
            if (creditNote.sgst && creditNote.sgst > 0) {
                entries.push({
                    date: dateStr,
                    voucherType: 'Credit Note',
                    voucherNumber: `CN-${creditNote.id.slice(0, 8)}`,
                    ledgerName: LEDGER_MAPPING.SGST,
                    debit: 0,
                    credit: creditNote.sgst,
                    narration,
                });
            }
        }
    }

    return {
        id: creditNote.id,
        type: 'CREDIT_NOTE',
        date: creditNote.issuedAt,
        referenceNumber: `CN-${creditNote.id.slice(0, 8)}`,
        entries,
        exportedToTally: false,
    };
}

// ─── Date Formatting ──────────────────────────────────────────────────────────

/**
 * Format date for Tally (YYYYMMDD)
 */
export function formatDateForTally(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

// ─── XML Export ──────────────────────────────────────────────────────────────

/**
 * Generate Tally-compatible XML for vouchers
 */
export function generateTallyXml(transactions: AccountingTransaction[]): string {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<IMPORTDATA>
  <REQUESTDESC>
    <REPORTNAME>Vouchers</REPORTNAME>
  </REQUESTDESC>
  <REQUESTDATA>
`;

    for (const txn of transactions) {
        for (const entry of txn.entries) {
            xml += `    <TALLYMESSAGE>
      <VOUCHER>
        <VOUCHERTYPENAME>${entry.voucherType}</VOUCHERTYPENAME>
        <DATE>${entry.date}</DATE>
        <VOUCHERNUMBER>${entry.voucherNumber}</VOUCHERNUMBER>
        <NARRATION>${entry.narration || ''}</NARRATION>
        <LEDGERENTRIES>
          <LEDGERNAME>${entry.ledgerName}</LEDGERNAME>
          <AMOUNT>${entry.debit > 0 ? entry.debit : -entry.credit}</AMOUNT>
        </LEDGERENTRIES>
      </VOUCHER>
    </TALLYMESSAGE>
`;
        }
    }

    xml += `  </REQUESTDATA>
</IMPORTDATA>`;

    return xml;
}

// ─── Excel Export ─────────────────────────────────────────────────────────────

/**
 * Generate Excel export for manual Tally import
 * 
 * Columns: Date | Voucher Type | Voucher Number | Ledger Name | Debit | Credit | Narration
 */
export function generateTallyExcel(transactions: AccountingTransaction[]): Buffer {
    const data: any[] = [];

    for (const txn of transactions) {
        for (const entry of txn.entries) {
            data.push({
                'Date': formatDateForDisplay(entry.date),
                'Voucher Type': entry.voucherType,
                'Voucher Number': entry.voucherNumber,
                'Ledger Name': entry.ledgerName,
                'Debit': entry.debit > 0 ? entry.debit : '',
                'Credit': entry.credit > 0 ? entry.credit : '',
                'Narration': entry.narration || '',
            });
        }
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Accounting Entries');

    return XLSX.writeBuffer(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Format date for Excel display
 */
function formatDateForDisplay(dateStr: string): string {
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const day = dateStr.slice(6, 8);
    return `${day}/${month}/${year}`;
}

// ─── Daily Close Export ───────────────────────────────────────────────────────

/**
 * Generate daily accounting export
 * Called after night audit daily close
 */
export interface DailyAccountingExport {
    date: Date;
    transactions: AccountingTransaction[];
    summary: {
        totalSales: number;
        totalReceipts: number;
        totalRefunds: number;
        netCollection: number;
    };
}

/**
 * Consolidate transactions into daily export
 */
export function consolidateDailyTransactions(
    invoices: any[],
    payments: any[],
    refunds: any[]
): DailyAccountingExport {
    const transactions: AccountingTransaction[] = [];

    // Convert invoices to sales vouchers
    for (const invoice of invoices) {
        transactions.push(invoiceToVouchers(invoice));
    }

    // Convert payments to receipt vouchers
    for (const payment of payments) {
        transactions.push(paymentToVouchers(payment));
    }

    // Convert refunds to payment vouchers
    for (const refund of refunds) {
        transactions.push(refundToVouchers(refund));
    }

    // Calculate summary
    const totalSales = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalReceipts = payments.reduce((sum, pay) => sum + pay.amount, 0);
    const totalRefunds = refunds.reduce((sum, ref) => sum + ref.refundAmount, 0);

    return {
        date: new Date(),
        transactions,
        summary: {
            totalSales,
            totalReceipts,
            totalRefunds,
            netCollection: totalReceipts - totalRefunds,
        },
    };
}

// ─── Export Status Tracking ───────────────────────────────────────────────────

/**
 * Mark transactions as exported to Tally
 */
export function markAsExported(transactions: AccountingTransaction[]): void {
    // In production, this would update the database
    // For now, we just mark the in-memory objects
    for (const txn of transactions) {
        txn.exportedToTally = true;
        txn.exportedAt = new Date();
    }
}

/**
 * Get unexported transactions
 */
export function getUnexportedTransactions(
    allTransactions: AccountingTransaction[]
): AccountingTransaction[] {
    return allTransactions.filter((txn) => !txn.exportedToTally);
}
