"use client";

import { useEffect, useState, useTransition } from "react";
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  StatCard,
  Badge,
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
  SelectValue,
  SelectContent,
  SelectItem,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@the-rooms/ui";
import {
  Plus,
  Trash2,
  Edit,
  FileText,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
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
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  vendor: string;
  receiptUrl?: string;
  createdBy: string;
}

const MOCK_EXPENSES: Expense[] = [
  {
    id: "1",
    description: "Electricity bill — May 2026",
    amount: 42800,
    category: "UTILITIES",
    date: "2026-05-20",
    vendor: "BSES Rajdhani",
    createdBy: "Admin",
  },
  {
    id: "2",
    description: "Staff salaries — May 2026",
    amount: 685000,
    category: "SALARIES",
    date: "2026-05-01",
    vendor: "Internal",
    createdBy: "Super Admin",
  },
  {
    id: "3",
    description: "AC unit repair — Room P108",
    amount: 12400,
    category: "MAINTENANCE",
    date: "2026-05-18",
    vendor: "CoolTech Services",
    createdBy: "Admin",
  },
  {
    id: "4",
    description: "Toiletries & housekeeping supplies",
    amount: 28750,
    category: "SUPPLIES",
    date: "2026-05-15",
    vendor: "HotelMart India",
    createdBy: "Admin",
  },
  {
    id: "5",
    description: "Google Ads campaign — May",
    amount: 35000,
    category: "MARKETING",
    date: "2026-05-05",
    vendor: "Google Ads",
    createdBy: "Admin",
  },
  {
    id: "6",
    description: "Property insurance renewal",
    amount: 45000,
    category: "INSURANCE",
    date: "2026-05-10",
    vendor: "HDFC ERGO",
    createdBy: "Super Admin",
  },
  {
    id: "7",
    description: "Water bill — May 2026",
    amount: 8400,
    category: "UTILITIES",
    date: "2026-05-22",
    vendor: "DJBDelhi",
    createdBy: "Admin",
  },
  {
    id: "8",
    description: "Internet & WiFi — June",
    amount: 12000,
    category: "UTILITIES",
    date: "2026-05-28",
    vendor: "Airtel Business",
    createdBy: "Admin",
  },
  {
    id: "9",
    description: "GST filing fees",
    amount: 5000,
    category: "TAXES",
    date: "2026-05-25",
    vendor: "TaxPartner LLP",
    createdBy: "Super Admin",
  },
  {
    id: "10",
    description: "Linen replacement — 20 sets",
    amount: 18000,
    category: "SUPPLIES",
    date: "2026-05-12",
    vendor: "Hotel Linen Co.",
    createdBy: "Admin",
  },
];

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
  const [expenses, setExpenses] = useState<Expense[]>(MOCK_EXPENSES);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const toast = useToast();

  // Fetch expenses from API on mount
  useEffect(() => {
    async function loadExpenses() {
      try {
        const res = await fetch("/api/expenses");
        if (res.ok) {
          const json = await res.json();
          const fetched: Expense[] = (json.data ?? []).map((e: {
            id: string;
            description: string;
            amount: unknown;
            category: ExpenseCategory;
            date: Date | string;
            vendor?: string;
            createdBy?: { name?: string | null };
          }) => ({
            id: e.id,
            description: e.description,
            amount: typeof e.amount === "string" ? parseFloat(e.amount) : Number(e.amount),
            category: e.category,
            date: typeof e.date === "string" ? e.date : e.date.toString().slice(0, 10),
            vendor: e.vendor ?? "",
            createdBy: e.createdBy?.name ?? "Super Admin",
          }));
          if (fetched.length > 0) setExpenses(fetched);
        }
      } catch {
        // Keep mock data if API is unavailable
      } finally {
        setIsLoading(false);
      }
    }
    loadExpenses();
  }, []);

  const [form, setForm] = useState({
    description: "",
    amount: "",
    category: "UTILITIES" as ExpenseCategory,
    date: "",
    vendor: "",
  });

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const thisMonth = expenses
    .filter((e) => e.date.startsWith("2026-05"))
    .reduce((s, e) => s + e.amount, 0);

  const categoryBreakdown = Object.entries(
    expenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + e.amount;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const filtered = expenses.filter((e) => {
    if (filterCategory !== "all" && e.category !== filterCategory) return false;
    if (searchQuery && !e.description.toLowerCase().includes(searchQuery.toLowerCase()))
      return false;
    return true;
  });

  function openAdd() {
    setEditing(null);
    setForm({ description: "", amount: "", category: "UTILITIES", date: "", vendor: "" });
    setDialogOpen(true);
  }

  function openEdit(exp: Expense) {
    setEditing(exp);
    setForm({
      description: exp.description,
      amount: String(exp.amount),
      category: exp.category,
      date: exp.date,
      vendor: exp.vendor,
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.description || !form.amount || !form.date) return;

    if (editing) {
      setExpenses((prev) =>
        prev.map((e) =>
          e.id === editing.id
            ? {
                ...e,
                description: form.description,
                amount: Number(form.amount),
                category: form.category,
                date: form.date,
                vendor: form.vendor,
              }
            : e
        )
      );
      toast.success("Expense updated");
    } else {
      setExpenses((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          description: form.description,
          amount: Number(form.amount),
          category: form.category,
          date: form.date,
          vendor: form.vendor,
          createdBy: "Super Admin",
        },
      ]);
      toast.success("Expense added");
    }
    setDialogOpen(false);
  }

  function handleDelete(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    toast.error("Expense deleted");
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Expenses"
        description="Track and manage operational expenses"
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
          label="Total Expenses (MTD)"
          value={formatCurrency(thisMonth)}
          format="currency"
          change={-4.2}
          changeLabel="vs last month"
          icon={TrendingDown}
        />
        <StatCard
          label="Net Profit (MTD)"
          value={formatCurrency(681850 - thisMonth)}
          format="currency"
          change={9.1}
          changeLabel="after expenses"
          icon={DollarSign}
        />
        <StatCard
          label="Expense Count"
          value={expenses.length}
          icon={FileText}
        />
        <StatCard
          label="Avg Expense"
          value={formatCurrency(thisMonth / expenses.length)}
          format="currency"
          icon={FileText}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categoryBreakdown.map(([cat, amount]) => {
              const pct = ((amount / thisMonth) * 100).toFixed(1);
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          CATEGORY_COLORS[cat as ExpenseCategory]
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

        {/* Expense Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-3">
                <CardTitle className="text-base flex-1">All Expenses</CardTitle>
                <Input
                  placeholder="Search expenses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48"
                />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="border border-input bg-white rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">All Categories</option>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((exp) => (
                      <TableRow key={exp.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {exp.description}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              CATEGORY_COLORS[exp.category]
                            }`}
                          >
                            {CATEGORY_LABELS[exp.category]}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{exp.vendor}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {formatDate(exp.date, "short")}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(exp.amount)}
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
            </CardContent>
          </Card>
        </div>
      </div>

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
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value as ExpenseCategory }))
                  }
                  className="mt-1 w-full border border-input bg-white rounded-lg px-3 py-2 text-sm"
                >
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
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
