"use client";

// apps/admin/src/app/(dashboard)/expenses/page.tsx
import { useEffect, useState, useCallback } from "react";
import {
    PageHeader,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    StatCard,
    Button,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Input,
    Label,
    Select,
    SelectTrigger,
    SelectContent,
    SelectValue,
    SelectItem,
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
    LoadingSpinner,
} from "@the-rooms/ui";
import {
    Plus,
    Trash2,
    Edit,
    FileText,
    TrendingDown,
    Search,
    Filter,
    RefreshCw,
} from "lucide-react";
import { formatCurrency, formatDate } from "@the-rooms/ui";
import { useToast } from "@the-rooms/ui";

type ExpenseCategory =
    | "UTILITIES"
    | "SALARIES"
    | "MAINTENANCE"
    | "SUPPLIES"
    | "MARKETING"
    | "INSURANCE"
    | "TAXES"
    | "OTHER";

interface Expense {
    id: string;
    propertyId: string;
    description: string;
    amount: string;
    category: ExpenseCategory;
    date: string;
    vendor: string | null;
    receiptUrl: string | null;
    createdBy: { name: string | null; email: string | null } | null;
    property: { id: string; name: string } | null;
    createdAt: string;
}

interface ExpensesResponse {
    expenses: Expense[];
    total: number;
    pages: number;
    page: number;
    totalAmount: number;
}

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
    UTILITIES: "Utilities",
    SALARIES: "Salaries",
    MAINTENANCE: "Maintenance",
    SUPPLIES: "Supplies",
    MARKETING: "Marketing",
    INSURANCE: "Insurance",
    TAXES: "Taxes & Fees",
    OTHER: "Other",
};

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
    UTILITIES: "bg-blue-100 text-blue-700",
    SALARIES: "bg-purple-100 text-purple-700",
    MAINTENANCE: "bg-amber-100 text-amber-700",
    SUPPLIES: "bg-green-100 text-green-700",
    MARKETING: "bg-pink-100 text-pink-700",
    INSURANCE: "bg-indigo-100 text-indigo-700",
    TAXES: "bg-red-100 text-red-700",
    OTHER: "bg-gray-100 text-gray-700",
};

export default function ExpensesPage() {
    const [data, setData] = useState<ExpensesResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Expense | null>(null);
    const [filters, setFilters] = useState({
        search: "",
        category: "all",
        page: 1,
    });
    const toast = useToast();

    const fetchExpenses = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.search) params.set("search", filters.search);
            if (filters.category !== "all") params.set("category", filters.category);
            params.set("page", String(filters.page));

            const res = await fetch(`/api/expenses?${params}`);
            if (res.ok) {
                const json = await res.json();
                setData(json);
            } else {
                toast.error("Failed to load expenses");
            }
        } catch {
            toast.error("Failed to load expenses");
        } finally {
            setLoading(false);
        }
    }, [filters, toast]);

    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

    const [form, setForm] = useState({
        description: "",
        amount: "",
        category: "UTILITIES" as ExpenseCategory,
        date: "",
        vendor: "",
    });

    const expenses = data?.expenses ?? [];
    const totalAmount = data?.totalAmount ?? 0;

    const categoryBreakdown = Object.entries(
        expenses.reduce<Record<string, number>>((acc, e) => {
            const amt = typeof e.amount === "string" ? parseFloat(e.amount) : Number(e.amount);
            acc[e.category] = (acc[e.category] ?? 0) + amt;
            return acc;
        }, {})
    ).sort((a, b) => b[1] - a[1]);

    function openAdd() {
        setEditing(null);
        setForm({ description: "", amount: "", category: "UTILITIES", date: "", vendor: "" });
        setDialogOpen(true);
    }

    function openEdit(exp: Expense) {
        setEditing(exp);
        setForm({
            description: exp.description,
            amount: typeof exp.amount === "string" ? exp.amount : String(exp.amount),
            category: exp.category,
            date: exp.date ? exp.date.slice(0, 10) : "",
            vendor: exp.vendor ?? "",
        });
        setDialogOpen(true);
    }

    async function handleSubmit() {
        if (!form.description || !form.amount || !form.date) {
            toast.error("Please fill in all required fields");
            return;
        }

        try {
            const payload = {
                description: form.description,
                amount: parseFloat(form.amount),
                category: form.category,
                date: form.date,
                vendor: form.vendor || undefined,
            };

            let res: Response;
            if (editing) {
                res = await fetch(`/api/expenses/${editing.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            } else {
                res = await fetch("/api/expenses", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            }

            if (res.ok) {
                toast.success(editing ? "Expense updated" : "Expense added");
                setDialogOpen(false);
                fetchExpenses();
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to save expense");
            }
        } catch {
            toast.error("Failed to save expense");
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this expense? This action cannot be undone.")) return;

        try {
            const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Expense deleted");
                fetchExpenses();
            } else {
                toast.error("Failed to delete expense");
            }
        } catch {
            toast.error("Failed to delete expense");
        }
    }

    function updateFilter(key: string, value: string) {
        setFilters((f) => ({ ...f, [key]: value, page: 1 }));
    }

    if (loading && !data) {
        return (
            <div className="flex h-full min-h-[50vh] items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Expenses"
                description="Track and manage property operational expenses"
                actions={
                    <Button onClick={openAdd} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Expense
                    </Button>
                }
            />

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Total Expenses"
                    value={formatCurrency(totalAmount)}
                    format="currency"
                    icon={TrendingDown}
                />
                <StatCard
                    label="Expense Count"
                    value={data?.total ?? 0}
                    icon={FileText}
                />
                <StatCard
                    label="Avg Expense"
                    value={data?.total ? formatCurrency(totalAmount / data.total) : formatCurrency(0)}
                    format="currency"
                    icon={FileText}
                />
                <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchExpenses}
                    className="h-auto gap-2"
                >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search expenses..."
                        value={filters.search}
                        onChange={(e) => updateFilter("search", e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={filters.category} onValueChange={(v) => updateFilter("category", v)}>
                    <SelectTrigger className="w-[180px]">
                        <Filter className="h-4 w-4 mr-1.5 text-muted-foreground" />
                        <span>
                            {filters.category === "all"
                                ? "All Categories"
                                : CATEGORY_LABELS[filters.category as ExpenseCategory]}
                        </span>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>
                                {v}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Category Breakdown */}
                {categoryBreakdown.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">By Category</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {categoryBreakdown.map(([cat, amount]) => {
                                const pct = totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(1) : "0";
                                return (
                                    <div key={cat}>
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`text-[10px] px-1.5 py-0.5 rounded ${CATEGORY_COLORS[cat as ExpenseCategory]
                                                        }`}
                                                >
                                                    {CATEGORY_LABELS[cat as ExpenseCategory]}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold">{formatCurrency(amount)}</span>
                                                <span className="text-[10px] text-muted-foreground">{pct}%</span>
                                            </div>
                                        </div>
                                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-[#E17055] rounded-full"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                )}

                {/* Expense Table */}
                <div className={categoryBreakdown.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}>
                    <Card>
                        <CardHeader>
                            <div className="flex flex-wrap items-center gap-3">
                                <CardTitle className="text-base flex-1">
                                    All Expenses ({data?.total ?? 0})
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <LoadingSpinner />
                                </div>
                            ) : expenses.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                    <p>No expenses found</p>
                                    <p className="text-sm">Add your first expense to get started</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Description</TableHead>
                                                <TableHead>Category</TableHead>
                                                <TableHead>Vendor</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Created By</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                                <TableHead />
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {expenses.map((exp) => (
                                                <TableRow key={exp.id}>
                                                    <TableCell className="font-medium max-w-[200px] truncate">
                                                        {exp.description}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span
                                                            className={`text-[10px] px-1.5 py-0.5 rounded ${CATEGORY_COLORS[exp.category]
                                                                }`}
                                                        >
                                                            {CATEGORY_LABELS[exp.category]}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {exp.vendor || "-"}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-xs">
                                                        {formatDate(exp.date, "short")}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-xs">
                                                        {exp.createdBy?.name || "—"}
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold">
                                                        {formatCurrency(Number(exp.amount))}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1 justify-end">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7"
                                                                onClick={() => openEdit(exp)}
                                                            >
                                                                <Edit className="h-3 w-3" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-destructive hover:text-destructive"
                                                                onClick={() => handleDelete(exp.id)}
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Pagination */}
            {data && data.pages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                        disabled={filters.page <= 1}
                    >
                        Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Page {filters.page} of {data.pages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                        disabled={filters.page >= data.pages}
                    >
                        Next
                    </Button>
                </div>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit Expense" : "Add Expense"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div>
                            <Label>Description *</Label>
                            <Input
                                value={form.description}
                                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                placeholder="e.g. Electricity bill — May 2026"
                                className="mt-1"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Amount (₹) *</Label>
                                <Input
                                    type="number"
                                    value={form.amount}
                                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                                    placeholder="0"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Category *</Label>
                                <Select
                                    value={form.category}
                                    onValueChange={(v) => setForm((f) => ({ ...f, category: v as ExpenseCategory }))}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                                            <SelectItem key={k} value={k}>
                                                {v}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Date *</Label>
                                <Input
                                    type="date"
                                    value={form.date}
                                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Vendor</Label>
                                <Input
                                    value={form.vendor}
                                    onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
                                    placeholder="Vendor name"
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit}>{editing ? "Update" : "Add Expense"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
