"use client";

// apps/admin/src/app/(dashboard)/staff/page.tsx
import { useEffect, useState, useCallback } from "react";
import { Plus, Edit, Trash2, Search, Filter, User, Mail, Phone } from "lucide-react";
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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Label,
    StatCard,
    Breadcrumbs,
    BreadcrumbItem,
} from "@the-rooms/ui";
import { formatDate } from "@the-rooms/ui";
import {
    fetchStaff,
    createStaffProfile,
    updateStaffProfile,
    type StaffProfile,
} from "@/lib/api";

const DEPARTMENTS = [
    "FRONT_OFFICE",
    "HOUSEKEEPING",
    "FOOD_BEVERAGE",
    "MAINTENANCE",
    "SECURITY",
    "ADMIN",
];

export default function StaffPage() {
    const [data, setData] = useState<{ staff: StaffProfile[]; total: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        search: "",
        department: "ALL",
    });
    const [showModal, setShowModal] = useState(false);
    const [editingStaff, setEditingStaff] = useState<StaffProfile | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        department: "FRONT_OFFICE",
        role: "",
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (filters.department !== "ALL") params.department = filters.department;
            if (filters.search) params.search = filters.search;

            const result = await fetchStaff(params);
            let filtered = result.staff;
            if (filters.search) {
                const q = filters.search.toLowerCase();
                filtered = filtered.filter(
                    (s) =>
                        s.name.toLowerCase().includes(q) ||
                        s.email.toLowerCase().includes(q) ||
                        s.phone.includes(q)
                );
            }
            setData({ staff: filtered, total: filtered.length });
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSubmit = async () => {
        if (editingStaff) {
            await updateStaffProfile(editingStaff.id, formData);
        } else {
            await createStaffProfile(formData);
        }
        setShowModal(false);
        setEditingStaff(null);
        setFormData({ name: "", email: "", phone: "", department: "FRONT_OFFICE", role: "" });
        fetchData();
    };

    const handleEdit = (staff: StaffProfile) => {
        setEditingStaff(staff);
        setFormData({
            name: staff.name,
            email: staff.email,
            phone: staff.phone,
            department: staff.department,
            role: staff.role,
        });
        setShowModal(true);
    };

    const columns: ColumnDef<StaffProfile, unknown>[] = [
        {
            accessorKey: "name",
            header: "Name",
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                        <User className="h-5 w-5 text-secondary-foreground" />
                    </div>
                    <div>
                        <p className="font-semibold">{row.original.name}</p>
                        <p className="text-xs text-muted-foreground">{row.original.role || "Staff Member"}</p>
                    </div>
                </div>
            ),
        },
        {
            accessorKey: "email",
            header: "Email",
            cell: ({ row }) => (
                <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {row.original.email}
                </div>
            ),
        },
        {
            accessorKey: "phone",
            header: "Phone",
            cell: ({ row }) => (
                <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {row.original.phone}
                </div>
            ),
        },
        {
            accessorKey: "department",
            header: "Department",
            cell: ({ row }) => (
                <Badge variant="secondary">
                    {row.original.department.replace("_", " ")}
                </Badge>
            ),
        },
        {
            accessorKey: "isActive",
            header: "Status",
            cell: ({ row }) => (
                <Badge variant={row.original.isActive ? "success" : "secondary"}>
                    {row.original.isActive ? "Active" : "Inactive"}
                </Badge>
            ),
        },
        {
            accessorKey: "hireDate",
            header: "Hire Date",
            cell: ({ row }) => (
                <span className="text-sm">{formatDate(row.original.hireDate, "short")}</span>
            ),
        },
        {
            id: "actions",
            header: "",
            cell: ({ row }) => (
                <div className="flex items-center gap-1 justify-end">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    function updateFilter(key: string, value: string) {
        setFilters((f) => ({ ...f, [key]: value }));
    }

    const stats = data?.staff ? {
        total: data.staff.length,
        active: data.staff.filter((s) => s.isActive).length,
        byDepartment: DEPARTMENTS.reduce((acc, dept) => {
            acc[dept] = data.staff.filter((s) => s.department === dept).length;
            return acc;
        }, {} as Record<string, number>),
    } : { total: 0, active: 0, byDepartment: {} };

    const breadcrumbItems: BreadcrumbItem[] = [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Staff" },
    ];

    return (
        <div className="space-y-6">
            <Breadcrumbs items={breadcrumbItems} />
            <PageHeader
                title="Staff Management"
                description="Manage staff profiles and departments"
                actions={
                    <Button onClick={() => setShowModal(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Staff
                    </Button>
                }
            />

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total Staff" value={stats.total} icon={User} />
                <StatCard label="Active" value={stats.active} icon={User} />
                {Object.entries(stats.byDepartment).slice(0, 2).map(([dept, count]) => (
                    <StatCard key={dept} label={dept.replace("_", " ")} value={count} icon={User} />
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, email, phone..."
                        value={filters.search}
                        onChange={(e) => updateFilter("search", e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={filters.department} onValueChange={(v) => updateFilter("department", v)}>
                    <SelectTrigger className="w-[180px]">
                        <Filter className="h-4 w-4 mr-1.5 text-muted-foreground" />
                        <span>{filters.department === "ALL" ? "All Departments" : filters.department.replace("_", " ")}</span>
                    </SelectTrigger>
                    <SelectContent>
                        <option value="ALL">All Departments</option>
                        {DEPARTMENTS.map((dept) => (
                            <option key={dept} value={dept}>{dept.replace("_", " ")}</option>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={data?.staff ?? []}
                isLoading={loading}
                pageSize={20}
                filterPlaceholder="Filter staff..."
            />

            {data && (
                <div className="text-sm text-muted-foreground text-center">
                    {data.total} staff members
                </div>
            )}

            {/* Create/Edit Modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingStaff ? "Edit Staff Profile" : "Add Staff Member"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                                placeholder="Enter full name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                                placeholder="email@example.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input
                                value={formData.phone}
                                onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
                                placeholder="+91 98765 43210"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Department</Label>
                            <Select
                                value={formData.department}
                                onValueChange={(v) => setFormData((f) => ({ ...f, department: v }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {DEPARTMENTS.map((dept) => (
                                        <option key={dept} value={dept}>{dept.replace("_", " ")}</option>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Role / Position</Label>
                            <Input
                                value={formData.role}
                                onChange={(e) => setFormData((f) => ({ ...f, role: e.target.value }))}
                                placeholder="e.g., Receptionist, Supervisor"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit}>
                            {editingStaff ? "Update" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}