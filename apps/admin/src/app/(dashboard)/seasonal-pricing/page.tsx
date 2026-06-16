"use client";

// apps/admin/src/app/(dashboard)/seasonal-pricing/page.tsx
import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Calendar, ToggleLeft, ToggleRight } from "lucide-react";
import {
    PageHeader,
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Badge,
    Input,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Label,
    Select,
    SelectTrigger,
    SelectContent,
    SelectValue,
} from "@the-rooms/ui";
import { formatDate } from "@the-rooms/ui";
import {
    fetchSeasonalRates,
    createSeasonalRate,
    updateSeasonalRate,
    deleteSeasonalRate,
    type SeasonalRate,
} from "@/lib/api";

export default function SeasonalPricingPage() {
    const [rates, setRates] = useState<SeasonalRate[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingRate, setEditingRate] = useState<SeasonalRate | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        roomTypeId: "",
        startDate: "",
        endDate: "",
        priceMultiplier: "1.0",
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const result = await fetchSeasonalRates();
            setRates(result.rates || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async () => {
        const data = {
            ...formData,
            priceMultiplier: parseFloat(formData.priceMultiplier),
        };

        if (editingRate) {
            await updateSeasonalRate(editingRate.id, data);
        } else {
            await createSeasonalRate(data);
        }
        setShowModal(false);
        setEditingRate(null);
        setFormData({ name: "", roomTypeId: "", startDate: "", endDate: "", priceMultiplier: "1.0" });
        fetchData();
    };

    const handleEdit = (rate: SeasonalRate) => {
        setEditingRate(rate);
        setFormData({
            name: rate.name,
            roomTypeId: rate.roomTypeId,
            startDate: rate.startDate.split("T")[0],
            endDate: rate.endDate.split("T")[0],
            priceMultiplier: rate.priceMultiplier.toString(),
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this seasonal rate?")) return;
        await deleteSeasonalRate(id);
        fetchData();
    };

    const handleToggle = async (rate: SeasonalRate) => {
        await updateSeasonalRate(rate.id, { isActive: !rate.isActive });
        fetchData();
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Seasonal Pricing"
                description="Manage seasonal rate adjustments"
                actions={
                    <Button onClick={() => setShowModal(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Season
                    </Button>
                }
            />

            {/* Rates List */}
            <div className="grid gap-4">
                {loading ? (
                    [...Array(3)].map((_, i) => (
                        <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
                    ))
                ) : rates.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No seasonal rates configured</p>
                        </CardContent>
                    </Card>
                ) : (
                    rates.map((rate) => (
                        <Card key={rate.id} className={!rate.isActive ? "opacity-60" : ""}>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center">
                                            <Calendar className="h-6 w-6 text-secondary" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-lg">{rate.name}</h3>
                                                <Badge variant={rate.isActive ? "success" : "secondary"}>
                                                    {rate.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {rate.roomType.name} · {formatDate(rate.startDate, "short")} to {formatDate(rate.endDate, "short")}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-primary">
                                                {rate.priceMultiplier > 1 ? "+" : ""}{((rate.priceMultiplier - 1) * 100).toFixed(0)}%
                                            </p>
                                            <p className="text-xs text-muted-foreground">Price Adjustment</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleToggle(rate)}
                                        >
                                            {rate.isActive ? (
                                                <ToggleRight className="h-6 w-6 text-success" />
                                            ) : (
                                                <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                                            )}
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(rate)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => handleDelete(rate.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Create/Edit Modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingRate ? "Edit Seasonal Rate" : "Add Seasonal Rate"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Season Name</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                                placeholder="e.g., Summer Rush, Diwali Special"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Room Type</Label>
                            <Select
                                value={formData.roomTypeId}
                                onValueChange={(v) => setFormData((f) => ({ ...f, roomTypeId: v }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select room type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectValue placeholder="Select room type" />
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData((f) => ({ ...f, startDate: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>End Date</Label>
                                <Input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData((f) => ({ ...f, endDate: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Price Multiplier</Label>
                            <Input
                                type="number"
                                step="0.1"
                                min="0.1"
                                max="5"
                                value={formData.priceMultiplier}
                                onChange={(e) => setFormData((f) => ({ ...f, priceMultiplier: e.target.value }))}
                                placeholder="1.0"
                            />
                            <p className="text-xs text-muted-foreground">
                                Enter 1.2 for 20% increase, 0.8 for 20% discount
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit}>
                            {editingRate ? "Update" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}