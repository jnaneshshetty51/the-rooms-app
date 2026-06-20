"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
    Select,
    SelectTrigger,
    SelectContent,
    SelectValue,
    EmptyState,
} from "@the-rooms/ui";
import {
    Building2,
    Plus,
    Search,
    Edit,
    Trash2,
    ChevronRight,
    Loader2,
    Percent,
    Users,
    TrendingUp,
    Phone,
    Mail,
    Globe,
} from "lucide-react";
import { formatDate } from "@the-rooms/ui";
import { LoadingSpinner } from "@the-rooms/ui";

interface Partner {
    id: string;
    name: string;
    code: string;
    email: string | null;
    phone: string | null;
    website: string | null;
    commissionRate: number;
    status: "ACTIVE" | "INACTIVE" | "PENDING";
    totalBookings: number;
    totalRevenue: number;
    createdAt: string;
}

interface PartnerStats {
    totalPartners: number;
    activePartners: number;
    totalRevenue: number;
    totalBookings: number;
}

export default function PartnersPage() {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [stats, setStats] = useState<PartnerStats>({
        totalPartners: 0,
        activePartners: 0,
        totalRevenue: 0,
        totalBookings: 0,
    });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [form, setForm] = useState({
        name: "",
        code: "",
        email: "",
        phone: "",
        website: "",
        commissionRate: "10",
        status: "ACTIVE" as "ACTIVE" | "INACTIVE" | "PENDING",
    });

    const fetchPartners = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            if (filterStatus !== "all") params.set("status", filterStatus);

            const res = await fetch(`/api/partners?${params}`);
            if (res.ok) {
                const data = await res.json();
                setPartners(data.partners || []);
                setStats(data.stats || {
                    totalPartners: 0,
                    activePartners: 0,
                    totalRevenue: 0,
                    totalBookings: 0,
                });
            }
        } catch (err) {
            console.error("Failed to fetch partners:", err);
        } finally {
            setLoading(false);
        }
    }, [search, filterStatus]);

    useEffect(() => {
        fetchPartners();
    }, [fetchPartners]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const url = editingPartner ? `/api/partners/${editingPartner.id}` : "/api/partners";
            const method = editingPartner ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    commissionRate: parseFloat(form.commissionRate),
                }),
            });

            if (res.ok) {
                setShowAddDialog(false);
                setEditingPartner(null);
                resetForm();
                fetchPartners();
            }
        } catch (err) {
            console.error("Failed to save partner:", err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this partner?")) return;

        try {
            const res = await fetch(`/api/partners/${id}`, { method: "DELETE" });
            if (res.ok) {
                fetchPartners();
            }
        } catch (err) {
            console.error("Failed to delete partner:", err);
        }
    };

    const handleEdit = (partner: Partner) => {
        setEditingPartner(partner);
        setForm({
            name: partner.name,
            code: partner.code,
            email: partner.email || "",
            phone: partner.phone || "",
            website: partner.website || "",
            commissionRate: partner.commissionRate.toString(),
            status: partner.status,
        });
        setShowAddDialog(true);
    };

    const resetForm = () => {
        setForm({
            name: "",
            code: "",
            email: "",
            phone: "",
            website: "",
            commissionRate: "10",
            status: "ACTIVE",
        });
    };

    const openAddDialog = () => {
        resetForm();
        setEditingPartner(null);
        setShowAddDialog(true);
    };

    const filteredPartners = partners;

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6">
            <PageHeader
                title="Partner Hotels"
                description="Manage referral partner hotels and commission tracking"
                actions={
                    <Button onClick={openAddDialog} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Partner
                    </Button>
                }
            />

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Building2 className="h-5 w-5 text-[#E17055]" />
                            <div>
                                <p className="text-lg font-bold">{stats.totalPartners}</p>
                                <p className="text-xs text-muted-foreground">Total Partners</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="h-5 w-5 text-green-500" />
                            <div>
                                <p className="text-lg font-bold">{stats.activePartners}</p>
                                <p className="text-xs text-muted-foreground">Active Partners</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Users className="h-5 w-5 text-blue-500" />
                            <div>
                                <p className="text-lg font-bold">{stats.totalBookings}</p>
                                <p className="text-xs text-muted-foreground">Total Referrals</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Percent className="h-5 w-5 text-amber-500" />
                            <div>
                                <p className="text-lg font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">Partner Revenue</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search partners..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <option value="all">All Status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                        <option value="PENDING">Pending</option>
                    </SelectContent>
                </Select>
            </div>

            {/* Partners List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <LoadingSpinner />
                </div>
            ) : filteredPartners.length === 0 ? (
                <EmptyState
                    title="No partners found"
                    description={search || filterStatus !== "all" ? "Try adjusting your filters" : "Add your first partner hotel to get started"}
                    icon={<Building2 className="h-12 w-12" />}
                    action={!search && filterStatus === "all" ? { label: "Add Partner", onClick: openAddDialog } : undefined}
                />
            ) : (
                <div className="grid gap-4">
                    {filteredPartners.map((partner) => (
                        <Card key={partner.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-[#E17055]/10 flex items-center justify-center">
                                            <Building2 className="h-6 w-6 text-[#E17055]" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-gray-900">{partner.name}</h3>
                                                <Badge
                                                    variant={
                                                        partner.status === "ACTIVE" ? "default" :
                                                            partner.status === "PENDING" ? "secondary" : "outline"
                                                    }
                                                    className="text-[10px]"
                                                >
                                                    {partner.status}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-gray-500 font-mono">{partner.code}</p>
                                            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                                                {partner.email && (
                                                    <span className="flex items-center gap-1">
                                                        <Mail className="h-3 w-3" /> {partner.email}
                                                    </span>
                                                )}
                                                {partner.phone && (
                                                    <span className="flex items-center gap-1">
                                                        <Phone className="h-3 w-3" /> {partner.phone}
                                                    </span>
                                                )}
                                                {partner.website && (
                                                    <span className="flex items-center gap-1">
                                                        <Globe className="h-3 w-3" /> {partner.website}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        {/* Stats */}
                                        <div className="hidden md:flex items-center gap-6 text-center">
                                            <div>
                                                <p className="text-sm font-bold">{partner.totalBookings}</p>
                                                <p className="text-[10px] text-gray-500">Bookings</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold">₹{partner.totalRevenue.toLocaleString()}</p>
                                                <p className="text-[10px] text-gray-500">Revenue</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold">{partner.commissionRate}%</p>
                                                <p className="text-[10px] text-gray-500">Commission</p>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handleEdit(partner)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                onClick={() => handleDelete(partner.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                            <Link href={`/partners/${partner.id}`}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </div>

                                {/* Mobile Stats */}
                                <div className="flex md:hidden items-center justify-between mt-3 pt-3 border-t">
                                    <div className="flex items-center gap-4 text-center">
                                        <div>
                                            <p className="text-sm font-bold">{partner.totalBookings}</p>
                                            <p className="text-[10px] text-gray-500">Bookings</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">₹{partner.totalRevenue.toLocaleString()}</p>
                                            <p className="text-[10px] text-gray-500">Revenue</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">{partner.commissionRate}%</p>
                                            <p className="text-[10px] text-gray-500">Commission</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editingPartner ? "Edit Partner" : "Add New Partner"}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Hotel Name *</label>
                            <Input
                                required
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="Partner Hotel Name"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Partner Code *</label>
                            <Input
                                required
                                value={form.code}
                                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
                                placeholder="e.g. PARTNER001"
                                className="font-mono"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Email</label>
                                <Input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    placeholder="partner@hotel.com"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Phone</label>
                                <Input
                                    type="tel"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    placeholder="+91 98765 43210"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Website</label>
                            <Input
                                value={form.website}
                                onChange={(e) => setForm({ ...form, website: e.target.value })}
                                placeholder="https://partner-hotel.com"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Commission Rate (%)</label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    required
                                    value={form.commissionRate}
                                    onChange={(e) => setForm({ ...form, commissionRate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Status</label>
                                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <option value="ACTIVE">Active</option>
                                        <option value="INACTIVE">Inactive</option>
                                        <option value="PENDING">Pending</option>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter className="pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setShowAddDialog(false);
                                    setEditingPartner(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting ? (
                                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                                ) : (
                                    editingPartner ? "Save Changes" : "Add Partner"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
