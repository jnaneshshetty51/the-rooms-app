"use client";

// apps/admin/src/app/(dashboard)/discounts/page.tsx
import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Tag, Percent, ToggleLeft, ToggleRight, Check, X, Info } from "lucide-react";
import { PageHeader, Button, Dialog, Input, Select, SelectTrigger, SelectContent, SelectValue, Badge, DataTable, type ColumnDef, useToast } from "@the-rooms/ui";
import { formatDate, formatCurrency } from "@the-rooms/ui";

interface DiscountCode {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: "PERCENTAGE" | "FIXED_AMOUNT";
  value: string;
  validFrom: string | null;
  validUntil: string | null;
  maxUses: number | null;
  currentUses: number;
  maxUsesPerUser: number | null;
  minNights: number;
  maxNights: number | null;
  minBookingValue: string | null;
  maxBookingValue: string | null;
  applicableRoomTypes: string[];
  isActive: boolean;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  PERCENTAGE: "Percentage",
  FIXED_AMOUNT: "Fixed Amount",
};

const ROOM_TYPE_OPTIONS = [
  { value: "STUDIO", label: "Studio" },
  { value: "PREMIUM", label: "Premium" },
];

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<DiscountCode | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    type: "PERCENTAGE" as "PERCENTAGE" | "FIXED_AMOUNT",
    value: "10",
    validFrom: "",
    validUntil: "",
    maxUses: "",
    maxUsesPerUser: "",
    minNights: "1",
    maxNights: "",
    minBookingValue: "",
    maxBookingValue: "",
    applicableRoomTypes: [] as string[],
    isActive: true,
  });

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/discounts");
    const data = await res.json();
    setDiscounts(data.discounts ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openEdit(d: DiscountCode) {
    setEditing(d);
    setForm({
      code: d.code,
      name: d.name,
      description: d.description ?? "",
      type: d.type,
      value: String(d.value),
      validFrom: d.validFrom ? d.validFrom.split("T")[0] : "",
      validUntil: d.validUntil ? d.validUntil.split("T")[0] : "",
      maxUses: d.maxUses ? String(d.maxUses) : "",
      maxUsesPerUser: d.maxUsesPerUser ? String(d.maxUsesPerUser) : "",
      minNights: String(d.minNights),
      maxNights: d.maxNights ? String(d.maxNights) : "",
      minBookingValue: d.minBookingValue ? String(d.minBookingValue) : "",
      maxBookingValue: d.maxBookingValue ? String(d.maxBookingValue) : "",
      applicableRoomTypes: d.applicableRoomTypes ?? [],
      isActive: d.isActive,
    });
    setShowModal(true);
  }

  function toggleRoomType(roomType: string) {
    setForm((f) => ({
      ...f,
      applicableRoomTypes: f.applicableRoomTypes.includes(roomType)
        ? f.applicableRoomTypes.filter((t) => t !== roomType)
        : [...f.applicableRoomTypes, roomType],
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        code: form.code,
        name: form.name,
        description: form.description || null,
        type: form.type,
        value: parseFloat(form.value),
        validFrom: form.validFrom || null,
        validUntil: form.validUntil || null,
        maxUses: form.maxUses ? parseInt(form.maxUses) : null,
        maxUsesPerUser: form.maxUsesPerUser ? parseInt(form.maxUsesPerUser) : null,
        minNights: parseInt(form.minNights) || 1,
        maxNights: form.maxNights ? parseInt(form.maxNights) : null,
        minBookingValue: form.minBookingValue ? parseFloat(form.minBookingValue) : null,
        maxBookingValue: form.maxBookingValue ? parseFloat(form.maxBookingValue) : null,
        applicableRoomTypes: form.applicableRoomTypes,
        isActive: form.isActive,
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
        setForm({
          code: "",
          name: "",
          description: "",
          type: "PERCENTAGE",
          value: "10",
          validFrom: "",
          validUntil: "",
          maxUses: "",
          maxUsesPerUser: "",
          minNights: "1",
          maxNights: "",
          minBookingValue: "",
          maxBookingValue: "",
          applicableRoomTypes: [],
          isActive: true,
        });
        fetchData();
        toast({ title: "Success", message: `Discount code successfully ${editing ? "updated" : "created"}.`, type: "success" });
      } else {
        const err = await res.json();
        toast({ title: "Error", message: err.error || "Failed to save discount code.", type: "error" });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deactivate this discount code?")) return;
    const res = await fetch(`/api/discounts?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchData();
      toast({ title: "Deactivated", message: "Discount code has been deactivated.", type: "success" });
    } else {
      toast({ title: "Error", message: "Failed to deactivate discount code.", type: "error" });
    }
  }

  async function handleToggleActive(d: DiscountCode) {
    const res = await fetch("/api/discounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: d.id, isActive: !d.isActive }),
    });
    if (res.ok) {
      fetchData();
      toast({ title: "Status Updated", message: `Discount code is now ${!d.isActive ? "active" : "inactive"}.`, type: "success" });
    } else {
      toast({ title: "Error", message: "Failed to update discount status.", type: "error" });
    }
  }

  const columns: ColumnDef<DiscountCode, unknown>[] = [
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => (
        <div>
          <p className="font-mono font-bold text-sm">{row.original.code}</p>
          <p className="text-xs text-muted-foreground">{row.original.name}</p>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs">
          {TYPE_LABELS[row.original.type] ?? row.original.type}
        </Badge>
      ),
    },
    {
      accessorKey: "value",
      header: "Value",
      cell: ({ row }) => (
        <span className="font-bold text-success text-sm flex items-center gap-1">
          {row.original.type === "PERCENTAGE" ? (
            <>
              <Percent className="h-3 w-3" />
              {row.original.value}%
            </>
          ) : (
            <>₹{Number(row.original.value).toLocaleString("en-IN")}</>
          )}
        </span>
      ),
    },
    {
      accessorKey: "minNights",
      header: "Nights",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.minNights}
          {row.original.maxNights ? ` – ${row.original.maxNights}` : "+"}
        </span>
      ),
    },
    {
      accessorKey: "validFrom",
      header: "Valid Period",
      cell: ({ row }) => {
        if (!row.original.validFrom) return <span className="text-xs text-muted-foreground">Always valid</span>;
        return (
          <span className="text-xs">
            {formatDate(row.original.validFrom, "short")}
            {row.original.validUntil ? ` → ${formatDate(row.original.validUntil, "short")}` : " → Open"}
          </span>
        );
      },
    },
    {
      accessorKey: "currentUses",
      header: "Usage",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.currentUses}
          {row.original.maxUses ? ` / ${row.original.maxUses}` : " / ∞"}
        </span>
      ),
    },
    {
      accessorKey: "applicableRoomTypes",
      header: "Rooms",
      cell: ({ row }) => {
        if (!row.original.applicableRoomTypes || row.original.applicableRoomTypes.length === 0) {
          return <span className="text-xs text-muted-foreground">All</span>;
        }
        return (
          <div className="flex gap-1">
            {row.original.applicableRoomTypes.map((t) => (
              <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
            ))}
          </div>
        );
      },
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
        title="Discount Codes"
        description="Manage discount codes, promotional offers, and special pricing"
        actions={
          <Button onClick={() => {
            setEditing(null);
            setForm({
              code: "",
              name: "",
              description: "",
              type: "PERCENTAGE",
              value: "10",
              validFrom: "",
              validUntil: "",
              maxUses: "",
              maxUsesPerUser: "",
              minNights: "1",
              maxNights: "",
              minBookingValue: "",
              maxBookingValue: "",
              applicableRoomTypes: [],
              isActive: true,
            });
            setShowModal(true);
          }}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Discount Code
          </Button>
        }
      />

      <DataTable columns={columns} data={discounts} isLoading={loading} pageSize={15} />

      {showModal && (
        <Dialog open={showModal} onOpenChange={(v) => { setShowModal(v); if (!v) setEditing(null); }}>
          <div className="space-y-4">
            <h2 className="font-heading text-xl font-bold">{editing ? "Edit Discount Code" : "New Discount Code"}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Code *</label>
                  <Input
                    required
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="SUMMER20"
                    className="font-mono"
                    disabled={!!editing}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Name *</label>
                  <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Summer Special 20% Off" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Type *</label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as "PERCENTAGE" | "FIXED_AMOUNT" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <option value="PERCENTAGE">Percentage (%)</option>
                      <option value="FIXED_AMOUNT">Fixed Amount (₹)</option>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Value * ({form.type === "PERCENTAGE" ? "%" : "₹"})
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max={form.type === "PERCENTAGE" ? "100" : undefined}
                    step={form.type === "PERCENTAGE" ? "0.1" : "1"}
                    required
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description for this discount" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Valid From</label>
                  <Input type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Valid Until</label>
                  <Input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Min Nights</label>
                  <Input type="number" min="1" value={form.minNights} onChange={(e) => setForm({ ...form, minNights: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Max Nights</label>
                  <Input type="number" min="1" value={form.maxNights} onChange={(e) => setForm({ ...form, maxNights: e.target.value })} placeholder="Optional" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Min Booking Value (₹)</label>
                  <Input type="number" min="0" value={form.minBookingValue} onChange={(e) => setForm({ ...form, minBookingValue: e.target.value })} placeholder="Optional" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Max Booking Value (₹)</label>
                  <Input type="number" min="0" value={form.maxBookingValue} onChange={(e) => setForm({ ...form, maxBookingValue: e.target.value })} placeholder="Optional" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Max Total Uses</label>
                  <Input type="number" min="1" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} placeholder="Unlimited if blank" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Max Uses Per User</label>
                  <Input type="number" min="1" value={form.maxUsesPerUser} onChange={(e) => setForm({ ...form, maxUsesPerUser: e.target.value })} placeholder="Unlimited if blank" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Applicable Room Types</label>
                <div className="flex gap-2 flex-wrap">
                  {ROOM_TYPE_OPTIONS.map((rt) => (
                    <button
                      key={rt.value}
                      type="button"
                      onClick={() => toggleRoomType(rt.value)}
                      className={`flex items-center gap-1.5 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${form.applicableRoomTypes.includes(rt.value)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                    >
                      {form.applicableRoomTypes.includes(rt.value) ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <div className="h-4 w-4" />
                      )}
                      {rt.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Leave empty to apply to all room types</p>
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
