"use client";

// apps/admin/src/app/(dashboard)/discounts/page.tsx
import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Tag, Percent, ToggleLeft, ToggleRight } from "lucide-react";
import { PageHeader, Button, Dialog, Input, Select, SelectTrigger, SelectContent, SelectValue, Badge, DataTable, type ColumnDef } from "@the-rooms/ui";
import { formatDate, formatCurrency } from "@the-rooms/ui";

interface Discount {
  id: string;
  name: string;
  code: string;
  type: string;
  discountPercent: string;
  minDays: number;
  maxDays: number | null;
  validFrom: string | null;
  validTo: string | null;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  CORPORATE: "Corporate",
  STUDENT: "Student",
  SEASONAL: "Seasonal",
  LOYALTY: "Loyalty",
  EXTENDED_STAY: "Extended Stay",
  CUSTOM: "Custom",
};

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Discount | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    code: "",
    type: "CORPORATE",
    discountPercent: "10",
    minDays: "1",
    maxDays: "",
    validFrom: "",
    validTo: "",
    maxUses: "",
    isActive: true,
  });

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/discounts");
    const data = await res.json();
    setDiscounts(data.discounts ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openEdit(d: Discount) {
    setEditing(d);
    setForm({
      name: d.name,
      code: d.code,
      type: d.type,
      discountPercent: String(d.discountPercent),
      minDays: String(d.minDays),
      maxDays: d.maxDays ? String(d.maxDays) : "",
      validFrom: d.validFrom ? d.validFrom.split("T")[0] : "",
      validTo: d.validTo ? d.validTo.split("T")[0] : "",
      maxUses: d.maxUses ? String(d.maxUses) : "",
      isActive: d.isActive,
    });
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        ...form,
        discountPercent: parseFloat(form.discountPercent),
        minDays: parseInt(form.minDays) || 1,
        maxDays: form.maxDays ? parseInt(form.maxDays) : null,
        validFrom: form.validFrom || null,
        validTo: form.validTo || null,
        maxUses: form.maxUses ? parseInt(form.maxUses) : null,
      };
      if (editing) body.id = editing.id;

      const res = await fetch("/api/discounts", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowModal(false);
        setEditing(null);
        setForm({ name: "", code: "", type: "CORPORATE", discountPercent: "10", minDays: "1", maxDays: "", validFrom: "", validTo: "", maxUses: "", isActive: true });
        fetchData();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this discount code?")) return;
    await fetch(`/api/discounts?id=${id}`, { method: "DELETE" });
    fetchData();
  }

  async function handleToggleActive(d: Discount) {
    await fetch("/api/discounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: d.id, isActive: !d.isActive }),
    });
    fetchData();
  }

  const columns: ColumnDef<Discount, unknown>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.name}</p>
          <p className="font-mono text-xs text-muted-foreground">{row.original.code}</p>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs">{TYPE_LABELS[row.original.type] ?? row.original.type}</Badge>
      ),
    },
    {
      accessorKey: "discountPercent",
      header: "Discount",
      cell: ({ row }) => (
        <span className="font-bold text-success text-sm flex items-center gap-1">
          <Percent className="h-3 w-3" />
          {row.original.discountPercent}%
        </span>
      ),
    },
    {
      accessorKey: "minDays",
      header: "Min Nights",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.minDays}{row.original.maxDays ? ` – ${row.original.maxDays}` : "+"}</span>
      ),
    },
    {
      accessorKey: "validFrom",
      header: "Valid Period",
      cell: ({ row }) => {
        if (!row.original.validFrom) return <span className="text-xs text-muted-foreground">No expiry</span>;
        return (
          <span className="text-xs">
            {formatDate(row.original.validFrom, "short")}
            {row.original.validTo ? ` → ${formatDate(row.original.validTo, "short")}` : " → Open"}
          </span>
        );
      },
    },
    {
      accessorKey: "usedCount",
      header: "Used",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.usedCount}{row.original.maxUses ? ` / ${row.original.maxUses}` : ""}</span>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "success" : "secondary"} className="text-xs">
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleActive(row.original)}>
            {row.original.isActive ? <ToggleRight className="h-4 w-4 text-success" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row.original)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(row.original.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discounts & Pricing"
        description="Manage discount rules, corporate codes, and promotional offers"
        actions={
          <Button onClick={() => {
            setEditing(null);
            setForm({ name: "", code: "", type: "CORPORATE", discountPercent: "10", minDays: "1", maxDays: "", validFrom: "", validTo: "", maxUses: "", isActive: true });
            setShowModal(true);
          }}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Discount
          </Button>
        }
      />

      <DataTable columns={columns} data={discounts} isLoading={loading} pageSize={15} />

      {showModal && (
        <Dialog open={showModal} onOpenChange={(v) => { setShowModal(v); if (!v) setEditing(null); }}>
          <div className="space-y-4">
            <h2 className="font-heading text-xl font-bold">{editing ? "Edit Discount" : "New Discount"}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Name *</label>
                  <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Corporate 10%" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Code *</label>
                  <Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="CORP10" className="font-mono" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Type *</label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <option value="CORPORATE">Corporate</option>
                      <option value="STUDENT">Student</option>
                      <option value="SEASONAL">Seasonal</option>
                      <option value="LOYALTY">Loyalty</option>
                      <option value="EXTENDED_STAY">Extended Stay</option>
                      <option value="CUSTOM">Custom</option>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Discount % *</label>
                  <Input type="number" min="1" max="100" required value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Min Nights</label>
                  <Input type="number" min="1" value={form.minDays} onChange={(e) => setForm({ ...form, minDays: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Max Nights</label>
                  <Input type="number" min="1" value={form.maxDays} onChange={(e) => setForm({ ...form, maxDays: e.target.value })} placeholder="Optional" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Valid From</label>
                  <Input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Valid To</label>
                  <Input type="date" value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Max Uses (optional)</label>
                <Input type="number" min="1" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} placeholder="Unlimited if blank" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => { setShowModal(false); setEditing(null); }} className="flex-1">Cancel</Button>
                <Button type="submit" disabled={submitting} className="flex-1">{submitting ? "Saving…" : editing ? "Update" : "Create"}</Button>
              </div>
            </form>
          </div>
        </Dialog>
      )}
    </div>
  );
}
