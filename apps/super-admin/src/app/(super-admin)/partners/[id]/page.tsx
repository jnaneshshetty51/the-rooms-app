"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@the-rooms/ui";
import {
    Building2,
    Edit,
    Trash2,
    ArrowLeft,
    Mail,
    Phone,
    Globe,
    Percent,
    Calendar,
    Loader2,
    TrendingUp,
    Users,
    Bed,
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
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    totalBookings: number;
    totalRevenue: number;
    pendingCommission: number;
    paidCommission: number;
    createdAt: string;
    updatedAt: string;
}

interface ReferralBooking {
    id: string;
    bookingNumber: string;
    guestName: string;
    roomNumber: string;
    checkIn: string;
    checkOut: string;
    totalAmount: number;
    commissionAmount: number;
    commissionStatus: "PENDING" | "PAID" | "INVOICED";
    createdAt: string;
}

interface MonthlyStats {
    month: string;
    bookings: number;
    revenue: number;
    commission: number;
}

export default function PartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [partner, setPartner] = useState<Partner | null>(null);
    const [bookings, setBookings] = useState<ReferralBooking[]>([]);
    const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState({
        name: "",
        code: "",
        email: "",
        phone: "",
        website: "",
        address: "",
        city: "",
        state: "",
        country: "",
        commissionRate: "10",
        status: "ACTIVE" as "ACTIVE" | "INACTIVE" | "PENDING",
    });

    useEffect(() => {
        fetchPartnerData();
    }, [id]);

    const fetchPartnerData = async () => {
        try {
            const [partnerRes, bookingsRes, statsRes] = await Promise.all([
                fetch(`/api/partners/${id}`),
                fetch(`/api/partners/${id}/bookings`),
                fetch(`/api/partners/${id}/stats`),
            ]);

            if (partnerRes.ok) {
                const data = await partnerRes.json();
                setPartner(data.partner);
                setForm({
                    name: data.partner.name,
                    code: data.partner.code,
                    email: data.partner.email || "",
                    phone: data.partner.phone || "",
                    website: data.partner.website || "",
                    address: data.partner.address || "",
                    city: data.partner.city || "",
                    state: data.partner.state || "",
                    country: data.partner.country || "",
                    commissionRate: data.partner.commissionRate.toString(),
                    status: data.partner.status,
                });
            }

            if (bookingsRes.ok) {
                const data = await bookingsRes.json();
                setBookings(data.bookings || []);
            }

            if (statsRes.ok) {
                const data = await statsRes.json();
                setMonthlyStats(data.monthly || []);
            }
        } catch (err) {
            console.error("Failed to fetch partner data:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const res = await fetch(`/api/partners/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    commissionRate: parseFloat(form.commissionRate),
                }),
            });

            if (res.ok) {
                setShowEditDialog(false);
                fetchPartnerData();
            }
        } catch (err) {
            console.error("Failed to update partner:", err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this partner? This action cannot be undone.")) return;

        try {
            const res = await fetch(`/api/partners/${id}`, { method: "DELETE" });
            if (res.ok) {
                router.push("/partners");
            }
        } catch (err) {
            console.error("Failed to delete partner:", err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <LoadingSpinner />
            </div>
        );
    }

    if (!partner) {
        return (
            <div className="text-center py-12">
                <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Partner not found</p>
                <Link href="/partners">
                    <Button variant="outline" className="mt-4">Back to Partners</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/partners">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-[#E17055]/10 flex items-center justify-center">
                            <Building2 className="h-7 w-7 text-[#E17055]" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold text-gray-900">{partner.name}</h1>
                                <Badge
                                    variant={
                                        partner.status === "ACTIVE" ? "default" :
                                            partner.status === "PENDING" ? "secondary" : "outline"
                                    }
                                >
                                    {partner.status}
                                </Badge>
                            </div>
                            <p className="text-sm text-gray-500 font-mono">{partner.code}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setShowEditDialog(true)} className="gap-2">
                        <Edit className="h-4 w-4" /> Edit
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} className="gap-2">
                        <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Users className="h-5 w-5 text-blue-500" />
                            <div>
                                <p className="text-lg font-bold">{partner.totalBookings}</p>
                                <p className="text-xs text-muted-foreground">Total Referrals</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="h-5 w-5 text-green-500" />
                            <div>
                                <p className="text-lg font-bold">₹{partner.totalRevenue.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">Total Revenue</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Percent className="h-5 w-5 text-amber-500" />
                            <div>
                                <p className="text-lg font-bold">₹{partner.pendingCommission.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">Pending Commission</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Bed className="h-5 w-5 text-[#E17055]" />
                            <div>
                                <p className="text-lg font-bold">₹{partner.paidCommission.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">Paid Commission</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Contact Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Contact Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {partner.email && (
                            <div className="flex items-center gap-3">
                                <Mail className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-xs text-gray-500">Email</p>
                                    <p className="text-sm font-medium">{partner.email}</p>
                                </div>
                            </div>
                        )}
                        {partner.phone && (
                            <div className="flex items-center gap-3">
                                <Phone className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-xs text-gray-500">Phone</p>
                                    <p className="text-sm font-medium">{partner.phone}</p>
                                </div>
                            </div>
                        )}
                        {partner.website && (
                            <div className="flex items-center gap-3">
                                <Globe className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-xs text-gray-500">Website</p>
                                    <p className="text-sm font-medium">{partner.website}</p>
                                </div>
                            </div>
                        )}
                    </div>
                    {(partner.address || partner.city || partner.state) && (
                        <div className="mt-4 pt-4 border-t">
                            <p className="text-xs text-gray-500 mb-1">Address</p>
                            <p className="text-sm">
                                {[partner.address, partner.city, partner.state, partner.country].filter(Boolean).join(", ")}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Referral Bookings */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Referral Bookings</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {bookings.length === 0 ? (
                        <div className="text-center py-8">
                            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No referrals yet</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Booking</TableHead>
                                        <TableHead>Guest</TableHead>
                                        <TableHead>Room</TableHead>
                                        <TableHead>Dates</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Commission</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bookings.map((booking) => (
                                        <TableRow key={booking.id}>
                                            <TableCell className="font-mono text-sm">{booking.bookingNumber}</TableCell>
                                            <TableCell>{booking.guestName}</TableCell>
                                            <TableCell>{booking.roomNumber}</TableCell>
                                            <TableCell className="text-sm">
                                                {formatDate(booking.checkIn, "short")} - {formatDate(booking.checkOut, "short")}
                                            </TableCell>
                                            <TableCell>₹{booking.totalAmount.toLocaleString()}</TableCell>
                                            <TableCell className="text-amber-600">₹{booking.commissionAmount.toLocaleString()}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        booking.commissionStatus === "PAID" ? "default" :
                                                            booking.commissionStatus === "INVOICED" ? "secondary" : "outline"
                                                    }
                                                    className="text-[10px]"
                                                >
                                                    {booking.commissionStatus}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Partner</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Hotel Name *</label>
                            <Input
                                required
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Partner Code *</label>
                            <Input
                                required
                                value={form.code}
                                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
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
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Phone</label>
                                <Input
                                    type="tel"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Website</label>
                            <Input
                                value={form.website}
                                onChange={(e) => setForm({ ...form, website: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Address</label>
                            <Input
                                value={form.address}
                                onChange={(e) => setForm({ ...form, address: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">City</label>
                                <Input
                                    value={form.city}
                                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">State</label>
                                <Input
                                    value={form.state}
                                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Country</label>
                                <Input
                                    value={form.country}
                                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                                />
                            </div>
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
                            <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting ? (
                                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                                ) : (
                                    "Save Changes"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
