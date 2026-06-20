export const mockCashManagementData: {
    drawers: { id: string; name: string; balance: number; expectedBalance: number; variance: number; status: string; lastUpdated: string }[];
    todayTransactions: { id: string; type: string; amount: number; description: string; reference: null; createdBy: string; createdAt: string; shiftId: string }[];
    summary: { totalCashIn: number; totalCashOut: number; netBalance: number; shifts: number; balanced: number; discrepancies: number };
} = {
    drawers: [
        {
            id: "drawer-1",
            name: "Front Desk 1",
            balance: 5000,
            expectedBalance: 5000,
            variance: 0,
            status: "BALANCED",
            lastUpdated: new Date().toISOString(),
        },
        {
            id: "drawer-2",
            name: "Front Desk 2",
            balance: 2000,
            expectedBalance: 2100,
            variance: -100,
            status: "SHORT",
            lastUpdated: new Date().toISOString(),
        },
    ],
    todayTransactions: [
        {
            id: "tx-1",
            type: "CASH_IN",
            amount: 5000,
            description: "Opening float",
            reference: null,
            createdBy: "Admin",
            createdAt: new Date().toISOString(),
            shiftId: "shift-1",
        },
    ],
    summary: {
        totalCashIn: 5000,
        totalCashOut: 0,
        netBalance: 5000,
        shifts: 2,
        balanced: 1,
        discrepancies: 1,
    },
};
