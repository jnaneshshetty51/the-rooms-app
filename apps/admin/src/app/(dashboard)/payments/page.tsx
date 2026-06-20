"use client";

// apps/admin/src/app/(dashboard)/payments/page.tsx
// Finance - Payments - Payment logs, refund control, manual adjustments

import { useEffect, useState, useCallback } from "react";
import {
    Search,
    Filter,
    CreditCard,
    RefreshCw,
    Download,
    RotateCcw,
    CheckCircle,
    XCircle,
    AlertCircle,
} from "lucide-react";
import {
    PageHeader,
    Button,
    Select,
    SelectTrigger,
    SelectContent,
    SelectValue,
    Input,
    DataTable,
    type ColumnDef,
    Badge,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Breadcrumbs,
    BreadcrumbItem,
} from "@the-rooms/ui";
import { formatCurrency, formatDate } from "@the-rooms/ui";

interface Payment {
    id: string;
    paymentNumber: string;
    bookingNumber: string | null;
    invoiceNumber: string | null;
    guestName: string;
    amount: number;
    method: "CASH" | "CARD" | "UPI" | "BANK_TRANSFER" | "WALLET" | "OTHER";
    status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED" | "PARTIAL_REFUND";
    transactionId: string | null;
    gateway: string | null;
    collectedBy: string | null;
    createdAt: string;
    refundedAt: string | null;
    refundedAmount: number | null;
    refundReason: string | null;
}

interface PaymentsResponse {
    payments: Payment[];
    total: number;
    pages: number;
    page: number;
    summary: {
        totalCollected: number;
        totalRefunded: number;
        totalPending: number;
        cashCollected: number;
        cardCollected: number;
        upiCollected: number;
    };
}

const STATUS_CONFIG = {
    PENDING: { label: "Pending", bg: "bg-yellow-100", text: "text-yellow-700", icon: AlertCircle },
    COMPLETED: { label: "Completed", bg: "bg-green-100", text: "text-green-700", icon: CheckCircle },
    FAILED: { label: "Failed", bg: "bg-red-100", text: "text-red-700", icon: XCircle },
    REFUNDED: { label: "Refunded", bg: "bg-gray-100", text: "text-gray-700", icon: RotateCcw },
    PARTIAL_REFUND: { label: "Partial Refund", bg: "bg-orange-100", text: "text-orange-700", icon: RotateCcw },
};

const METHOD_CONFIG = {
    CASH: { label: "Cash", icon: "💵" },
    CARD: { label: "Card", icon: "💳" },
    UPI: { label: "UPI", icon: "📱" },
    BANK_TRANSFER: { label: "Bank Transfer", icon: "🏦" },
    WALLET: { label: "Wallet", icon: "👛" },
    OTHER: { label: "Other", icon: "📋" },
};

export default function PaymentsPage() {
    const [data, setData] = useState<PaymentsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [refundAmount, setRefundAmount] = useState("");
    const [refundReason, setRefundReason] = useState("");
    const [filters, setFilters] = useState({
        search: "",
        status: "ALL",
        method: "ALL",
        page: 1,
    });

    const fetchPayments = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (filters.search) params.set("search", filters.search);
        if (filters.status !== "ALL") params.set("status", filters.status);
        if (filters.method !== "ALL") params.set("method", filters.method);
        params.set("page", String(filters.page));

        const res = await fetch(`/api/payments?${params}`);
        const d = await res.json();
        setData(d);
        setLoading(false);
    }, [filters]);

    useEffect(() => { fetchPayments(); }, [fetchPayments]);

    const processRefund = async () => {
        if (!selectedPayment || !refundAmount || !refundReason) return;
        await fetch(`/api/payments/${selectedPayment.id}/refund`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                amount: parseFloat(refundAmount),
                reason: refundReason,
            }),
        });
        setSelectedPayment(null);
        setRefundAmount("");
        setRefundReason("");
        fetchPayments();
    };

    const columns: ColumnDef<Payment, unknown>[] = [
        {
            accessorKey: "paymentNumber",
            header: "Payment #",
            cell: ({ row }) => (
                <span className="font-mono text-sm font-semibold">{row.original.paymentNumber}</span>
            ),
        },
        {
            accessorKey: "guestName",
            header: "Guest",
            cell: ({ row }) => (
                <div>
                    <p className="font-medium text-sm">{row.original.guestName}</p>
                    {row.original.bookingNumber && (
                        <p className="text-xs text-muted-foreground">{row.original.bookingNumber}</p>
                    )}
                </div>
            ),
        },
        {
            accessorKey: "amount",
            header: "Amount",
            cell: ({ row }) => (
                <span className="font-semibold text-sm">{formatCurrency(row.original.amount)}</span>
            ),
        },
        {
            accessorKey: "method",
            header: "Method",
            cell: ({ row }) => {
                const method = METHOD_CONFIG[row.original.method];
                return (
                    <span className="text-sm">
                        {method.icon} {method.label}
                    </span>
                );
            },
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const status = STATUS_CONFIG[row.original.status];
                return (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.bg} ${status.text}`}>
                        {status.label}
                    </span>
                );
            },
        },
        {
            accessorKey: "transactionId",
            header: "Transaction ID",
            cell: ({ row }) => (
                <span className="font-mono text-xs text-muted-foreground">
                    {row.original.transactionId || "-"}
                </span>
            ),
        },
        {
            accessorKey: "createdAt",
            header: "Date",
            cell: ({ row }) => (
                <span className="text-sm">{formatDate(row.original.createdAt, "short")}</span>
            ),
        },
        {
            id: "actions",
            header: "",
            cell: ({ row }) => (
                <div className="flex items-center gap-1 justify-end">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSelectedPayment(row.original)}
                    >
                        <CreditCard className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    function updateFilter(key: string, value: string) {
        setFilters((f) => ({ ...f, [key]: value, page: 1 }));
    }

    const breadcrumbItems: BreadcrumbItem[] = [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Payments" },
    ];

    return (
        <div className="space-y-6">
            <Breadcrumbs items={breadcrumbItems} />
            <PageHeader
                title="Payments"
                description={`${data?.total ?? 0} total payments`}
                actions={
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={fetchPayments} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                    </div>
                }
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="rounded-lg border bg-green-50 p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(data?.summary.totalCollected ?? 0)}</p>
                    <p className="text-xs text-muted-foreground">Total Collected</p>
                </div>
                <div className="rounded-lg border bg-red-50 p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(data?.summary.totalRefunded ?? 0)}</p>
                    <p className="text-xs text-muted-foreground">Total Refunded</p>
                </div>
                <div className="rounded-lg border bg-yellow-50 p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{formatCurrency(data?.summary.totalPending ?? 0)}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                    <p className="text-2xl font-bold">💵 {formatCurrency(data?.summary.cashCollected ?? 0)}</p>
                    <p className="text-xs text-muted-foreground">Cash</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                    <p className="text-2xl font-bold">💳 {formatCurrency(data?.summary.cardCollected ?? 0)}</p>
                    <p className="text-xs text-muted-foreground">Card</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search payment, guest..."
                        value={filters.search}
                        onChange={(e) => updateFilter("search", e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={filters.status} onValueChange={(v) => updateFilter("status", v)}>
                    <SelectTrigger className="w-[150px]">
                        <Filter className="h-4 w-4 mr-1.5 text-muted-foreground" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <option value="ALL">All Status</option>
                        <option value="PENDING">Pending</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="FAILED">Failed</option>
                        <option value="REFUNDED">Refunded</option>
                        <option value="PARTIAL_REFUND">Partial Refund</option>
                    </SelectContent>
                </Select>
                <Select value={filters.method} onValueChange={(v) => updateFilter("method", v)}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Payment Method" />
                    </SelectTrigger>
                    <SelectContent>
                        <option value="ALL">All Methods</option>
                        <option value="CASH">Cash</option>
                        <option value="CARD">Card</option>
                        <option value="UPI">UPI</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="WALLET">Wallet</option>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={data?.payments ?? []}
                isLoading={loading}
                pageSize={20}
                filterPlaceholder="Filter payments..."
            />

            {/* Pagination info */}
            {data && (
                <div className="text-sm text-muted-foreground text-center">
                    Page {data.page} of {data.pages} — {data.total} total payments
                </div>
            )}

            {/* Payment Details & Refund Modal */}
            {selectedPayment && (
                <Dialog open onOpenChange={() => setSelectedPayment(null)}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-3">
                                <CreditCard className="h-6 w-6" />
                                <div>
                                    <span className="font-mono">{selectedPayment.paymentNumber}</span>
                                    <p className="text-sm font-normal text-muted-foreground">
                                        Payment Details
                                    </p>
                                </div>
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            {/* Guest & Booking Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-muted-foreground">Guest</p>
                                    <p className="font-medium">{selectedPayment.guestName}</p>
                                </div>
                                {selectedPayment.bookingNumber && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">Booking</p>
                                        <p className="font-mono font-medium">{selectedPayment.bookingNumber}</p>
                                    </div>
                                )}
                            </div>

                            {/* Amount & Method */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-lg bg-green-50 p-3 text-center">
                                    <p className="text-xs text-muted-foreground">Amount</p>
                                    <p className="text-2xl font-bold text-green-600">{formatCurrency(selectedPayment.amount)}</p>
                                </div>
                                <div className="rounded-lg bg-secondary/50 p-3 text-center">
                                    <p className="text-xs text-muted-foreground">Method</p>
                                    <p className="font-medium mt-1">
                                        {METHOD_CONFIG[selectedPayment.method].icon} {METHOD_CONFIG[selectedPayment.method].label}
                                    </p>
                                </div>
                            </div>

                            {/* Status */}
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Status</p>
                                <span className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_CONFIG[selectedPayment.status].bg
                                    } ${STATUS_CONFIG[selectedPayment.status].text}`}>
                                    {STATUS_CONFIG[selectedPayment.status].label}
                                </span>
                            </div>

                            {/* Transaction Details */}
                            {selectedPayment.transactionId && (
                                <div>
                                    <p className="text-xs text-muted-foreground">Transaction ID</p>
                                    <p className="font-mono text-sm">{selectedPayment.transactionId}</p>
                                </div>
                            )}

                            {/* Refund Info */}
                            {(selectedPayment.status === "REFUNDED" || selectedPayment.status === "PARTIAL_REFUND") && (
                                <div className="rounded-lg bg-orange-50 border border-orange-200 p-3">
                                    <p className="text-xs text-orange-600 font-medium">Refund Info</p>
                                    <p className="text-sm text-orange-700">
                                        {selectedPayment.status === "PARTIAL_REFUND"
                                            ? `Partial refund: ${formatCurrency(selectedPayment.refundedAmount ?? 0)}`
                                            : "Fully refunded"
                                        }
                                    </p>
                                    {selectedPayment.refundReason && (
                                        <p className="text-xs text-orange-600 mt-1">{selectedPayment.refundReason}</p>
                                    )}
                                </div>
                            )}

                            {/* Refund Form (only for COMPLETED payments) */}
                            {selectedPayment.status === "COMPLETED" && (
                                <div className="border-t pt-4 space-y-3">
                                    <p className="text-sm font-medium">Process Refund</p>
                                    <div className="space-y-2">
                                        <div>
                                            <label className="text-xs text-muted-foreground">Refund Amount</label>
                                            <Input
                                                type="number"
                                                value={refundAmount}
                                                onChange={(e) => setRefundAmount(e.target.value)}
                                                placeholder={`Max: ${formatCurrency(selectedPayment.amount)}`}
                                                max={selectedPayment.amount}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-muted-foreground">Reason</label>
                                            <Input
                                                value={refundReason}
                                                onChange={(e) => setRefundReason(e.target.value)}
                                                placeholder="Enter refund reason..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setSelectedPayment(null)}>Close</Button>
                            {selectedPayment.status === "COMPLETED" && (
                                <Button
                                    variant="destructive"
                                    onClick={processRefund}
                                    disabled={!refundAmount || !refundReason || parseFloat(refundAmount) > selectedPayment.amount}
                                >
                                    <RotateCcw className="h-4 w-4 mr-2" /> Process Refund
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
