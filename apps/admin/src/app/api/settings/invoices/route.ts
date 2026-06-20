// apps/admin/src/app/api/settings/invoices/route.ts
// Invoice Settings API - GST-compliant invoice configuration

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";

const DEFAULT_INVOICE_SETTINGS = {
    invoicePrefix: "INV",
    invoiceNumberingFormat: "INV-YYYYMMDD-XXXX",
    defaultDueDays: 7,
    taxSettings: {
        cgstRate: 9,
        sgstRate: 9,
        igstRate: 18,
        defaultTaxType: "GST",
        hsnCode: "9963",
    },
    paymentTerms: {
        defaultPaymentTerms: "NET_15",
        allowPartPayment: true,
        autoReminderDays: 3,
    },
    invoiceNotes: "",
    invoiceTerms:
        "1. Payment due within 15 days of issue date.\n2. Late payments attract 18% interest per annum.\n3. Goods once sold will not be taken back.",
    invoiceFooter: "Thank you for your business!",
    showHotelAddress: true,
    showGstNumber: true,
    showPanNumber: false,
    panNumber: "",
};

// ─── GET /api/settings/invoices ──────────────────────────────────────────────

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const role = (session.user as { role?: string }).role;
        if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "FRONT_OFFICE") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json({ settings: DEFAULT_INVOICE_SETTINGS });
    } catch (error) {
        console.error("Error fetching invoice settings:", error);
        return NextResponse.json({ error: "Failed to fetch invoice settings" }, { status: 500 });
    }
}

// ─── PATCH /api/settings/invoices ────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const role = (session.user as { role?: string }).role;
        if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Invoice config fields are not yet persisted in the DB schema;
        // accept the request and echo back defaults merged with the body.
        const body = await request.json();
        const settings = { ...DEFAULT_INVOICE_SETTINGS, ...body };

        return NextResponse.json({ settings });
    } catch (error) {
        console.error("Error updating invoice settings:", error);
        return NextResponse.json({ error: "Failed to update invoice settings" }, { status: 500 });
    }
}
