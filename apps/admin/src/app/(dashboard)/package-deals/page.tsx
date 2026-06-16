"use client";

// apps/admin/src/app/(dashboard)/package-deals/page.tsx
import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Package, Eye } from "lucide-react";
import { PageHeader, Button, Card, CardContent, Badge, Input, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Label, StatCard } from "@the-rooms/ui";
import { formatCurrency, formatDate } from "@the-rooms/ui";
import { fetchPackageDeals, createPackageDeal, updatePackageDeal, deletePackageDeal, type PackageDeal } from "@/lib/api";

export default function PackageDealsPage() {
    const [deals, setDeals] = useState<PackageDeal[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingDeal, setEditingDeal] = useState<PackageDeal | null>(null);
    const [formData, setFormData] = useState({ name: "", description: "", price: "0", validityStart: "", validityEnd: "" });

    const fetchData = async () => {
        setLoading(true);
        try {
            const result = await fetchPackageDeals();
            setDeals(result.deals || []);
        } finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async () => {
        const data = { ...formData, price: parseFloat(formData.price), components: [] };
        if (editingDeal) { await updatePackageDeal(editingDeal.id, data); }
        else { await createPackageDeal(data); }
        setShowModal(false); setEditingDeal(null); setFormData({ name: "", description: "", price: "0", validityStart: "", validityEnd: "" }); fetchData();
    };

    const handleEdit = (deal: PackageDeal) => {
        setEditingDeal(deal); setFormData({ name: deal.name, description: deal.description, price: deal.price.toString(), validityStart: deal.validityStart.split("T")[0], validityEnd: deal.validityEnd.split("T")[0] }); setShowModal(true);
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Package Deals" description="Create and manage package deals" actions={<Button onClick={() => setShowModal(true)}><Plus className="h-4 w-4 mr-2" />Add Package</Button>} />
            <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Total Packages" value={deals.length} icon={Package} />
                <StatCard label="Active" value={deals.filter((d) => d.isActive).length} icon={Package} />
            </div>
            <div className="grid gap-4">
                {loading ? [...Array(3)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />) : deals.length === 0 ? (
                    <Card><CardContent className="py-12 text-center"><Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">No package deals configured</p></CardContent></Card>
                ) : deals.map((deal) => (
                    <Card key={deal.id} className={!deal.isActive ? "opacity-60" : ""}>
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center"><Package className="h-6 w-6 text-primary" /></div>
                                    <div>
                                        <div className="flex items-center gap-2"><h3 className="font-semibold text-lg">{deal.name}</h3><Badge variant={deal.isActive ? "success" : "secondary"}>{deal.isActive ? "Active" : "Inactive"}</Badge></div>
                                        <p className="text-sm text-muted-foreground">{deal.description}</p>
                                        <p className="text-sm mt-1">{deal.roomType.name}</p>
                                        <div className="flex flex-wrap gap-2 mt-2">{deal.components.map((c, i) => <span key={i} className="inline-flex items-center px-2 py-1 rounded text-xs bg-secondary/20">{c.name}</span>)}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right"><p className="text-2xl font-bold text-primary">{formatCurrency(deal.price)}</p><p className="text-xs text-muted-foreground">Valid until {formatDate(deal.validityEnd, "short")}</p></div>
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(deal)}><Edit className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={async () => { if (confirm("Delete?")) { await deletePackageDeal(deal.id); fetchData(); } }}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent><DialogHeader><DialogTitle>{editingDeal ? "Edit Package" : "Add Package"}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2"><Label>Package Name</Label><Input value={formData.name} onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))} /></div>
                        <div className="space-y-2"><Label>Description</Label><textarea className="w-full h-20 p-3 border rounded-lg text-sm" value={formData.description} onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))} /></div>
                        <div className="space-y-2"><Label>Price</Label><Input type="number" value={formData.price} onChange={(e) => setFormData((f) => ({ ...f, price: e.target.value }))} /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Valid From</Label><Input type="date" value={formData.validityStart} onChange={(e) => setFormData((f) => ({ ...f, validityStart: e.target.value }))} /></div>
                            <div className="space-y-2"><Label>Valid To</Label><Input type="date" value={formData.validityEnd} onChange={(e) => setFormData((f) => ({ ...f, validityEnd: e.target.value }))} /></div>
                        </div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button><Button onClick={handleSubmit}>{editingDeal ? "Update" : "Create"}</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}