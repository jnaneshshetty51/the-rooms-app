"use client";

import { useState, useEffect } from "react";
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  StatCard,
  Avatar,
  AvatarFallback,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Switch,
  LoadingSpinner,
} from "@the-rooms/ui";
import {
  Plus,
  Trash2,
  Edit,
  Shield,
  UserCheck,
  UserX,
  Users,
  KeyRound,
  Clock,
} from "lucide-react";
import { formatDate, getInitials } from "@the-rooms/ui";
import { useToast } from "@the-rooms/ui";

type UserRole = "SUPER_ADMIN" | "ADMIN" | "FRONT_OFFICE";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  attempts: number;
}

// Removed MOCK_USERS for live data

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  FRONT_OFFICE: "Front Office",
};

const ROLE_COLORS: Record<UserRole, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-700",
  ADMIN: "bg-amber-100 text-amber-700",
  FRONT_OFFICE: "bg-blue-100 text-blue-700",
};

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const toast = useToast();

  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "ADMIN" as UserRole,
    password: "",
  });

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const json = await res.json();
        if (json.data) setUsers(json.data);
      }
    } catch {
      // error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const activeCount = users.filter((u) => u.isActive).length;
  const adminCount = users.filter((u) => u.role === "ADMIN" && u.isActive).length;
  const lockedCount = users.filter((u) => u.attempts >= 5).length;

  const filtered = users;

  function openAdd() {
    setEditing(null);
    setForm({ name: "", email: "", role: "ADMIN", password: "" });
    setDialogOpen(true);
  }

  function openEdit(user: AdminUser) {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      password: "",
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!form.name || !form.email) return;
    if (!editing && !form.password) return;

    try {
      const res = await fetch("/api/users", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editing
            ? { id: editing.id, name: form.name, email: form.email, role: form.role }
            : { name: form.name, email: form.email, role: form.role, password: form.password }
        ),
      });
      
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save user");
        return;
      }
      
      toast.success(`User ${editing ? "updated" : "created"} successfully`);
      setDialogOpen(false);
      loadUsers();
    } catch {
      toast.error("Failed to save user");
    }
  }

  async function toggleActive(id: string) {
    const user = users.find((u) => u.id === id);
    if (!user) return;
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !user.isActive }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(user.isActive ? "User deactivated" : "User activated");
      loadUsers();
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete user");
        return;
      }
      setShowDeleteDialog(null);
      toast.success("User deleted");
      loadUsers();
    } catch {
      toast.error("Failed to delete user");
    }
  }

  async function resetPassword(id: string) {
    try {
      const res = await fetch("/api/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to reset password");
        return;
      }
      toast.success("Reset email sent", data.data?.message ?? "User will receive a password reset link.");
    } catch {
      toast.error("Failed to send reset email");
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Staff & Users"
        description="Manage Admin and Front Office user accounts"
        actions={
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={users.length} icon={Users} />
        <StatCard label="Active Users" value={activeCount} icon={UserCheck} />
        <StatCard label="Admin Accounts" value={adminCount} icon={Shield} />
        <StatCard label="Locked Accounts" value={lockedCount} icon={UserX} />
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-[#E17055] text-white text-xs">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          ROLE_COLORS[user.role]
                        }`}
                      >
                        {ROLE_LABELS[user.role]}
                      </span>
                    </TableCell>
                    <TableCell>
                      {user.attempts >= 5 ? (
                        <Badge variant="destructive" className="text-xs">
                          Locked
                        </Badge>
                      ) : user.isActive ? (
                        <Badge variant="success" className="text-xs">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {user.lastLogin ? formatDate(user.lastLogin, "short") : "Never"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(user.createdAt, "short")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(user)}
                          title="Edit user"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => resetPassword(user.id)}
                          title="Reset password"
                        >
                          <KeyRound className="h-3 w-3" />
                        </Button>
                        {user.role !== "SUPER_ADMIN" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => toggleActive(user.id)}
                            title={user.isActive ? "Deactivate" : "Activate"}
                          >
                            {user.isActive ? (
                              <UserX className="h-3 w-3 text-destructive" />
                            ) : (
                              <UserCheck className="h-3 w-3 text-green-500" />
                            )}
                          </Button>
                        )}
                        {user.role !== "SUPER_ADMIN" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setShowDeleteDialog(user.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit User" : "Add New User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Full Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Enter full name"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Email Address *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="user@therooms.in"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Role *</Label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                className="mt-1 w-full border border-input bg-white rounded-lg px-3 py-2 text-sm"
              >
                <option value="ADMIN">Admin — Property operations</option>
                <option value="FRONT_OFFICE">Front Office — Day-to-day ops</option>
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Super Admin accounts can only be created by existing Super Admins.
              </p>
            </div>
            {!editing && (
              <div>
                <Label>Initial Password *</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Temporary password (must be changed on first login)"
                  className="mt-1"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editing ? "Update User" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete this user? This action cannot be undone and all audit
            logs will be preserved.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => showDeleteDialog && handleDelete(showDeleteDialog)}
            >
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
