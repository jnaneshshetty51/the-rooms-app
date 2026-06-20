// apps/admin/src/app/api/settings/ledger/route.ts
// Ledger Mapping Settings API - Chart of accounts and Tally integration

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";

const DEFAULT_LEDGER_SETTINGS = {
    chartOfAccounts: { baseCurrency: "INR", costCenterEnabled: true, taxHeavenEnabled: false },
    paymentMethodMappings: [
        { method: "CASH", ledgerName: "Cash Account", ledgerCode: "CASH-001", category: "Asset" },
        { method: "CARD", ledgerName: "Bank - Card Payments", ledgerCode: "BANK-CARD", category: "Asset" },
        { method: "UPI", ledgerName: "Bank - UPI", ledgerCode: "BANK-UPI", category: "Asset" },
        { method: "NETBANKING", ledgerName: "Bank - Net Banking", ledgerCode: "BANK-NET", category: "Asset" },
        { method: "WALLET", ledgerName: "E-Wallet Account", ledgerCode: "EWALLET", category: "Asset" },
        { method: "CHEQUE", ledgerName: "Cheques in Hand", ledgerCode: "CHEQUE", category: "Asset" },
        { method: "CORPORATE", ledgerName: "Corporate Receivables", ledgerCode: "CORP-REC", category: "Asset" },
    ],
    revenueCategoryMappings: [
        { category: "ROOM_RENT", ledgerName: "Room Revenue", ledgerCode: "REV-ROOM", taxability: "Taxable" },
        { category: "FOOD_BEVERAGE", ledgerName: "Food & Beverage Revenue", ledgerCode: "REV-FB", taxability: "Taxable" },
        { category: "LAUNDRY", ledgerName: "Laundry Revenue", ledgerCode: "REV-LAUN", taxability: "Taxable" },
        { category: "SPA", ledgerName: "Spa Services Revenue", ledgerCode: "REV-SPA", taxability: "Taxable" },
        { category: "TRANSPORT", ledgerName: "Transport Revenue", ledgerCode: "REV-TRANS", taxability: "Taxable" },
        { category: "DISCOUNT", ledgerName: "Discounts Allowed", ledgerCode: "EXP-DISC", taxability: "Exempt" },
    ],
    expenseCategoryMappings: [
        { category: "SALARIES", ledgerName: "Salaries & Wages", ledgerCode: "EXP-SAL", payableAccount: "Salary Payable" },
        { category: "MAINTENANCE", ledgerName: "Repairs & Maintenance", ledgerCode: "EXP-MAINT", payableAccount: "Creditors" },
        { category: "UTILITIES", ledgerName: "Electricity & Water", ledgerCode: "EXP-UTIL", payableAccount: "Utilities Payable" },
        { category: "SUPPLIES", ledgerName: "Operating Supplies", ledgerCode: "EXP-SUP", payableAccount: "Creditors" },
        { category: "TAXES", ledgerName: "Taxes & Licenses", ledgerCode: "EXP-TAX", payableAccount: "Tax Payable" },
    ],
    tallySettings: {
        enabled: false,
        companyName: "",
        guid: "",
        exportUrl: "http://localhost:9000",
        autoExport: false,
        exportOnClose: false,
        lastExportDate: null as string | null,
    },
};

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const role = (session.user as { role?: string }).role;
        if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "FRONT_OFFICE") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        return NextResponse.json({ settings: DEFAULT_LEDGER_SETTINGS });
    } catch (error) {
        console.error("Error fetching ledger settings:", error);
        return NextResponse.json({ error: "Failed to fetch ledger settings" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const role = (session.user as { role?: string }).role;
        if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const body = await request.json();
        const settings = { ...DEFAULT_LEDGER_SETTINGS, ...body };
        return NextResponse.json({ settings });
    } catch (error) {
        console.error("Error updating ledger settings:", error);
        return NextResponse.json({ error: "Failed to update ledger settings" }, { status: 500 });
    }
}
