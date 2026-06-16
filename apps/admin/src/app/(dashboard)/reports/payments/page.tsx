"use client";

// apps/admin/src/app/(dashboard)/reports/payments/page.tsx
import { useEffect, useState, useCallback } from "react";
import {
    DollarSign,
    CreditCard,
    Banknote,
    AlertCircle,
    Receipt,
    Download,
} from "lucide-react";
import {
    PageHeader,
    Input,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    StatCard,
    DataTable,
    type ColumnDef,
    Badge,
    ExportButton,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
} from "@the-rooms/ui";
import { formatCurrency, formatDate } from "@the-rooms/ui";
import {
    fetchPaymentReconciliation,
    fetchCashPayments,
    fetchOnlinePayments,
    fetchOutstandingPayments,
    fetchGSTReport,
    type PaymentReconciliation,
    type CashPaymentReport,
    type OnlinePaymentReport,
    type OutstandingPayment,
    type TaxReport,
} from "@/lib/api";

export default function PaymentsReportPage() {
    const [reconciliationData, setReconciliationData] = useState<{
        payments: PaymentReconciliation[];
        summary: { totalAmount: number; settledAmount: number; pendingAmount: number };
    } | null>(null);
    const [cashData, setCashData] = useState<{ payments: CashPaymentReport[]; totalAmount: number } | null>(null);
    const [onlineData, setOnlineData] = useState<{ payments: OnlinePaymentReport[]; totalAmount: number } | null>(null);
    const [outstandingData, setOutstandingData] = useState<{
        payments: OutstandingPayment[];
        totalPending: number;
    } | null>(null);
    const [gstData, setGstData] = useState<{
        records: TaxReport[];
        summary: {
            totalTaxable: number;
            totalCGST: number;
            totalSGST: number;
            totalIGST: number;
            totalTax: number;
        };
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("reconciliation");
    const [filters, setFilters] = useState({
        fromDate: "",
        toDate: "",
        status: "ALL",
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (filters.fromDate) params.fromDate = filters.fromDate;
            if (filters.toDate) params.toDate = filters.toDate;
            if (filters.status !== "ALL") params.status = filters.status;

            const [reconciliation, cash, online, outstanding, gst] = await Promise.all([
                fetchPaymentReconciliation(params),
                fetchCashPayments(params),
                fetchOnlinePayments(params),
                fetchOutstandingPayments(),
                fetchGSTReport(params),
            ]);

            setReconciliationData(reconciliation);
            setCashData(cash);
            setOnlineData(online);
            setOutstandingData(outstanding);
            setGstData(gst);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    function updateFilter(key: string, value: string) {
        setFilters((f) => ({ ...f, [key]: value }));
    }

    const reconciliationColumns: ColumnDef<PaymentReconciliation, unknown>[] = [
        {
            accessorKey: "bookingNumber",
            header: "Booking ID",
            cell: ({ row }) => (
                <code className="text-sm font-semibold">{row.original.bookingNumber}</code>
            ),
        },
        {
            accessorKey: "guest.name",
            header: "Guest",
            cell: ({ row }) => <span className="font-medium">{row.original.guest.name}</span>,
        },
        {
            accessorKey: "totalAmount",
            header: "Total",
            cell: ({ row }) => (
                <span className="font-semibold">{formatCurrency(row.original.totalAmount)}</span>
            ),
        },
        {
            accessorKey: "paidAmount",
            header: "Paid",
            cell: ({ row }) => (
                <span className="text-success">{formatCurrency(row.original.paidAmount)}</span>
            ),
        },
        {
            accessorKey: "pendingAmount",
            header: "Pending",
            cell: ({ row }) => (
                <span className={row.original.pendingAmount > 0 ? "text-warning font-medium" : ""}>
                    {formatCurrency(row.original.pendingAmount)}
                </span>
            ),
        },
        {
            accessorKey: "paymentMethod",
            header: "Method",
            cell: ({ row }) => (
                <Badge variant="secondary">{row.original.paymentMethod}</Badge>
            ),
        },
        {
            accessorKey: "settledAt",
            header: "Settled",
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                    {row.original.settledAt ? formatDate(row.original.settledAt, "short") : "—"}
                </span>
            ),
        },
    ];

    const gstColumns: ColumnDef<TaxReport, unknown>[] = [
        {
            accessorKey: "invoiceNumber",
            header: "Invoice #",
            cell: ({ row }) => (
                <code className="text-sm font-semibold">{row.original.invoiceNumber}</code>
            ),
        },
        {
            accessorKey: "bookingNumber",
            header: "Booking",
            cell: ({ row }) => (
                <span className="text-sm">{row.original.bookingNumber}</span>
            ),
        },
        {
            accessorKey: "guest.name",
            header: "Guest",
            cell: ({ row }) => <span className="font-medium">{row.original.guest.name}</span>,
        },
        {
            accessorKey: "taxableAmount",
            header: "Taxable",
            cell: ({ row }) => (
                <span>{formatCurrency(row.original.taxableAmount)}</span>
            ),
        },
        {
            accessorKey: "cgst",
            header: "CGST",
            cell: ({ row }) => (
                <span className="text-sm">{formatCurrency(row.original.cgst)}</span>
            ),
        },
        {
            accessorKey: "sgst",
            header: "SGST",
            cell: ({ row }) => (
                <span className="text-sm">{formatCurrency(row.original.sgst)}</span>
            ),
        },
        {
            accessorKey: "igst",
            header: "IGST",
            cell: ({ row }) => (
                <span className="text-sm">{formatCurrency(row.original.igst)}</span>
            ),
        },
        {
            accessorKey: "totalTax",
            header: "Total Tax",
            cell: ({ row }) => (
                <span className="font-semibold">{formatCurrency(row.original.totalTax)}</span>
            ),
        },
    ];

    const outstandingColumns: ColumnDef<OutstandingPayment, unknown>[] = [
        {
            accessorKey: "bookingNumber",
            header: "Booking ID",
            cell: ({ row }) => (
                <code className="text-sm font-semibold">{row.original.bookingNumber}</code>
            ),
        },
        {
            accessorKey: "guest",
            header: "Guest",
            cell: ({ row }) => (
                <div>
                    <p className="font-medium">{row.original.guest.name}</p>
                    <p className="text-xs text-muted-foreground">{row.original.guest.phone}</p>
                </div>
            ),
        },
        {
            accessorKey: "pendingAmount",
            header: "Pending",
            cell: ({ row }) => (
                <span className="font-semibold text-warning">{formatCurrency(row.original.pendingAmount)}</span>
            ),
        },
        {
            accessorKey: "dueDate",
            header: "Due Date",
            cell: ({ row }) => (
                <span className="text-sm">{formatDate(row.original.dueDate, "short")}</span>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Payment Reports"
                description="Payment reconciliation, GST reports and outstanding payments"
            />

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Total Amount"
                    value={formatCurrency(reconciliationData?.summary.totalAmount ?? 0)}
                    icon={DollarSign}
                />
                <StatCard
                    label="Settled"
                    value={formatCurrency(reconciliationData?.summary.settledAmount ?? 0)}
                    icon={CreditCard}
                />
                <StatCard
                    label="Pending"
                    value={formatCurrency(reconciliationData?.summary.pendingAmount ?? 0)}
                    icon={AlertCircle}
                    className={(reconciliationData?.summary.pendingAmount ?? 0) > 0 ? "border-l-4 border-l-warning" : ""}
                />
                <StatCard
                    label="Outstanding"
                    value={formatCurrency(outstandingData?.totalPending ?? 0)}
                    icon={Receipt}
                />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <Input
                    type="date"
                    className="w-[160px]"
                    value={filters.fromDate}
                    onChange={(e) => updateFilter("fromDate", e.target.value)}
                    placeholder="From date"
                />
                <Input
                    type="date"
                    className="w-[160px]"
                    value={filters.toDate}
                    onChange={(e) => updateFilter("toDate", e.target.value)}
                    placeholder="To date"
                />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
                    <TabsTrigger value="cash">Cash Payments</TabsTrigger>
                    <TabsTrigger value="online">Online Payments</TabsTrigger>
                    <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
                    <TabsTrigger value="gst">GST Report</TabsTrigger>
                </TabsList>

                <TabsContent value="reconciliation" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-heading text-lg">Payment Reconciliation</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DataTable
                                columns={reconciliationColumns}
                                data={reconciliationData?.payments ?? []}
                                isLoading={loading}
                                pageSize={20}
                                filterPlaceholder="Filter payments..."
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="cash" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="font-heading text-lg">
                                Cash Payments ({formatCurrency(cashData?.totalAmount ?? 0)})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="space-y-3">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {cashData?.payments.map((payment) => (
                                        <div
                                            key={payment.id}
                                            className="flex items-center justify-between p-4 border rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                                    <Banknote className="h-5 w-5 text-green-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{payment.guest.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {payment.bookingNumber} · Collected by {payment.collectedBy.name}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold text-success">
                                                    {formatCurrency(payment.amount)}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatDate(payment.collectedAt, "short")}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {cashData?.payments.length === 0 && (
                                        <p className="text-center py-8 text-muted-foreground">No cash payments</p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="online" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="font-heading text-lg">
                                Online Payments ({formatCurrency(onlineData?.totalAmount ?? 0)})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="space-y-3">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {onlineData?.payments.map((payment) => (
                                        <div
                                            key={payment.id}
                                            className="flex items-center justify-between p-4 border rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                    <CreditCard className="h-5 w-5 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{payment.guest.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {payment.bookingNumber} · {payment.method}
                                                    </p>
                                                    <code className="text-xs text-muted-foreground">{payment.transactionId}</code>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                                                <Badge variant={payment.status === "SUCCESS" ? "success" : "destructive"}>
                                                    {payment.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                    {onlineData?.payments.length === 0 && (
                                        <p className="text-center py-8 text-muted-foreground">No online payments</p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="outstanding" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-heading text-lg">
                                Outstanding Payments ({formatCurrency(outstandingData?.totalPending ?? 0)})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DataTable
                                columns={outstandingColumns}
                                data={outstandingData?.payments ?? []}
                                isLoading={loading}
                                pageSize={20}
                                filterPlaceholder="Filter outstanding..."
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="gst" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="font-heading text-lg">GST Tax Report</CardTitle>
                            <ExportButton
                                data={gstData?.records.map((r) => ({
                                    "Invoice #": r.invoiceNumber,
                                    "Booking": r.bookingNumber,
                                    "Guest": r.guest.name,
                                    "Taxable Amount": r.taxableAmount,
                                    "CGST": r.cgst,
                                    "SGST": r.sgst,
                                    "IGST": r.igst,
                                    "Total Tax": r.totalTax,
                                    "Invoice Date": formatDate(r.invoiceDate, "short"),
                                })) ?? []}
                                filename="gst-report"
                                className="bg-primary text-primary-foreground hover:bg-primary/90"
                            />
                        </CardHeader>
                        <CardContent>
                            {/* GST Summary */}
                            {gstData && (
                                <div className="grid gap-4 sm:grid-cols-4 mb-6 p-4 bg-muted/50 rounded-lg">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Total Taxable</p>
                                        <p className="text-lg font-semibold">{formatCurrency(gstData.summary.totalTaxable)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">CGST</p>
                                        <p className="text-lg font-semibold">{formatCurrency(gstData.summary.totalCGST)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">SGST</p>
                                        <p className="text-lg font-semibold">{formatCurrency(gstData.summary.totalSGST)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Total Tax</p>
                                        <p className="text-lg font-semibold text-primary">{formatCurrency(gstData.summary.totalTax)}</p>
                                    </div>
                                </div>
                            )}
                            <DataTable
                                columns={gstColumns}
                                data={gstData?.records ?? []}
                                isLoading={loading}
                                pageSize={20}
                                filterPlaceholder="Filter GST records..."
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}