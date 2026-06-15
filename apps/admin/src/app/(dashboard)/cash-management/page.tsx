"use client";

// apps/admin/src/app/(dashboard)/cash-management/page.tsx
// Finance - Cash Management - Cash drawer tracking, shift-wise reconciliation

import { useEffect, useState, useCallback } from "react";
import {
    RefreshCw,
    Wallet,
    Plus,
    Minus,
    ArrowRightLeft,
    CheckCircle,
    AlertTriangle,
} from "lucide-react";
import {
    PageHeader,
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Badge,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Input,
} from "@the-rooms/ui";
import { formatCurrency, formatDate } from "@the-rooms/ui";
import { cn } from "@the-rooms/ui";

interface CashTransaction {
    id: string;
    type: "CASH_IN" | "CASH_OUT" | "RECONCILIATION";
    amount: number;
    description: string;
    reference: string | null;
    createdBy: string;
    createdAt: string;
    shiftId: string | null;
}

interface CashDrawer {
    id: string;
    name: string;
    balance: number;
    expectedBalance: number;
    variance: number;
    status: "BALANCED" | "OVER" | "SHORT";
    lastUpdated: string;
}

interface CashManagementData {
    drawers: CashDrawer[];
    todayTransactions: CashTransaction[];
    summary: {
        totalCashIn: number;
        totalCashOut: number;
        netBalance: number;
        shifts: number;
        balanced: number;
        discrepancies: number;
    };
}

export default function CashManagementPage() {
    const [data, setData] = useState<CashManagementData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [transactionType, setTransactionType] = useState<"CASH_IN" | "CASH_OUT">("CASH_IN");
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");

    const fetchCashManagement = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/cash-management");
            if (res.ok) {
                setData(await res.json());
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCashManagement(); }, [fetchCashManagement]);

    const addTransaction = async () => {
        if (!amount || !description) return;
        await fetch("/api/cash-management/transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: transactionType,
                amount: parseFloat(amount),
                description,
            }),
        });
        setShowAddDialog(false);
        setAmount("");
        setDescription("");
        fetchCashManagement();
    };

    const reconcileDrawer = async (drawerId: string, countedAmount: number) => {
        await fetch(`/api/cash-management/drawers/${drawerId}/reconcile`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ countedAmount }),
        });
        fetchCashManagement();
    };

    if (loading && !data) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-[#E17055]" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Cash Management"
                description="Cash drawer tracking and shift-wise reconciliation"
                actions={
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={fetchCashManagement} disabled={loading}>
                            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                            Refresh
                        </Button>
                        <Button size="sm" onClick={() => setShowAddDialog(true)}>
                            <Plus className="h-4 w-4 mr-2" /> Add Transaction
                        </Button>
                    </div>
                }
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-green-200">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-green-600">{formatCurrency(data?.summary.totalCashIn ?? 0)}</p>
                            <p className="text-xs text-muted-foreground">Cash In Today</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-red-200">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-red-600">{formatCurrency(data?.summary.totalCashOut ?? 0)}</p>
                            <p className="text-xs text-muted-foreground">Cash Out Today</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-blue-200">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-blue-600">{formatCurrency(data?.summary.netBalance ?? 0)}</p>
                            <p className="text-xs text-muted-foreground">Net Balance</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className={cn((data?.summary.discrepancies ?? 0) > 0 ? "border-red-300" : "border-green-200")}>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-red-600">{data?.summary.discrepancies ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Discrepancies</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Cash Drawers */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Wallet className="h-5 w-5" />
                        Cash Drawers
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {data?.drawers.map((drawer) => (
                            <div
                                key={drawer.id}
                                className={cn(
                                    "rounded-lg border p-4",
                                    drawer.status === "BALANCED" && "border-green-200 bg-green-50",
                                    drawer.status === "OVER" && "border-blue-200 bg-blue-50",
                                    drawer.status === "SHORT" && "border-red-200 bg-red-50"
                                )}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="font-semibold">{drawer.name}</span>
                                    <Badge variant={
                                        drawer.status === "BALANCED" ? "default" :
                                            drawer.status === "OVER" ? "secondary" : "destructive"
                                    }>
                                        {drawer.status === "BALANCED" && "Balanced"}
                                        {drawer.status === "OVER" && "Over"}
                                        {drawer.status === "SHORT" && "Short"}
                                    </Badge>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">System Balance</span>
                                        <span className="font-medium">{formatCurrency(drawer.balance)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Expected Balance</span>
                                        <span className="font-medium">{formatCurrency(drawer.expectedBalance)}</span>
                                    </div>
                                    {drawer.variance !== 0 && (
                                        <div className="flex justify-between text-red-600">
                                            <span className="font-medium">Variance</span>
                                            <span className="font-bold">{formatCurrency(drawer.variance)}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => {
                                            const counted = prompt("Enter counted amount:");
                                            if (counted) reconcileDrawer(drawer.id, parseFloat(counted));
                                        }}
                                    >
                                        <CheckCircle className="h-4 w-4 mr-2" /> Reconcile
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Today's Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    {data?.todayTransactions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No transactions today
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {data?.todayTransactions.map((tx) => (
                                <div key={tx.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "h-10 w-10 rounded-full flex items-center justify-center",
                                            tx.type === "CASH_IN" && "bg-green-100",
                                            tx.type === "CASH_OUT" && "bg-red-100",
                                            tx.type === "RECONCILIATION" && "bg-blue-100"
                                        )}>
                                            {tx.type === "CASH_IN" && <Plus className="h-5 w-5 text-green-600" />}
                                            {tx.type === "CASH_OUT" && <Minus className="h-5 w-5 text-red-600" />}
                                            {tx.type === "RECONCILIATION" && <ArrowRightLeft className="h-5 w-5 text-blue-600" />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{tx.description}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {tx.createdBy} · {formatDate(tx.createdAt, "short")}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "font-semibold",
                                        tx.type === "CASH_IN" && "text-green-600",
                                        tx.type === "CASH_OUT" && "text-red-600",
                                        tx.type === "RECONCILIATION" && "text-blue-600"
                                    )}>
                                        {tx.type === "CASH_IN" && "+"}
                                        {tx.type === "CASH_OUT" && "-"}
                                        {formatCurrency(tx.amount)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add Transaction Dialog */}
            {showAddDialog && (
                <Dialog open onOpenChange={setShowAddDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Cash Transaction</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="flex gap-2">
                                <Button
                                    variant={transactionType === "CASH_IN" ? "default" : "outline"}
                                    onClick={() => setTransactionType("CASH_IN")}
                                    className="flex-1"
                                >
                                    <Plus className="h-4 w-4 mr-2" /> Cash In
                                </Button>
                                <Button
                                    variant={transactionType === "CASH_OUT" ? "destructive" : "outline"}
                                    onClick={() => setTransactionType("CASH_OUT")}
                                    className="flex-1"
                                >
                                    <Minus className="h-4 w-4 mr-2" /> Cash Out
                                </Button>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Amount</label>
                                <Input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="Enter amount"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Description</label>
                                <Input
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="e.g., Petty cash, Change float, etc."
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                            <Button onClick={addTransaction} disabled={!amount || !description}>
                                Add Transaction
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
