// apps/admin/src/app/api/settings/invoices/route.ts
// Invoice Settings API - GST-compliant invoice configuration

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";

// ─── GET /api/settings/invoices ─────────────────────────────────────────────
// Get invoice settings

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

        // Get or create invoice settings
        let settings = await db.hotelSettings.findUnique({
            where: { id: "default" },
        });

        if (!settings) {
            settings = await db.hotelSettings.create({
                data: { id: "default" },
            });
        }

        // Extract invoice-specific settings
        const invoiceSettings = {
            invoicePrefix: (settings as any).invoicePrefix || "INV",
            invoiceNumberingFormat: (settings as any).invoiceNumberingFormat || "BKN-YYYYMMDD-XXXX",
            defaultDueDays: (settings as any).defaultDueDays || 7,
            taxSettings: {
                cgstRate: (settings as any).cgstRate || 9,
                sgstRate: (settings as any).sgstRate || 9,
                igstRate: (settings as any).igstRate || 18,
                defaultTaxType: (settings as any).defaultTaxType || "GST",
                hsnCode: (settings as any).hsnCode || "9963",
            },
            paymentTerms: {
                defaultPaymentTerms: (settings as any).defaultPaymentTerms || "NET_15",
                allowPartPayment: (settings as any).allowPartPayment ?? true,
                autoReminderDays: (settings as any).autoReminderDays || 3,
            },
            invoiceNotes: (settings as any).invoiceNotes || "",
            invoiceTerms: (settings as any).invoiceTerms || "1. Payment due within 15 days of issue date.\n2. Late payments attract 18% interest per annum.\n3. Goods once sold will not be taken back.",
            invoiceFooter: (settings as any).invoiceFooter || "Thank you for your business!",
            showHotelAddress: (settings as any).showHotelAddress ?? true,
            showGstNumber: (settings as any).showGstNumber ?? true,
            showPanNumber: (settings as any).showPanNumber ?? false,
            panNumber: (settings as any).panNumber || "",
        };

        return NextResponse.json({ settings: invoiceSettings });
    } catch (error) {
        console.error("Error fetching invoice settings:", error);
        return NextResponse.json({ error: "Failed to fetch invoice settings" }, { status: 500 });
    }
}

// ─── PATCH /api/settings/invoices ─────────────────────────────────────────────
// Update invoice settings

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

        const body = await request.json();

        // Build update data with flat structure
        const updateData: any = {};

        // Invoice formatting
        if (body.invoicePrefix !== undefined) updateData.invoicePrefix = body.invoicePrefix;
        if (body.invoiceNumberingFormat !== undefined) updateData.invoiceNumberingFormat = body.invoiceNumberingFormat;
        if (body.defaultDueDays !== undefined) updateData.defaultDueDays = parseInt(body.defaultDueDays) || 7;

        // Tax settings
        if (body.taxSettings) {
            if (body.taxSettings.cgstRate !== undefined) updateData.cgstRate = parseFloat(body.taxSettings.cgstRate) || 9;
            if (body.taxSettings.sgstRate !== undefined) updateData.sgstRate = parseFloat(body.taxSettings.sgstRate) || 9;
            if (body.taxSettings.igstRate !== undefined) updateData.igstRate = parseFloat(body.taxSettings.igstRate) || 18;
            if (body.taxSettings.defaultTaxType !== undefined) updateData.defaultTaxType = body.taxSettings.defaultTaxType;
            if (body.taxSettings.hsnCode !== undefined) updateData.hsnCode = body.taxSettings.hsnCode;
        }

        // Payment terms
        if (body.paymentTerms) {
            if (body.paymentTerms.defaultPaymentTerms !== undefined) updateData.defaultPaymentTerms = body.paymentTerms.defaultPaymentTerms;
            if (body.paymentTerms.allowPartPayment !== undefined) updateData.allowPartPayment = body.paymentTerms.allowPartPayment;
            if (body.paymentTerms.autoReminderDays !== undefined) updateData.autoReminderDays = parseInt(body.paymentTerms.autoReminderDays) || 3;
        }

        // Display settings
        if (body.invoiceNotes !== undefined) updateData.invoiceNotes = body.invoiceNotes;
        if (body.invoiceTerms !== undefined) updateData.invoiceTerms = body.invoiceTerms;
        if (body.invoiceFooter !== undefined) updateData.invoiceFooter = body.invoiceFooter;
        if (body.showHotelAddress !== undefined) updateData.showHotelAddress = body.showHotelAddress;
        if (body.showGstNumber !== undefined) updateData.showGstNumber = body.showGstNumber;
        if (body.showPanNumber !== undefined) updateData.showPanNumber = body.showPanNumber;
        if (body.panNumber !== undefined) updateData.panNumber = body.panNumber;

        // Upsert settings
        const settings = await db.hotelSettings.upsert({
            where: { id: "default" },
            update: updateData,
            create: {
                id: "default",
                ...updateData,
            },
        });

        return NextResponse.json({ settings });
    } catch (error) {
        console.error("Error updating invoice settings:", error);
        return NextResponse.json({ error: "Failed to update invoice settings" }, { status: 500 });
    }
}
