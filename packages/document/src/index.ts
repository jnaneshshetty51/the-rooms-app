// packages/document/src/index.ts
// Document generation and storage service
// Handles PDF generation for invoices and receipts with MinIO storage

import PDFDocument from 'pdfkit';
import { Client } from 'minio';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface InvoiceData {
    invoiceNumber: string;
    invoiceDate: Date;
    placeOfSupply?: string;
    isInterstate: boolean;
    guestGstin?: string;

    // Hotel details
    hotelName: string;
    hotelAddress: string;
    hotelGstin: string;

    // Guest details
    guestName: string;
    guestPhone: string;
    guestEmail?: string;
    guestAddress?: string;

    // Booking details
    bookingNumber: string;
    roomNumber: string;
    roomType: string;
    checkIn: Date;
    checkOut: Date;

    // Line items
    items: {
        description: string;
        hsnCode?: string;
        quantity: number;
        rate: number;
        amount: number;
        taxRate: number;
        cgst: number;
        sgst: number;
        igst: number;
        taxAmount: number;
        totalAmount: number;
        serviceDate: Date;
    }[];

    // Totals
    subtotal: number;
    cgst: number;
    sgst: number;
    igst: number;
    taxAmount: number;
    roundOff: number;
    totalAmount: number;

    // Payment summary
    paidAmount?: number;
    pendingAmount?: number;
    paymentMethods?: string[];
}

export interface ReceiptData {
    receiptNumber: string;
    receiptDate: Date;

    // Hotel details
    hotelName: string;
    hotelAddress: string;
    hotelGstin: string;

    // Guest details
    guestName: string;
    guestPhone: string;

    // Booking details
    bookingNumber: string;
    roomNumber: string;

    // Payment details
    amount: number;
    amountInWords: string;
    paymentMethod: string;
    transactionId?: string;
    paymentType: 'ADVANCE' | 'PARTIAL' | 'FULL' | 'REFUND';
    remainingBalance: number;

    // Invoice reference
    invoiceNumber?: string;

    // Collected by
    collectedByName?: string;
}

// ─── MinIO Client ───────────────────────────────────────────────────────────

let minioClient: Client | null = null;

function getMinioClient(): Client {
    if (minioClient) return minioClient;

    const accessKey = process.env.MINIO_ACCESS_KEY;
    const secretKey = process.env.MINIO_SECRET_KEY;
    if (!accessKey || !secretKey) {
        throw new Error('MinIO credentials not configured');
    }

    minioClient = new Client({
        endPoint: process.env.MINIO_ENDPOINT || 'localhost',
        port: parseInt(process.env.MINIO_PORT || '9000', 10),
        accessKey,
        secretKey,
        useSSL: process.env.MINIO_USE_SSL === 'true',
    });
    return minioClient;
}

// ─── Storage Functions ────────────────────────────────────────────────────────

/**
 * Upload document to MinIO
 */
export async function uploadDocument(
    buffer: Buffer,
    fileName: string,
    contentType: string = 'application/pdf'
): Promise<string> {
    const client = getMinioClient();
    const bucket = process.env.MINIO_BUCKET || 'therooms-documents';

    const exists = await client.bucketExists(bucket);
    if (!exists) {
        await client.makeBucket(bucket, 'us-east-1');
    }

    await client.putObject(bucket, fileName, buffer, buffer.length, {
        'Content-Type': contentType,
    });

    const publicBase = (process.env.MINIO_PUBLIC_URL || '').replace(/\/$/, '');
    if (publicBase) {
        return `${publicBase}/${bucket}/${fileName}`;
    }

    // Fallback: presigned URL valid for 7 days
    return client.presignedGetObject(bucket, fileName, 7 * 24 * 60 * 60);
}

/**
 * Generate invoice storage path
 * Format: invoices/YYYY/MM/INV-XXXXXXXX.pdf
 */
export function getInvoiceStoragePath(invoiceNumber: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `invoices/${year}/${month}/${invoiceNumber}.pdf`;
}

/**
 * Generate receipt storage path
 * Format: receipts/YYYY/MM/RCPT-XXXXXXXX.pdf
 */
export function getReceiptStoragePath(receiptNumber: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `receipts/${year}/${month}/${receiptNumber}.pdf`;
}

// ─── PDF Generation ──────────────────────────────────────────────────────────

/**
 * Generate invoice PDF
 */
export function generateInvoicePdf(data: InvoiceData): Buffer {
    return new Promise<Buffer>((resolve, reject) => {
        try {
            const chunks: Buffer[] = [];
            const doc = new PDFDocument({ margin: 50 });

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Header
            doc.fontSize(18).font('Helvetica-Bold').text(data.hotelName, { align: 'center' });
            doc.fontSize(10).font('Helvetica').text(data.hotelAddress, { align: 'center' });
            doc.text(`GSTIN: ${data.hotelGstin}`, { align: 'center' });
            doc.moveDown();

            // Tax Invoice Title
            doc.fontSize(14).font('Helvetica-Bold').text('TAX INVOICE', { align: 'center' });
            doc.moveDown();

            // Invoice details table
            const leftCol = 50;
            const rightCol = 300;

            doc.fontSize(10).font('Helvetica');
            doc.text(`Invoice No: ${data.invoiceNumber}`, leftCol);
            doc.text(`Date: ${data.invoiceDate.toLocaleDateString('en-IN')}`, rightCol);
            doc.text(`Place of Supply: ${data.placeOfSupply || 'N/A'}`, leftCol);
            doc.text(`Booking No: ${data.bookingNumber}`, rightCol);

            if (data.isInterstate) {
                doc.text('Supply Type: Interstate (IGST Applicable)', leftCol);
            } else {
                doc.text('Supply Type: Intrastate (CGST+SGST Applicable)', leftCol);
            }

            doc.moveDown();

            // Guest details
            doc.font('Helvetica-Bold').text('Guest Details:');
            doc.font('Helvetica');
            doc.text(`Name: ${data.guestName}`);
            doc.text(`Phone: ${data.guestPhone}`);
            if (data.guestEmail) doc.text(`Email: ${data.guestEmail}`);
            if (data.guestAddress) doc.text(`Address: ${data.guestAddress}`);
            if (data.guestGstin) doc.text(`GSTIN: ${data.guestGstin}`);

            doc.moveDown();

            // Booking details
            doc.font('Helvetica-Bold').text('Stay Details:');
            doc.font('Helvetica');
            doc.text(`Room: ${data.roomNumber} (${data.roomType})`);
            doc.text(`Check-in: ${data.checkIn.toLocaleDateString('en-IN')}`);
            doc.text(`Check-out: ${data.checkOut.toLocaleDateString('en-IN')}`);

            doc.moveDown();

            // Line items table header
            const tableTop = doc.y;
            const colWidths = [180, 50, 70, 80, 80];
            const headers = ['Description', 'Qty', 'Rate', 'Amount', 'Total'];

            doc.font('Helvetica-Bold').fontSize(9);
            let xPos = leftCol;
            headers.forEach((header, i) => {
                doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'right' });
                xPos += colWidths[i];
            });

            doc.moveDown();
            doc.font('Helvetica').fontSize(9);

            // Line items
            data.items.forEach((item) => {
                const y = doc.y;
                xPos = leftCol;

                doc.text(item.description, xPos, y, { width: colWidths[0] });
                xPos += colWidths[0];
                doc.text(item.quantity.toString(), xPos, y, { width: colWidths[1], align: 'right' });
                xPos += colWidths[1];
                doc.text(`₹${item.rate.toFixed(2)}`, xPos, y, { width: colWidths[2], align: 'right' });
                xPos += colWidths[2];
                doc.text(`₹${item.amount.toFixed(2)}`, xPos, y, { width: colWidths[3], align: 'right' });
                xPos += colWidths[3];
                doc.text(`₹${item.totalAmount.toFixed(2)}`, xPos, y, { width: colWidths[4], align: 'right' });

                doc.moveDown();
            });

            doc.moveDown();

            // Tax breakdown
            doc.font('Helvetica-Bold').text('Tax Breakdown:');
            doc.font('Helvetica');

            if (data.isInterstate) {
                doc.text(`IGST (${((data.taxAmount / data.subtotal) * 100).toFixed(2)}%): ₹${data.igst.toFixed(2)}`);
            } else {
                doc.text(`CGST (${((data.cgst / data.subtotal) * 100).toFixed(2)}%): ₹${data.cgst.toFixed(2)}`);
                doc.text(`SGST (${((data.sgst / data.subtotal) * 100).toFixed(2)}%): ₹${data.sgst.toFixed(2)}`);
            }

            doc.moveDown();

            // Totals
            doc.font('Helvetica-Bold');
            doc.text(`Subtotal: ₹${data.subtotal.toFixed(2)}`, { align: 'right' });
            doc.text(`Tax Amount: ₹${data.taxAmount.toFixed(2)}`, { align: 'right' });
            if (data.roundOff !== 0) {
                doc.text(`Round Off: ₹${data.roundOff.toFixed(2)}`, { align: 'right' });
            }
            doc.fontSize(12).text(`Grand Total: ₹${data.totalAmount.toFixed(2)}`, { align: 'right' });
            doc.fontSize(10);

            // Amount in words
            doc.moveDown();
            doc.font('Helvetica').text(`Amount in Words: ${numberToWords(Math.round(data.totalAmount))}`);

            // Payment summary
            if (data.paidAmount !== undefined || data.pendingAmount !== undefined) {
                doc.moveDown();
                doc.font('Helvetica-Bold').text('Payment Summary:');
                doc.font('Helvetica');
                if (data.paidAmount !== undefined) {
                    doc.text(`Paid: ₹${data.paidAmount.toFixed(2)}`);
                }
                if (data.pendingAmount !== undefined) {
                    doc.text(`Pending: ₹${data.pendingAmount.toFixed(2)}`);
                }
                if (data.paymentMethods) {
                    doc.text(`Payment Methods: ${data.paymentMethods.join(', ')}`);
                }
            }

            // Footer
            doc.moveDown(2);
            doc.fontSize(8).font('Helvetica');
            doc.text('Terms & Conditions:', leftCol);
            doc.text('1. This is a computer-generated invoice.', leftCol);
            doc.text('2. No signature required.', leftCol);
            doc.text('3. Please retain for your records.', leftCol);

            doc.text('Authorized Signatory', 400, doc.y + 30, { align: 'right' });

            doc.end();
        } catch (error) {
            reject(error);
        }
    }) as unknown as Buffer;
}

/**
 * Generate receipt PDF
 */
export function generateReceiptPdf(data: ReceiptData): Buffer {
    return new Promise<Buffer>((resolve, reject) => {
        try {
            const chunks: Buffer[] = [];
            const doc = new PDFDocument({ margin: 50 });

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Header
            doc.fontSize(18).font('Helvetica-Bold').text(data.hotelName, { align: 'center' });
            doc.fontSize(10).font('Helvetica').text(data.hotelAddress, { align: 'center' });
            doc.text(`GSTIN: ${data.hotelGstin}`, { align: 'center' });
            doc.moveDown();

            // Receipt Title
            doc.fontSize(14).font('Helvetica-Bold').text('PAYMENT RECEIPT', { align: 'center' });
            doc.moveDown();

            // Receipt details
            doc.fontSize(10).font('Helvetica');
            doc.text(`Receipt No: ${data.receiptNumber}`);
            doc.text(`Date: ${data.receiptDate.toLocaleDateString('en-IN')}`);
            doc.moveDown();

            // Guest details
            doc.font('Helvetica-Bold').text('Guest Details:');
            doc.font('Helvetica');
            doc.text(`Name: ${data.guestName}`);
            doc.text(`Phone: ${data.guestPhone}`);
            doc.moveDown();

            // Booking details
            doc.font('Helvetica-Bold').text('Booking Details:');
            doc.font('Helvetica');
            doc.text(`Booking No: ${data.bookingNumber}`);
            doc.text(`Room: ${data.roomNumber}`);
            doc.moveDown();

            // Payment details
            doc.font('Helvetica-Bold').text('Payment Details:');
            doc.font('Helvetica');
            doc.text(`Amount Received: ₹${data.amount.toFixed(2)}`);
            doc.text(`Amount in Words: ${data.amountInWords}`);
            doc.text(`Payment Method: ${data.paymentMethod}`);
            if (data.transactionId) {
                doc.text(`Transaction ID: ${data.transactionId}`);
            }
            doc.text(`Payment Type: ${data.paymentType}`);
            if (data.remainingBalance > 0) {
                doc.text(`Remaining Balance: ₹${data.remainingBalance.toFixed(2)}`);
            }
            doc.moveDown();

            // Invoice reference
            if (data.invoiceNumber) {
                doc.font('Helvetica-Bold').text('Invoice Reference:');
                doc.font('Helvetica');
                doc.text(`Invoice No: ${data.invoiceNumber}`);
                doc.moveDown();
            }

            // Collected by
            if (data.collectedByName) {
                doc.text(`Collected By: ${data.collectedByName}`);
                doc.moveDown();
            }

            // Footer
            doc.moveDown(2);
            doc.fontSize(10).font('Helvetica').text('Received with thanks.', { align: 'center' });
            doc.moveDown();
            doc.text('Authorized Signatory', 400, doc.y + 30, { align: 'right' });

            doc.end();
        } catch (error) {
            reject(error);
        }
    }) as unknown as Buffer;
}

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Convert number to words (Indian format)
 */
function numberToWords(num: number): string {
    if (num === 0) return 'Zero';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
        'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function convertHundreds(n: number): string {
        if (n < 20) return ones[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
        return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertHundreds(n % 100) : '');
    }

    const lakhs = Math.floor(num / 100000);
    const thousands = Math.floor((num % 100000) / 1000);
    const rest = num % 1000;

    let result = '';
    if (lakhs > 0) result += convertHundreds(lakhs) + ' Lakh' + (thousands > 0 ? ' ' : '');
    if (thousands > 0) result += convertHundreds(thousands) + ' Thousand' + (rest > 0 ? ' ' : '');
    if (rest > 0) result += convertHundreds(rest);

    return 'Rupees ' + result.trim() + ' Only';
}

// ─── Generate and Store Functions ────────────────────────────────────────────

/**
 * Generate and store invoice PDF
 */
export async function generateAndStoreInvoicePdf(data: InvoiceData): Promise<string> {
    const pdfBuffer = generateInvoicePdf(data);
    const storagePath = getInvoiceStoragePath(data.invoiceNumber);
    return uploadDocument(pdfBuffer, storagePath, 'application/pdf');
}

/**
 * Generate and store receipt PDF
 */
export async function generateAndStoreReceiptPdf(data: ReceiptData): Promise<string> {
    const pdfBuffer = generateReceiptPdf(data);
    const storagePath = getReceiptStoragePath(data.receiptNumber);
    return uploadDocument(pdfBuffer, storagePath, 'application/pdf');
}
