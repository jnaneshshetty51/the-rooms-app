"use client";

// apps/admin/src/app/(dashboard)/invoices/page.tsx
// Finance - Invoices - View all invoices, cancel/reissue, credit notes

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Search,
    Filter,
    FileText,
    Eye,
    Download,
    RefreshCw,
    XCircle,
    CheckCircle,
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
    EmptyState,
    Breadcrumbs,
    BreadcrumbItem,
} from "@the-rooms/ui";
import { formatCurrency, formatDate } from "@the-rooms/ui";

interface Invoice {
    id: string;
    invoiceNumber: string;
    bookingNumber: string | null;
    guestName: string;
    guestEmail: string | null;
    amount: number;
    taxAmount: number;
    totalAmount: number;
    status: "DRAFT" | "ISSUED" | "PAID" | "CANCELLED" | "CREDIT_NOTE";
    paymentStatus: "PENDING" | "PAID" | "PARTIAL" | "REFUNDED";
    issuedAt: string | null;
    dueDate: string | null;
    paidAt: string | null;
    cancelledAt: string | null;
    cancelledReason: string | null;
    items: { description: string; quantity: number; rate: number; amount: number }[];
}

interface InvoicesResponse {
    invoices: Invoice[];
    total: number;
    pages: number;
    page: number;
    summary: {
        totalIssued: number;
        totalPaid: number;
        totalPending: number;
        totalCancelled: number;
    };
}

const STATUS_CONFIG = {
    DRAFT: { label: "Draft", bg: "bg-gray-100", text: "text-gray-700" },
    ISSUED: { label: "Issued", bg: "bg-blue-100", text: "text-blue-700" },
    PAID: { label: "Paid", bg: "bg-green-100", text: "text-green-700" },
    CANCELLED: { label: "Cancelled", bg: "bg-red-100", text: "text-red-700" },
    CREDIT_NOTE: { label: "Credit Note", bg: "bg-purple-100", text: "text-purple-700" },
};

const PAYMENT_STATUS_CONFIG = {
    PENDING: { label: "Pending", bg: "bg-yellow-100", text: "text-yellow-700" },
    PAID: { label: "Paid", bg: "bg-green-100", text: "text-green-700" },
    PARTIAL: { label: "Partial", bg: "bg-orange-100", text: "text-orange-700" },
    REFUNDED: { label: "Refunded", bg: "bg-gray-100", text: "text-gray-700" },
};

export default function InvoicesPage() {
    const router = useRouter();
    const [data, setData] = useState<InvoicesResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [filters, setFilters] = useState({
        search: "",
        status: "ALL",
        paymentStatus: "ALL",
        page: 1,
    });

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (filters.search) params.set("search", filters.search);
        if (filters.status !== "ALL") params.set("status", filters.status);
        if (filters.paymentStatus !== "ALL") params.set("paymentStatus", filters.paymentStatus);
        params.set("page", String(filters.page));

        const res = await fetch(`/api/invoices?${params}`);
        const d = await res.json();
        setData(d);
        setLoading(false);
    }, [filters]);

    useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

    const cancelInvoice = async (invoiceId: string, reason: string) => {
        await fetch(`/api/invoices/${invoiceId}/cancel`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason }),
        });
        fetchInvoices();
    };

    const columns: ColumnDef<Invoice, unknown>[] = [
        {
            accessorKey: "invoiceNumber",
            header: "Invoice #",
            cell: ({ row }) => (
                <span className="font-mono text-sm font-semibold">{row.original.invoiceNumber}</span>
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
            accessorKey: "totalAmount",
            header: "Amount",
            cell: ({ row }) => (
                <span className="font-semibold text-sm">{formatCurrency(row.original.totalAmount)}</span>
            ),
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
            accessorKey: "paymentStatus",
            header: "Payment",
            cell: ({ row }) => {
                const status = PAYMENT_STATUS_CONFIG[row.original.paymentStatus];
                return (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.bg} ${status.text}`}>
                        {status.label}
                    </span>
                );
            },
        },
        {
            accessorKey: "issuedAt",
            header: "Issued",
            cell: ({ row }) => (
                <span className="text-sm">{row.original.issuedAt ? formatDate(row.original.issuedAt, "short") : "-"}</span>
            ),
        },
        {
            accessorKey: "dueDate",
            header: "Due Date",
            cell: ({ row }) => {
                const isOverdue = row.original.dueDate && new Date(row.original.dueDate) < new Date() && row.original.paymentStatus === "PENDING";
                return (
                    <span className={`text-sm ${isOverdue ? "text-red-600 font-medium" : ""}`}>
                        {row.original.dueDate ? formatDate(row.original.dueDate, "short") : "-"}
                    </span>
                );
            },
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
                        onClick={() => setSelectedInvoice(row.original)}
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                    {row.original.status === "ISSUED" && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                            onClick={() => {
                                const reason = prompt("Enter cancellation reason:");
                                if (reason) cancelInvoice(row.original.id, reason);
                            }}
                        >
                            <XCircle className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    function updateFilter(key: string, value: string) {
        setFilters((f) => ({ ...f, [key]: value, page: 1 }));
    }

    const breadcrumbItems: BreadcrumbItem[] = [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Invoices" },
    ];

    return (
        <div className="space-y-6">
            <Breadcrumbs items={breadcrumbItems} />
            <PageHeader
                title="Invoices"
                description={`${data?.total ?? 0} total invoices`}
                actions={
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={fetchInvoices} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                    </div>
                }
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-lg border bg-blue-50 p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(data?.summary.totalIssued ?? 0)}</p>
                    <p className="text-xs text-muted-foreground">Total Issued</p>
                </div>
                <div className="rounded-lg border bg-green-50 p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(data?.summary.totalPaid ?? 0)}</p>
                    <p className="text-xs text-muted-foreground">Total Paid</p>
                </div>
                <div className="rounded-lg border bg-yellow-50 p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{formatCurrency(data?.summary.totalPending ?? 0)}</p>
                    <p className="text-xs text-muted-foreground">Total Pending</p>
                </div>
                <div className="rounded-lg border bg-red-50 p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{data?.summary.totalCancelled ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Cancelled</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search invoice, guest..."
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
                        <option value="DRAFT">Draft</option>
                        <option value="ISSUED">Issued</option>
                        <option value="PAID">Paid</option>
                        <option value="CANCELLED">Cancelled</option>
                        <option value="CREDIT_NOTE">Credit Note</option>
                    </SelectContent>
                </Select>
                <Select value={filters.paymentStatus} onValueChange={(v) => updateFilter("paymentStatus", v)}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Payment" />
                    </SelectTrigger>
                    <SelectContent>
                        <option value="ALL">All Payment</option>
                        <option value="PENDING">Pending</option>
                        <option value="PAID">Paid</option>
                        <option value="PARTIAL">Partial</option>
                        <option value="REFUNDED">Refunded</option>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            {!loading && (!data?.invoices || data.invoices.length === 0) ? (
                <EmptyState
                    title="No invoices found"
                    description={filters.search || filters.status !== "ALL" || filters.paymentStatus !== "ALL" ? "Try adjusting your filters to find what you're looking for." : "Invoices will appear here once bookings are completed."}
                    icon={<FileText className="h-12 w-12" />}
                    action={
                        filters.search || filters.status !== "ALL" || filters.paymentStatus !== "ALL"
                            ? { label: "Clear Filters", onClick: () => setFilters((f) => ({ ...f, search: "", status: "ALL", paymentStatus: "ALL" })) }
                            : undefined
                    }
                />
            ) : (
                <DataTable
                    columns={columns}
                    data={data?.invoices ?? []}
                    isLoading={loading}
                    pageSize={20}
                    filterPlaceholder="Filter invoices..."
                />
            )}

            {/* Pagination info */}
            {data && (
                <div className="text-sm text-muted-foreground text-center">
                    Page {data.page} of {data.pages} — {data.total} total invoices
                </div>
            )}

            {/* Invoice Details Modal */}
            {selectedInvoice && (
                <Dialog open onOpenChange={() => setSelectedInvoice(null)}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-3">
                                <FileText className="h-6 w-6" />
                                <div>
                                    <span className="font-mono">{selectedInvoice.invoiceNumber}</span>
                                    <p className="text-sm font-normal text-muted-foreground">
                                        {selectedInvoice.status === "CANCELLED" ? "Cancelled" : selectedInvoice.status === "CREDIT_NOTE" ? "Credit Note" : "Invoice"}
                                    </p>
                                </div>
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6 py-4">
                            {/* Guest Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-muted-foreground">Guest</p>
                                    <p className="font-medium">{selectedInvoice.guestName}</p>
                                    {selectedInvoice.guestEmail && (
                                        <p className="text-sm text-blue-600">{selectedInvoice.guestEmail}</p>
                                    )}
                                </div>
                                {selectedInvoice.bookingNumber && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">Booking</p>
                                        <p className="font-mono font-medium">{selectedInvoice.bookingNumber}</p>
                                    </div>
                                )}
                            </div>

                            {/* Invoice Items */}
                            <div>
                                <p className="text-xs text-muted-foreground mb-2">Items</p>
                                <div className="rounded-lg border">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/50">
                                                <th className="text-left py-2 px-3 font-medium">Description</th>
                                                <th className="text-right py-2 px-3 font-medium">Qty</th>
                                                <th className="text-right py-2 px-3 font-medium">Rate</th>
                                                <th className="text-right py-2 px-3 font-medium">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedInvoice.items.map((item, i) => (
                                                <tr key={i} className="border-b last:border-0">
                                                    <td className="py-2 px-3">{item.description}</td>
                                                    <td className="py-2 px-3 text-right">{item.quantity}</td>
                                                    <td className="py-2 px-3 text-right">{formatCurrency(item.rate)}</td>
                                                    <td className="py-2 px-3 text-right font-medium">{formatCurrency(item.amount)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="flex justify-end">
                                <div className="w-64 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span>{formatCurrency(selectedInvoice.amount)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Tax</span>
                                        <span>{formatCurrency(selectedInvoice.taxAmount)}</span>
                                    </div>
                                    <div className="flex justify-between font-semibold text-lg border-t pt-2">
                                        <span>Total</span>
                                        <span className="text-green-600">{formatCurrency(selectedInvoice.totalAmount)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                    <p className="text-xs text-muted-foreground">Issued</p>
                                    <p>{selectedInvoice.issuedAt ? formatDate(selectedInvoice.issuedAt, "long") : "-"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Due Date</p>
                                    <p>{selectedInvoice.dueDate ? formatDate(selectedInvoice.dueDate, "long") : "-"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Paid</p>
                                    <p>{selectedInvoice.paidAt ? formatDate(selectedInvoice.paidAt, "long") : "-"}</p>
                                </div>
                            </div>

                            {/* Cancellation Reason */}
                            {selectedInvoice.status === "CANCELLED" && selectedInvoice.cancelledReason && (
                                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                                    <p className="text-xs text-red-600 font-medium">Cancelled</p>
                                    <p className="text-sm text-red-700">{selectedInvoice.cancelledReason}</p>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setSelectedInvoice(null)}>Close</Button>
                            <Button variant="outline" onClick={() => router.push(`/invoices/${selectedInvoice.id}/pdf`)}>
                                <Download className="h-4 w-4 mr-2" /> Download PDF
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
