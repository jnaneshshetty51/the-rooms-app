import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { mockCashManagementData } from "../../../_data";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { countedAmount } = body;

        const drawerIndex = mockCashManagementData.drawers.findIndex(d => d.id === id);
        
        if (drawerIndex === -1) {
            return NextResponse.json({ error: "Drawer not found" }, { status: 404 });
        }

        const drawer = mockCashManagementData.drawers[drawerIndex];
        const variance = countedAmount - drawer.expectedBalance;
        
        drawer.balance = countedAmount;
        drawer.variance = variance;
        
        if (variance === 0) {
            drawer.status = "BALANCED";
        } else if (variance > 0) {
            drawer.status = "OVER";
        } else {
            drawer.status = "SHORT";
        }
        
        drawer.lastUpdated = new Date().toISOString();
        
        // Recalculate discrepancies
        mockCashManagementData.summary.discrepancies = mockCashManagementData.drawers.filter(d => d.status !== "BALANCED").length;
        mockCashManagementData.summary.balanced = mockCashManagementData.drawers.filter(d => d.status === "BALANCED").length;

        // Record a reconciliation transaction
        mockCashManagementData.todayTransactions.unshift({
            id: `tx-${Date.now()}`,
            type: "RECONCILIATION",
            amount: variance,
            description: `Reconciled ${drawer.name}`,
            reference: null,
            createdBy: (session.user as { name?: string }).name || "Admin",
            createdAt: new Date().toISOString(),
            shiftId: "shift-1",
        });

        return NextResponse.json({ success: true, drawer }, { status: 200 });
    } catch (error) {
        console.error("Error reconciling drawer:", error);
        return NextResponse.json({ error: "Failed to reconcile drawer" }, { status: 500 });
    }
}
