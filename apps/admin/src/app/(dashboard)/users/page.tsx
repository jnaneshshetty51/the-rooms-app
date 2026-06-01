"use client";

// apps/admin/src/app/(dashboard)/users/page.tsx
import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, UserX, UserCheck, Shield } from "lucide-react";
import { PageHeader, Button, DataTable, Dialog, Input, Badge, type ColumnDef } from "@the-rooms/ui";
import { formatDate } from "@the-rooms/ui";

interface FOUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<FOUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<FOUser | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    pin: "",
  });

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const columns: ColumnDef<FOUser, unknown>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
            {row.original.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-sm">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.email}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs">
          <Shield className="h-3 w-3 mr-1" />
          {row.original.role.replace("_", " ")}
        </Badge>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "success" : "destructive"} className="text-xs">
          {row.original.isActive ? "Active" : "Blocked"}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.createdAt, "short")}</span>,
    },
    {
      accessorKey: "lastLogin",
      header: "Last Login",
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.lastLogin ? formatDate(row.original.lastLogin, "short") : "Never"}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingUser(row.original); setForm({ name: row.original.name, email: row.original.email, password: "", pin: "" }); setShowAddModal(true); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${row.original.isActive ? "text-destructive hover:text-destructive" : "text-success hover:text-success"}`}
            onClick={() => handleToggleActive(row.original)}
          >
            {row.original.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
          </Button>
        </div>
      ),
    },
  ];

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {};
      if (editingUser) {
        body.id = editingUser.id;
        body.name = form.name;
        body.email = form.email;
        if (form.password) body.password = form.password;
        if (form.pin !== "") body.pin = form.pin;
        await fetch("/api/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      } else {
        await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      setShowAddModal(false);
      setEditingUser(null);
      setForm({ name: "", email: "", password: "", pin: "" });
      fetchUsers();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(user: FOUser) {
    const action = user.isActive ? "block" : "activate";
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${user.name}?`)) return;
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, isActive: !user.isActive }),
    });
    fetchUsers();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Front Office Users"
        description="Manage front desk staff accounts and PINs"
        actions={
          <Button onClick={() => { setShowAddModal(true); setEditingUser(null); setForm({ name: "", email: "", password: "", pin: "" }); }}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add FO User
          </Button>
        }
      />

      <DataTable columns={columns} data={users} isLoading={loading} pageSize={15} />

      {showAddModal && (
        <Dialog open={showAddModal} onOpenChange={(v) => { setShowAddModal(v); if (!v) { setEditingUser(null); } }}>
          <div className="space-y-4">
            <h2 className="font-heading text-xl font-bold">{editingUser ? `Edit: ${editingUser.name}` : "Add Front Office User"}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Full Name *</label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Email *</label>
                <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@therooms.in" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{editingUser ? "New Password (leave blank to keep)" : "Password *"}</label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editingUser ? "••••••••" : "Min. 8 characters"} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">PIN (4–6 digits, optional)</label>
                <Input type="password" maxLength={6} pattern="[0-9]*" inputMode="numeric" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "") })} placeholder="e.g. 1234" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => { setShowAddModal(false); setEditingUser(null); }} className="flex-1">Cancel</Button>
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? "Saving…" : editingUser ? "Update User" : "Create User"}
                </Button>
              </div>
            </form>
          </div>
        </Dialog>
      )}
    </div>
  );
}
