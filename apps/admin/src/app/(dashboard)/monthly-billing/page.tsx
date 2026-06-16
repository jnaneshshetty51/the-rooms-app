"use client";

// apps/admin/src/app/(dashboard)/monthly-billing/page.tsx
import { useEffect, useState, useCallback } from "react";
import { Receipt, Download, Plus, Calendar } from "lucide-react";
import {
    PageHeader,
    Button,
    Input,
    Select,
    SelectTrigger,
    SelectContent,
    SelectValue,
    DataTable,
    type ColumnDef,
    Card,
    CardContent,
    Badge,
    StatCard,
} from "@the-rooms/ui";
import { formatCurrency, formatDate } from "@the-rooms/ui";
import { fetchMonthlyInvoices, generateMonthlyInvoice, batchGenerateInvoices, type MonthlyInvoice } from "@/lib/api";

export default function MonthlyBillingPage() {
    const [data, setData] = useState<{ invoices: MonthlyInvoice[]; total: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ month: "", status: "ALL" });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (filters.month) params.month = filters.month;
            if (filters.status !== "ALL") params.status = filters.status;
            const result = await fetchMonthlyInvoices(params);
            setData(result);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleGenerateSingle = async () => {
        const contractId = prompt("Enter contract ID:");
        const month = prompt("Enter month (YYYY-MM):");
        if (contractId && month) {
            await generateMonthlyInvoice(contractId, month);
            fetchData();
        }
    };

    const handleBatchGenerate = async () => {
        const month = prompt("Enter month for batch generation (YYYY-MM):");
        if (month) {
            await batchGenerateInvoices(month);
            fetchData();
        }
    };

    const columns: ColumnDef<MonthlyInvoice, unknown>[] = [
        { accessorKey: "invoiceNumber", header: "Invoice #", cell: ({ row }) => <code className="font-semibold">{row.original.invoiceNumber}</code> },
        { accessorKey: "contract.companyName", header: "Company" },
        { accessorKey: "billingMonth", header: "Month", cell: ({ row }) => <span className="text-sm">{row.original.billingMonth}</span> },
        { accessorKey: "bookingCount", header: "Bookings" },
        { accessorKey: "totalAmount", header: "Amount", cell: ({ row }) => <span className="font-semibold">{formatCurrency(row.original.totalAmount)}</span> },
        { accessorKey: "grandTotal", header: "Grand Total", cell: ({ row }) => <span className="font-semibold text-primary">{formatCurrency(row.original.grandTotal)}</span> },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => (
                <Badge variant={row.original.status === "PAID" ? "success" : row.original.status === "OVERDUE" ? "destructive" : "secondary"}>
                    {row.original.status}
                </Badge>
            ),
        },
        { accessorKey: "dueDate", header: "Due", cell: ({ row }) => <span className="text-sm">{formatDate(row.original.dueDate, "short")}</span> },
    ];

    const stats = data?.invoices ? {
        total: data.invoices.length,
        draft: data.invoices.filter((i) => i.status === "DRAFT").length,
        sent: data.invoices.filter((i) => i.status === "SENT").length,
        paid: data.invoices.filter((i) => i.status === "PAID").length,
        totalAmount: data.invoices.reduce((sum, i) => sum + i.grandTotal, 0),
    } : { total: 0, draft: 0, sent: 0, paid: 0, totalAmount: 0 };

    return (
        <div className="space-y-6">
            <PageHeader title="Monthly Billing" description="Generate and manage monthly invoices" actions={<><Button variant="outline" onClick={handleGenerateSingle}><Plus className="h-4 w-4 mr-2" />Generate Single</Button><Button onClick={handleBatchGenerate}><Download className="h-4 w-4 mr-2" />Batch Generate</Button></>} />
            <div className="grid gap-4 sm:grid-cols-4">
                <StatCard label="Total Invoices" value={stats.total} icon={Receipt} />
                <StatCard label="Draft" value={stats.draft} icon={Receipt} />
                <StatCard label="Sent" value={stats.sent} icon={Receipt} />
                <StatCard label="Total Amount" value={formatCurrency(stats.totalAmount)} icon={Receipt} />
            </div>
            <div className="flex flex-wrap gap-3">
                <Input type="month" className="w-[160px]" value={filters.month} onChange={(e) => setFilters((f) => ({ ...f, month: e.target.value }))} />
                <Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}>
                    <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <option value="ALL">All Status</option>
                        <option value="DRAFT">Draft</option>
                        <option value="SENT">Sent</option>
                        <option value="PAID">Paid</option>
                        <option value="OVERDUE">Overdue</option>
                    </SelectContent>
                </Select>
            </div>
            <DataTable columns={columns} data={data?.invoices ?? []} isLoading={loading} pageSize={20} filterPlaceholder="Filter invoices..." />
        </div>
    );
}