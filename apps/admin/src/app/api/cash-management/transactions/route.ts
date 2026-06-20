import { NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { mockCashManagementData } from "../_data";

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { type, amount, description } = body;

        const newTx = {
            id: `tx-${Date.now()}`,
            type,
            amount: Number(amount),
            description,
            reference: null,
            createdBy: (session.user as { name?: string }).name || "Admin",
            createdAt: new Date().toISOString(),
            shiftId: "shift-1",
        };

        mockCashManagementData.todayTransactions.unshift(newTx);
        
        if (type === "CASH_IN") {
            mockCashManagementData.summary.totalCashIn += Number(amount);
            mockCashManagementData.summary.netBalance += Number(amount);
        } else if (type === "CASH_OUT") {
            mockCashManagementData.summary.totalCashOut += Number(amount);
            mockCashManagementData.summary.netBalance -= Number(amount);
        }

        return NextResponse.json({ success: true, transaction: newTx }, { status: 201 });
    } catch (error) {
        console.error("Error creating transaction:", error);
        return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
    }
}
