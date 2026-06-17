import { NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";

// Mock data store for cash management since models are not in Prisma yet
export const mockCashManagementData = {
    drawers: [
        {
            id: "drawer-1",
            name: "Front Desk 1",
            balance: 5000,
            expectedBalance: 5000,
            variance: 0,
            status: "BALANCED" as const,
            lastUpdated: new Date().toISOString(),
        },
        {
            id: "drawer-2",
            name: "Front Desk 2",
            balance: 2000,
            expectedBalance: 2100,
            variance: -100,
            status: "SHORT" as const,
            lastUpdated: new Date().toISOString(),
        }
    ],
    todayTransactions: [
        {
            id: "tx-1",
            type: "CASH_IN" as const,
            amount: 5000,
            description: "Opening float",
            reference: null,
            createdBy: "Admin",
            createdAt: new Date().toISOString(),
            shiftId: "shift-1",
        }
    ],
    summary: {
        totalCashIn: 5000,
        totalCashOut: 0,
        netBalance: 5000,
        shifts: 2,
        balanced: 1,
        discrepancies: 1,
    }
};

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        
        return NextResponse.json(mockCashManagementData);
    } catch (error) {
        console.error("Error fetching cash management data:", error);
        return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }
}
