// apps/admin/src/app/api/settings/ledger/route.ts
// Ledger Mapping Settings API - Chart of accounts and Tally integration

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PaymentMethodMapping {
    method: string;
    ledgerName: string;
    ledgerCode: string;
    category: string;
}

interface RevenueCategoryMapping {
    category: string;
    ledgerName: string;
    ledgerCode: string;
    taxability: string;
}

interface ExpenseCategoryMapping {
    category: string;
    ledgerName: string;
    ledgerCode: string;
    payableAccount: string;
}

interface TallySettings {
    enabled: boolean;
    companyName: string;
    guid: string;
    exportUrl: string;
    autoExport: boolean;
    exportOnClose: boolean;
    lastExportDate: string | null;
}

// ─── GET /api/settings/ledger ─────────────────────────────────────────────────
// Get ledger mapping settings

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

        // Get or create settings
        let settings = await db.hotelSettings.findUnique({
            where: { id: "default" },
        });

        if (!settings) {
            settings = await db.hotelSettings.create({
                data: { id: "default" },
            });
        }

        // Default payment method mappings
        const defaultPaymentMethodMappings: PaymentMethodMapping[] = [
            { method: "CASH", ledgerName: "Cash Account", ledgerCode: "CASH-001", category: "Asset" },
            { method: "CARD", ledgerName: "Bank - Card Payments", ledgerCode: "BANK-CARD", category: "Asset" },
            { method: "UPI", ledgerName: "Bank - UPI", ledgerCode: "BANK-UPI", category: "Asset" },
            { method: "NETBANKING", ledgerName: "Bank - Net Banking", ledgerCode: "BANK-NET", category: "Asset" },
            { method: "WALLET", ledgerName: "E-Wallet Account", ledgerCode: "EWALLET", category: "Asset" },
            { method: "CHEQUE", ledgerName: "Cheques in Hand", ledgerCode: "CHEQUE", category: "Asset" },
            { method: "CORPORATE", ledgerName: "Corporate Receivables", ledgerCode: "CORP-REC", category: "Asset" },
        ];

        // Default revenue category mappings
        const defaultRevenueCategoryMappings: RevenueCategoryMapping[] = [
            { category: "ROOM_RENT", ledgerName: "Room Revenue", ledgerCode: "REV-ROOM", taxability: "Taxable" },
            { category: "FOOD_BEVERAGE", ledgerName: "Food & Beverage Revenue", ledgerCode: "REV-FB", taxability: "Taxable" },
            { category: "LAUNDRY", ledgerName: "Laundry Revenue", ledgerCode: "REV-LAUN", taxability: "Taxable" },
            { category: "SPA", ledgerName: "Spa Services Revenue", ledgerCode: "REV-SPA", taxability: "Taxable" },
            { category: "TRANSPORT", ledgerName: "Transport Revenue", ledgerCode: "REV-TRANS", taxability: "Taxable" },
            { category: "MINIBAR", ledgerName: "Minibar Revenue", ledgerCode: "REV-MINI", taxability: "Taxable" },
            { category: "OTHER", ledgerName: "Other Income", ledgerCode: "REV-OTHER", taxability: "Taxable" },
            { category: "DISCOUNT", ledgerName: "Discounts Allowed", ledgerCode: "EXP-DISC", taxability: "Exempt" },
        ];

        // Default expense category mappings
        const defaultExpenseCategoryMappings: ExpenseCategoryMapping[] = [
            { category: "SALARIES", ledgerName: "Salaries & Wages", ledgerCode: "EXP-SAL", payableAccount: "Salary Payable" },
            { category: "MAINTENANCE", ledgerName: "Repairs & Maintenance", ledgerCode: "EXP-MAINT", payableAccount: "Creditors" },
            { category: "UTILITIES", ledgerName: "Electricity & Water", ledgerCode: "EXP-UTIL", payableAccount: "Utilities Payable" },
            { category: "SUPPLIES", ledgerName: "Operating Supplies", ledgerCode: "EXP-SUP", payableAccount: "Creditors" },
            { category: "MARKETING", ledgerName: "Marketing & Advertising", ledgerCode: "EXP-MKT", payableAccount: "Creditors" },
            { category: "INSURANCE", ledgerName: "Insurance Premium", ledgerCode: "EXP-INS", payableAccount: "Prepaid Expenses" },
            { category: "RENT", ledgerName: "Rent Expense", ledgerCode: "EXP-RENT", payableAccount: "Rent Payable" },
            { category: "TAXES", ledgerName: "Taxes & Licenses", ledgerCode: "EXP-TAX", payableAccount: "Tax Payable" },
        ];

        // Default Tally settings
        const defaultTallySettings: TallySettings = {
            enabled: (settings as any).tallyEnabled ?? false,
            companyName: (settings as any).tallyCompanyName || "",
            guid: (settings as any).tallyGuid || "",
            exportUrl: (settings as any).tallyExportUrl || "http://localhost:9000",
            autoExport: (settings as any).tallyAutoExport ?? false,
            exportOnClose: (settings as any).tallyExportOnClose ?? false,
            lastExportDate: (settings as any).tallyLastExportDate || null,
        };

        // Parse stored mappings or use defaults
        let paymentMethodMappings = defaultPaymentMethodMappings;
        let revenueCategoryMappings = defaultRevenueCategoryMappings;
        let expenseCategoryMappings = defaultExpenseCategoryMappings;

        try {
            if ((settings as any).paymentMethodMappings) {
                paymentMethodMappings = JSON.parse((settings as any).paymentMethodMappings);
            }
            if ((settings as any).revenueCategoryMappings) {
                revenueCategoryMappings = JSON.parse((settings as any).revenueCategoryMappings);
            }
            if ((settings as any).expenseCategoryMappings) {
                expenseCategoryMappings = JSON.parse((settings as any).expenseCategoryMappings);
            }
        } catch (e) {
            console.error("Error parsing ledger mappings:", e);
        }

        const ledgerSettings = {
            chartOfAccounts: {
                baseCurrency: (settings as any).ledgerBaseCurrency || "INR",
                costCenterEnabled: (settings as any).ledgerCostCenterEnabled ?? true,
                taxHeavenEnabled: (settings as any).ledgerTaxHeavenEnabled ?? false,
            },
            paymentMethodMappings,
            revenueCategoryMappings,
            expenseCategoryMappings,
            tallySettings: defaultTallySettings,
        };

        return NextResponse.json({ settings: ledgerSettings });
    } catch (error) {
        console.error("Error fetching ledger settings:", error);
        return NextResponse.json({ error: "Failed to fetch ledger settings" }, { status: 500 });
    }
}

// ─── PATCH /api/settings/ledger ──────────────────────────────────────────────
// Update ledger mapping settings

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
        const updateData: any = {};

        // Chart of accounts
        if (body.chartOfAccounts) {
            if (body.chartOfAccounts.baseCurrency !== undefined) {
                updateData.ledgerBaseCurrency = body.chartOfAccounts.baseCurrency;
            }
            if (body.chartOfAccounts.costCenterEnabled !== undefined) {
                updateData.ledgerCostCenterEnabled = body.chartOfAccounts.costCenterEnabled;
            }
            if (body.chartOfAccounts.taxHeavenEnabled !== undefined) {
                updateData.ledgerTaxHeavenEnabled = body.chartOfAccounts.taxHeavenEnabled;
            }
        }

        // Payment method mappings
        if (body.paymentMethodMappings !== undefined) {
            updateData.paymentMethodMappings = JSON.stringify(body.paymentMethodMappings);
        }

        // Revenue category mappings
        if (body.revenueCategoryMappings !== undefined) {
            updateData.revenueCategoryMappings = JSON.stringify(body.revenueCategoryMappings);
        }

        // Expense category mappings
        if (body.expenseCategoryMappings !== undefined) {
            updateData.expenseCategoryMappings = JSON.stringify(body.expenseCategoryMappings);
        }

        // Tally settings
        if (body.tallySettings) {
            if (body.tallySettings.enabled !== undefined) updateData.tallyEnabled = body.tallySettings.enabled;
            if (body.tallySettings.companyName !== undefined) updateData.tallyCompanyName = body.tallySettings.companyName;
            if (body.tallySettings.guid !== undefined) updateData.tallyGuid = body.tallySettings.guid;
            if (body.tallySettings.exportUrl !== undefined) updateData.tallyExportUrl = body.tallySettings.exportUrl;
            if (body.tallySettings.autoExport !== undefined) updateData.tallyAutoExport = body.tallySettings.autoExport;
            if (body.tallySettings.exportOnClose !== undefined) updateData.tallyExportOnClose = body.tallySettings.exportOnClose;
            if (body.tallySettings.lastExportDate !== undefined) updateData.tallyLastExportDate = body.tallySettings.lastExportDate;
        }

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
        console.error("Error updating ledger settings:", error);
        return NextResponse.json({ error: "Failed to update ledger settings" }, { status: 500 });
    }
}
