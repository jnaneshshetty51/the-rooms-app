"use client";

// apps/admin/src/app/(dashboard)/settings/pricing/page.tsx
// Pricing Rules Settings page

import { useEffect, useState } from "react";
import { PageHeader } from "@the-rooms/ui";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Switch, Tabs, TabsList, TabsTrigger, TabsContent, useToast } from "@the-rooms/ui";
import { LucideLoader2 as Loader2, IndianRupee, Calendar, Percent, Building2, Star, TrendingDown, Clock } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface BasePricing {
    defaultDailyRate: number;
    defaultMonthlyRate: number;
    minimumNightlyRate: number;
    extraGuestCharge: number;
    extraBedCharge: number;
}

interface WeekendPricing {
    enabled: boolean;
    fridayMarkupPercent: number;
    saturdayMarkupPercent: number;
    sundayMarkupPercent: number;
    applyFridayToThursday: boolean;
}

interface CustomLosDiscount {
    minNights: number;
    maxNights: number;
    discountPercent: number;
}

interface LosDiscounts {
    enabled: boolean;
    weeklyDiscountPercent: number;
    monthlyDiscountPercent: number;
    quarterlyDiscountPercent: number;
    customDiscounts: CustomLosDiscount[];
}

interface SeasonalPricing {
    enabled: boolean;
    peakSeasonMonths: number[];
    peakSeasonMarkupPercent: number;
    offSeasonMonths: number[];
    offSeasonDiscountPercent: number;
}

interface CorporateRates {
    enabled: boolean;
    defaultCorporateDiscount: number;
    allowNegotiation: boolean;
    minimumCorporateRate: number;
}

interface LoyaltyTier {
    name: string;
    staysRequired: number;
    discountPercent: number;
}

interface LoyaltyDiscounts {
    enabled: boolean;
    tiers: LoyaltyTier[];
}

interface DynamicPricing {
    lastMinuteEnabled: boolean;
    lastMinuteThresholdHours: number;
    lastMinuteDiscountPercent: number;
    earlyBirdEnabled: boolean;
    earlyBirdThresholdDays: number;
    earlyBirdDiscountPercent: number;
}

interface PricingSettings {
    basePricing: BasePricing;
    weekendPricing: WeekendPricing;
    losDiscounts: LosDiscounts;
    seasonalPricing: SeasonalPricing;
    corporateRates: CorporateRates;
    loyaltyDiscounts: LoyaltyDiscounts;
    dynamicPricing: DynamicPricing;
}

// ─── API Functions ─────────────────────────────────────────────────────────────

async function fetchPricingSettings(): Promise<{ settings: PricingSettings }> {
    const res = await fetch("/api/settings/pricing");
    return res.json();
}

async function updatePricingSettings(data: Partial<PricingSettings>) {
    const res = await fetch("/api/settings/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// ─── Component ────────────────────────────────────────────────────────────────

export default function PricingSettingsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("base");

    const [settings, setSettings] = useState<PricingSettings>({
        basePricing: {
            defaultDailyRate: 2000,
            defaultMonthlyRate: 45000,
            minimumNightlyRate: 500,
            extraGuestCharge: 500,
            extraBedCharge: 300,
        },
        weekendPricing: {
            enabled: false,
            fridayMarkupPercent: 10,
            saturdayMarkupPercent: 15,
            sundayMarkupPercent: 10,
            applyFridayToThursday: false,
        },
        losDiscounts: {
            enabled: true,
            weeklyDiscountPercent: 5,
            monthlyDiscountPercent: 15,
            quarterlyDiscountPercent: 20,
            customDiscounts: [],
        },
        seasonalPricing: {
            enabled: true,
            peakSeasonMonths: [4, 5, 10, 11],
            peakSeasonMarkupPercent: 25,
            offSeasonMonths: [6, 7, 8],
            offSeasonDiscountPercent: 10,
        },
        corporateRates: {
            enabled: true,
            defaultCorporateDiscount: 15,
            allowNegotiation: true,
            minimumCorporateRate: 0.7,
        },
        loyaltyDiscounts: {
            enabled: true,
            tiers: [
                { name: "Silver", staysRequired: 3, discountPercent: 5 },
                { name: "Gold", staysRequired: 7, discountPercent: 10 },
                { name: "Platinum", staysRequired: 15, discountPercent: 15 },
            ],
        },
        dynamicPricing: {
            lastMinuteEnabled: false,
            lastMinuteThresholdHours: 24,
            lastMinuteDiscountPercent: 10,
            earlyBirdEnabled: true,
            earlyBirdThresholdDays: 30,
            earlyBirdDiscountPercent: 15,
        },
    });

    useEffect(() => {
        async function loadSettings() {
            try {
                const data = await fetchPricingSettings();
                if (data.settings) {
                    setSettings(data.settings);
                }
            } catch (err) {
                console.error("Failed to fetch pricing settings:", err);
                toast({ type: "error", title: "Error", message: "Failed to load pricing settings." });
            } finally {
                setLoading(false);
            }
        }
        loadSettings();
    }, [toast]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updatePricingSettings(settings);
            toast({ type: "success", title: "Saved", message: "Pricing settings saved successfully." });
        } catch (err) {
            console.error("Failed to save pricing settings:", err);
            toast({ type: "error", title: "Error", message: "Failed to save pricing settings." });
        } finally {
            setSaving(false);
        }
    };

    const toggleMonth = (month: number, type: "peak" | "off") => {
        const key = type === "peak" ? "peakSeasonMonths" : "offSeasonMonths";
        const months = settings.seasonalPricing[key];
        if (months.includes(month)) {
            setSettings({
                ...settings,
                seasonalPricing: { ...settings.seasonalPricing, [key]: months.filter((m) => m !== month) },
            });
        } else {
            setSettings({
                ...settings,
                seasonalPricing: { ...settings.seasonalPricing, [key]: [...months, month].sort() },
            });
        }
    };

    const updateLoyaltyTier = (index: number, field: keyof LoyaltyTier, value: string | number) => {
        const newTiers = [...settings.loyaltyDiscounts.tiers];
        if (field === "name") {
            newTiers[index] = { ...newTiers[index], name: value as string };
        } else {
            newTiers[index] = { ...newTiers[index], [field]: parseInt(value as string) || 0 };
        }
        setSettings({
            ...settings,
            loyaltyDiscounts: { ...settings.loyaltyDiscounts, tiers: newTiers },
        });
    };

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Pricing Rules"
                description="Configure base rates, seasonal pricing, discounts, and dynamic pricing rules"
                actions={
                    <Button onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Save Changes
                    </Button>
                }
            />

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="base">Base Rates</TabsTrigger>
                    <TabsTrigger value="weekend">Weekend</TabsTrigger>
                    <TabsTrigger value="seasonal">Seasonal</TabsTrigger>
                    <TabsTrigger value="los">Length of Stay</TabsTrigger>
                    <TabsTrigger value="corporate">Corporate</TabsTrigger>
                    <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
                    <TabsTrigger value="dynamic">Dynamic</TabsTrigger>
                </TabsList>

                {/* ─── Base Rates Tab ──────────────────────────────────────────────── */}
                <TabsContent value="base" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-heading text-lg flex items-center gap-2">
                                <IndianRupee className="h-4 w-4 text-primary" />
                                Base Pricing Configuration
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Default Daily Rate (₹)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="100"
                                        value={settings.basePricing.defaultDailyRate}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            basePricing: { ...settings.basePricing, defaultDailyRate: parseInt(e.target.value) || 0 }
                                        })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Default Monthly Rate (₹)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="1000"
                                        value={settings.basePricing.defaultMonthlyRate}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            basePricing: { ...settings.basePricing, defaultMonthlyRate: parseInt(e.target.value) || 0 }
                                        })}
                                    />
                                    <p className="text-xs text-muted-foreground">Applied to STUDIO rooms with ≥28 nights</p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Minimum Nightly Rate (₹)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="50"
                                        value={settings.basePricing.minimumNightlyRate}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            basePricing: { ...settings.basePricing, minimumNightlyRate: parseInt(e.target.value) || 0 }
                                        })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Extra Guest Charge (₹ per night)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="50"
                                        value={settings.basePricing.extraGuestCharge}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            basePricing: { ...settings.basePricing, extraGuestCharge: parseInt(e.target.value) || 0 }
                                        })}
                                    />
                                    <p className="text-xs text-muted-foreground">For DAILY bookings with more than 2 guests</p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Extra Bed Charge (₹ per night)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="50"
                                        value={settings.basePricing.extraBedCharge}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            basePricing: { ...settings.basePricing, extraBedCharge: parseInt(e.target.value) || 0 }
                                        })}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ─── Weekend Tab ──────────────────────────────────────────────────── */}
                <TabsContent value="weekend" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-heading text-lg flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-primary" />
                                Weekend Pricing
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">Enable Weekend Pricing</p>
                                    <p className="text-xs text-muted-foreground">Apply markups on weekend days</p>
                                </div>
                                <Switch
                                    checked={settings.weekendPricing.enabled}
                                    onCheckedChange={(checked) => setSettings({
                                        ...settings,
                                        weekendPricing: { ...settings.weekendPricing, enabled: checked }
                                    })}
                                />
                            </div>

                            {settings.weekendPricing.enabled && (
                                <div className="space-y-4 pt-4 border-t">
                                    <div className="grid gap-4 sm:grid-cols-3">
                                        <div className="space-y-2">
                                            <Label>Friday Markup (%)</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={settings.weekendPricing.fridayMarkupPercent}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    weekendPricing: { ...settings.weekendPricing, fridayMarkupPercent: parseInt(e.target.value) || 0 }
                                                })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Saturday Markup (%)</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={settings.weekendPricing.saturdayMarkupPercent}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    weekendPricing: { ...settings.weekendPricing, saturdayMarkupPercent: parseInt(e.target.value) || 0 }
                                                })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Sunday Markup (%)</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={settings.weekendPricing.sundayMarkupPercent}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    weekendPricing: { ...settings.weekendPricing, sundayMarkupPercent: parseInt(e.target.value) || 0 }
                                                })}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t">
                                        <div>
                                            <p className="text-sm font-medium">Extended Weekend (Fri-Chu)</p>
                                            <p className="text-xs text-muted-foreground">Apply Friday rates to Thursday also</p>
                                        </div>
                                        <Switch
                                            checked={settings.weekendPricing.applyFridayToThursday}
                                            onCheckedChange={(checked) => setSettings({
                                                ...settings,
                                                weekendPricing: { ...settings.weekendPricing, applyFridayToThursday: checked }
                                            })}
                                        />
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ─── Seasonal Tab ─────────────────────────────────────────────────── */}
                <TabsContent value="seasonal" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-heading text-lg flex items-center gap-2">
                                <TrendingDown className="h-4 w-4 text-primary" />
                                Seasonal Pricing
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">Enable Seasonal Pricing</p>
                                    <p className="text-xs text-muted-foreground">Apply different rates based on season</p>
                                </div>
                                <Switch
                                    checked={settings.seasonalPricing.enabled}
                                    onCheckedChange={(checked) => setSettings({
                                        ...settings,
                                        seasonalPricing: { ...settings.seasonalPricing, enabled: checked }
                                    })}
                                />
                            </div>

                            {settings.seasonalPricing.enabled && (
                                <div className="space-y-6 pt-4 border-t">
                                    <div className="grid gap-6 lg:grid-cols-2">
                                        <div className="space-y-3">
                                            <Label>Peak Season Months</Label>
                                            <div className="grid grid-cols-4 gap-2">
                                                {MONTH_NAMES.map((name, idx) => {
                                                    const month = idx + 1;
                                                    const isSelected = settings.seasonalPricing.peakSeasonMonths.includes(month);
                                                    return (
                                                        <button
                                                            key={month}
                                                            type="button"
                                                            onClick={() => toggleMonth(month, "peak")}
                                                            className={`px-2 py-1 text-xs rounded-md border transition-colors ${isSelected
                                                                    ? "bg-primary text-primary-foreground border-primary"
                                                                    : "bg-background border-input hover:border-primary"
                                                                }`}
                                                        >
                                                            {name.slice(0, 3)}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <p className="text-xs text-muted-foreground">Markup: +{settings.seasonalPricing.peakSeasonMarkupPercent}%</p>
                                        </div>

                                        <div className="space-y-3">
                                            <Label>Off Season Months</Label>
                                            <div className="grid grid-cols-4 gap-2">
                                                {MONTH_NAMES.map((name, idx) => {
                                                    const month = idx + 1;
                                                    const isSelected = settings.seasonalPricing.offSeasonMonths.includes(month);
                                                    return (
                                                        <button
                                                            key={month}
                                                            type="button"
                                                            onClick={() => toggleMonth(month, "off")}
                                                            className={`px-2 py-1 text-xs rounded-md border transition-colors ${isSelected
                                                                    ? "bg-blue-500 text-white border-blue-500"
                                                                    : "bg-background border-input hover:border-primary"
                                                                }`}
                                                        >
                                                            {name.slice(0, 3)}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <p className="text-xs text-muted-foreground">Discount: -{settings.seasonalPricing.offSeasonDiscountPercent}%</p>
                                        </div>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t">
                                        <div className="space-y-2">
                                            <Label>Peak Season Markup (%)</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={settings.seasonalPricing.peakSeasonMarkupPercent}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    seasonalPricing: { ...settings.seasonalPricing, peakSeasonMarkupPercent: parseInt(e.target.value) || 0 }
                                                })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Off Season Discount (%)</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={settings.seasonalPricing.offSeasonDiscountPercent}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    seasonalPricing: { ...settings.seasonalPricing, offSeasonDiscountPercent: parseInt(e.target.value) || 0 }
                                                })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ─── Length of Stay Tab ──────────────────────────────────────────── */}
                <TabsContent value="los" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-heading text-lg flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-primary" />
                                Length of Stay Discounts
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">Enable LOS Discounts</p>
                                    <p className="text-xs text-muted-foreground">Offer discounts for longer stays</p>
                                </div>
                                <Switch
                                    checked={settings.losDiscounts.enabled}
                                    onCheckedChange={(checked) => setSettings({
                                        ...settings,
                                        losDiscounts: { ...settings.losDiscounts, enabled: checked }
                                    })}
                                />
                            </div>

                            {settings.losDiscounts.enabled && (
                                <div className="grid gap-4 sm:grid-cols-3 pt-4 border-t">
                                    <div className="space-y-2">
                                        <Label>Weekly Discount (%)</Label>
                                        <p className="text-xs text-muted-foreground">7+ nights</p>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={settings.losDiscounts.weeklyDiscountPercent}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                losDiscounts: { ...settings.losDiscounts, weeklyDiscountPercent: parseInt(e.target.value) || 0 }
                                            })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Monthly Discount (%)</Label>
                                        <p className="text-xs text-muted-foreground">28+ nights</p>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={settings.losDiscounts.monthlyDiscountPercent}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                losDiscounts: { ...settings.losDiscounts, monthlyDiscountPercent: parseInt(e.target.value) || 0 }
                                            })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Quarterly Discount (%)</Label>
                                        <p className="text-xs text-muted-foreground">90+ nights</p>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={settings.losDiscounts.quarterlyDiscountPercent}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                losDiscounts: { ...settings.losDiscounts, quarterlyDiscountPercent: parseInt(e.target.value) || 0 }
                                            })}
                                        />
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ─── Corporate Tab ───────────────────────────────────────────────── */}
                <TabsContent value="corporate" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-heading text-lg flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-primary" />
                                Corporate Rates
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">Enable Corporate Rates</p>
                                    <p className="text-xs text-muted-foreground">Offer special rates to corporate accounts</p>
                                </div>
                                <Switch
                                    checked={settings.corporateRates.enabled}
                                    onCheckedChange={(checked) => setSettings({
                                        ...settings,
                                        corporateRates: { ...settings.corporateRates, enabled: checked }
                                    })}
                                />
                            </div>

                            {settings.corporateRates.enabled && (
                                <div className="space-y-4 pt-4 border-t">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label>Default Corporate Discount (%)</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={settings.corporateRates.defaultCorporateDiscount}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    corporateRates: { ...settings.corporateRates, defaultCorporateDiscount: parseInt(e.target.value) || 0 }
                                                })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Minimum Rate (% of Base)</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="5"
                                                value={Math.round(settings.corporateRates.minimumCorporateRate * 100)}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    corporateRates: { ...settings.corporateRates, minimumCorporateRate: (parseInt(e.target.value) || 0) / 100 }
                                                })}
                                            />
                                            <p className="text-xs text-muted-foreground">Lowest rate as percentage of base rate</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t">
                                        <div>
                                            <p className="text-sm font-medium">Allow Rate Negotiation</p>
                                            <p className="text-xs text-muted-foreground">Allow front desk to adjust corporate rates</p>
                                        </div>
                                        <Switch
                                            checked={settings.corporateRates.allowNegotiation}
                                            onCheckedChange={(checked) => setSettings({
                                                ...settings,
                                                corporateRates: { ...settings.corporateRates, allowNegotiation: checked }
                                            })}
                                        />
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ─── Loyalty Tab ──────────────────────────────────────────────────── */}
                <TabsContent value="loyalty" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-heading text-lg flex items-center gap-2">
                                <Star className="h-4 w-4 text-primary" />
                                Loyalty Discounts
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">Enable Loyalty Program</p>
                                    <p className="text-xs text-muted-foreground">Reward repeat guests with tiered discounts</p>
                                </div>
                                <Switch
                                    checked={settings.loyaltyDiscounts.enabled}
                                    onCheckedChange={(checked) => setSettings({
                                        ...settings,
                                        loyaltyDiscounts: { ...settings.loyaltyDiscounts, enabled: checked }
                                    })}
                                />
                            </div>

                            {settings.loyaltyDiscounts.enabled && (
                                <div className="space-y-4 pt-4 border-t">
                                    <Label>Loyalty Tiers</Label>
                                    {settings.loyaltyDiscounts.tiers.map((tier, index) => (
                                        <div key={index} className="grid gap-4 sm:grid-cols-4 items-end">
                                            <div className="space-y-2">
                                                <Label className="text-xs">Tier Name</Label>
                                                <Input
                                                    value={tier.name}
                                                    onChange={(e) => updateLoyaltyTier(index, "name", e.target.value)}
                                                    placeholder="Silver"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">Stays Required</Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={tier.staysRequired}
                                                    onChange={(e) => updateLoyaltyTier(index, "staysRequired", e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">Discount (%)</Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={tier.discountPercent}
                                                    onChange={(e) => updateLoyaltyTier(index, "discountPercent", e.target.value)}
                                                />
                                            </div>
                                            <div></div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ─── Dynamic Tab ─────────────────────────────────────────────────── */}
                <TabsContent value="dynamic" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-heading text-lg flex items-center gap-2">
                                <Clock className="h-4 w-4 text-primary" />
                                Dynamic Pricing
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Last Minute */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium">Last Minute Discounts</p>
                                        <p className="text-xs text-muted-foreground">Offer discounts for bookings close to check-in</p>
                                    </div>
                                    <Switch
                                        checked={settings.dynamicPricing.lastMinuteEnabled}
                                        onCheckedChange={(checked) => setSettings({
                                            ...settings,
                                            dynamicPricing: { ...settings.dynamicPricing, lastMinuteEnabled: checked }
                                        })}
                                    />
                                </div>

                                {settings.dynamicPricing.lastMinuteEnabled && (
                                    <div className="grid gap-4 sm:grid-cols-2 pl-4 border-l-2 border-primary">
                                        <div className="space-y-2">
                                            <Label>Booking Window (hours)</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={settings.dynamicPricing.lastMinuteThresholdHours}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    dynamicPricing: { ...settings.dynamicPricing, lastMinuteThresholdHours: parseInt(e.target.value) || 24 }
                                                })}
                                            />
                                            <p className="text-xs text-muted-foreground">Apply discount for bookings within this window</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Discount (%)</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={settings.dynamicPricing.lastMinuteDiscountPercent}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    dynamicPricing: { ...settings.dynamicPricing, lastMinuteDiscountPercent: parseInt(e.target.value) || 10 }
                                                })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Early Bird */}
                            <div className="space-y-4 pt-4 border-t">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium">Early Bird Discounts</p>
                                        <p className="text-xs text-muted-foreground">Offer discounts for advance bookings</p>
                                    </div>
                                    <Switch
                                        checked={settings.dynamicPricing.earlyBirdEnabled}
                                        onCheckedChange={(checked) => setSettings({
                                            ...settings,
                                            dynamicPricing: { ...settings.dynamicPricing, earlyBirdEnabled: checked }
                                        })}
                                    />
                                </div>

                                {settings.dynamicPricing.earlyBirdEnabled && (
                                    <div className="grid gap-4 sm:grid-cols-2 pl-4 border-l-2 border-primary">
                                        <div className="space-y-2">
                                            <Label>Advance Notice (days)</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={settings.dynamicPricing.earlyBirdThresholdDays}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    dynamicPricing: { ...settings.dynamicPricing, earlyBirdThresholdDays: parseInt(e.target.value) || 30 }
                                                })}
                                            />
                                            <p className="text-xs text-muted-foreground">Apply discount for bookings made X days in advance</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Discount (%)</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={settings.dynamicPricing.earlyBirdDiscountPercent}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    dynamicPricing: { ...settings.dynamicPricing, earlyBirdDiscountPercent: parseInt(e.target.value) || 15 }
                                                })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
