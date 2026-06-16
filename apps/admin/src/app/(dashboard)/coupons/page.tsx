"use client";

// apps/admin/src/app/(dashboard)/coupons/page.tsx
import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Ticket, Download } from "lucide-react";
import { PageHeader, Button, Card, CardContent, Badge, Input, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Label, StatCard } from "@the-rooms/ui";
import { formatDate } from "@the-rooms/ui";
import { fetchCoupons, createCoupon, updateCoupon, deleteCoupon, bulkGenerateCoupons, type Coupon } from "@/lib/api";

export default function CouponsPage() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
    const [formData, setFormData] = useState({ code: "", type: "PERCENTAGE", value: "0", minBookingAmount: "0", maxDiscount: "", validFrom: "", validUntil: "", usageLimit: "100" });
    const [bulkData, setBulkData] = useState({ count: "10", prefix: "BULK", ...formData });

    const fetchData = async () => { setLoading(true); try { const result = await fetchCoupons(); setCoupons(result.coupons || []); } finally { setLoading(false); } };
    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async () => {
        const data = { ...formData, value: parseFloat(formData.value), minBookingAmount: parseFloat(formData.minBookingAmount), maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : null, usageLimit: parseInt(formData.usageLimit) };
        if (editingCoupon) { await updateCoupon(editingCoupon.id, data); } else { await createCoupon(data); }
        setShowModal(false); setEditingCoupon(null); setFormData({ code: "", type: "PERCENTAGE", value: "0", minBookingAmount: "0", maxDiscount: "", validFrom: "", validUntil: "", usageLimit: "100" }); fetchData();
    };

    const handleBulkGenerate = async () => {
        await bulkGenerateCoupons(parseInt(bulkData.count), bulkData.prefix, { type: bulkData.type as "PERCENTAGE" | "FIXED", value: parseFloat(bulkData.value), minBookingAmount: parseFloat(bulkData.minBookingAmount), validFrom: bulkData.validFrom, validUntil: bulkData.validUntil, usageLimit: parseInt(bulkData.usageLimit) });
        setShowBulkModal(false); fetchData();
    };

    const handleEdit = (coupon: Coupon) => {
        setEditingCoupon(coupon); setFormData({ code: coupon.code, type: coupon.type, value: coupon.value.toString(), minBookingAmount: coupon.minBookingAmount.toString(), maxDiscount: coupon.maxDiscount?.toString() ?? "", validFrom: coupon.validFrom.split("T")[0], validUntil: coupon.validUntil.split("T")[0], usageLimit: coupon.usageLimit.toString() }); setShowModal(true);
    };

    const stats = { total: coupons.length, active: coupons.filter((c) => c.isActive).length, totalUsed: coupons.reduce((sum, c) => sum + c.usedCount, 0) };

    return (
        <div className="space-y-6">
            <PageHeader title="Coupons" description="Manage discount coupons and promotions" actions={<><Button variant="outline" onClick={() => setShowBulkModal(true)}><Download className="h-4 w-4 mr-2" />Bulk Generate</Button><Button onClick={() => setShowModal(true)}><Plus className="h-4 w-4 mr-2" />Add Coupon</Button></>} />
            <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Total Coupons" value={stats.total} icon={Ticket} />
                <StatCard label="Active" value={stats.active} icon={Ticket} />
                <StatCard label="Total Used" value={stats.totalUsed} icon={Ticket} />
            </div>
            <div className="grid gap-4">
                {loading ? [...Array(3)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />) : coupons.length === 0 ? (
                    <Card><CardContent className="py-12 text-center"><Ticket className="h-8 w-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">No coupons configured</p></CardContent></Card>
                ) : coupons.map((coupon) => (
                    <Card key={coupon.id} className={!coupon.isActive ? "opacity-60" : ""}>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center"><Ticket className="h-6 w-6 text-primary" /></div>
                                    <div>
                                        <div className="flex items-center gap-2"><code className="font-semibold text-lg">{coupon.code}</code><Badge variant={coupon.isActive ? "success" : "secondary"}>{coupon.isActive ? "Active" : "Inactive"}</Badge><Badge variant="outline">{coupon.type}</Badge></div>
                                        <p className="text-sm text-muted-foreground">{coupon.type === "PERCENTAGE" ? `${coupon.value}% off` : `₹${coupon.value} off`} · Min booking: ₹{coupon.minBookingAmount}</p>
                                        <p className="text-xs text-muted-foreground">Used: {coupon.usedCount}/{coupon.usageLimit} · Valid: {formatDate(coupon.validFrom, "short")} to {formatDate(coupon.validUntil, "short")}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(coupon)}><Edit className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={async () => { if (confirm("Delete?")) { await deleteCoupon(coupon.id); fetchData(); } }}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Dialog open={showModal} onOpenChange={setShowModal}><DialogContent><DialogHeader><DialogTitle>{editingCoupon ? "Edit Coupon" : "Add Coupon"}</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2"><Label>Code</Label><Input value={formData.code} onChange={(e) => setFormData((f) => ({ ...f, code: e.target.value }))} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Type</Label><select className="w-full p-2 border rounded-lg" value={formData.type} onChange={(e) => setFormData((f) => ({ ...f, type: e.target.value }))}><option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed Amount</option></select></div>
                        <div className="space-y-2"><Label>Value</Label><Input type="number" value={formData.value} onChange={(e) => setFormData((f) => ({ ...f, value: e.target.value }))} /></div>
                        <div className="space-y-2"><Label>Min Booking Amount</Label><Input type="number" value={formData.minBookingAmount} onChange={(e) => setFormData((f) => ({ ...f, minBookingAmount: e.target.value }))} /></div>
                        <div className="space-y-2"><Label>Max Discount</Label><Input type="number" value={formData.maxDiscount} onChange={(e) => setFormData((f) => ({ ...f, maxDiscount: e.target.value }))} placeholder="Optional" /></div>
                        <div className="space-y-2"><Label>Valid From</Label><Input type="date" value={formData.validFrom} onChange={(e) => setFormData((f) => ({ ...f, validFrom: e.target.value }))} /></div>
                        <div className="space-y-2"><Label>Valid Until</Label><Input type="date" value={formData.validUntil} onChange={(e) => setFormData((f) => ({ ...f, validUntil: e.target.value }))} /></div>
                        <div className="space-y-2"><Label>Usage Limit</Label><Input type="number" value={formData.usageLimit} onChange={(e) => setFormData((f) => ({ ...f, usageLimit: e.target.value }))} /></div>
                    </div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={handleSubmit}>{editingCoupon ? "Update" : "Create"}</Button></DialogFooter>
            </Dialog>
            <Dialog open={showBulkModal} onOpenChange={setShowBulkModal}><DialogContent><DialogHeader><DialogTitle>Bulk Generate Coupons</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Count</Label><Input type="number" value={bulkData.count} onChange={(e) => setBulkData((f) => ({ ...f, count: e.target.value }))} /></div>
                        <div className="space-y-2"><Label>Prefix</Label><Input value={bulkData.prefix} onChange={(e) => setBulkData((f) => ({ ...f, prefix: e.target.value }))} /></div>
                        <div className="space-y-2"><Label>Type</Label><select className="w-full p-2 border rounded-lg" value={bulkData.type} onChange={(e) => setBulkData((f) => ({ ...f, type: e.target.value }))}><option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed Amount</option></select></div>
                        <div className="space-y-2"><Label>Value</Label><Input type="number" value={bulkData.value} onChange={(e) => setBulkData((f) => ({ ...f, value: e.target.value }))} /></div>
                    </div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setShowBulkModal(false)}>Cancel</Button><Button onClick={handleBulkGenerate}>Generate</Button></DialogFooter>
            </Dialog>
        </div>
    );
}