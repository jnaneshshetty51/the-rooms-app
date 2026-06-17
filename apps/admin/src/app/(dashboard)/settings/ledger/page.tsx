"use client";

// apps/admin/src/app/(dashboard)/settings/ledger/page.tsx
// Ledger Mapping Settings - Chart of accounts and Tally integration

import { useEffect, useState } from "react";
import { PageHeader } from "@the-rooms/ui";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Switch, Tabs, TabsList, TabsTrigger, TabsContent, Select, SelectTrigger, SelectContent, SelectValue, SelectItem, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, useToast } from "@the-rooms/ui";
import { LucideLoader2 as Loader2, BookOpen, CreditCard, TrendingUp, TrendingDown, Link2, RefreshCw, Save, Plus, Trash2 } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PaymentMethodMapping {
    method: string;
    ledgerName: string;
    ledgerCode: string;
    category: string;
}

interface RevenueCategoryMapping {
    category: string;
    ledgerName: string;
    ledgerCode: string;
    taxability: string;
}

interface ExpenseCategoryMapping {
    category: string;
    ledgerName: string;
    ledgerCode: string;
    payableAccount: string;
}

interface TallySettings {
    enabled: boolean;
    companyName: string;
    guid: string;
    exportUrl: string;
    autoExport: boolean;
    exportOnClose: boolean;
    lastExportDate: string | null;
}

interface ChartOfAccounts {
    baseCurrency: string;
    costCenterEnabled: boolean;
    taxHeavenEnabled: boolean;
}

interface LedgerSettings {
    chartOfAccounts: ChartOfAccounts;
    paymentMethodMappings: PaymentMethodMapping[];
    revenueCategoryMappings: RevenueCategoryMapping[];
    expenseCategoryMappings: ExpenseCategoryMapping[];
    tallySettings: TallySettings;
}

// ─── API Functions ─────────────────────────────────────────────────────────────

async function fetchLedgerSettings(): Promise<{ settings: LedgerSettings }> {
    const res = await fetch("/api/settings/ledger");
    return res.json();
}

async function updateLedgerSettings(data: Partial<LedgerSettings>) {
    const res = await fetch("/api/settings/ledger", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYMENT_METHODS = [
    { value: "CASH", label: "Cash" },
    { value: "CARD", label: "Card" },
    { value: "UPI", label: "UPI" },
    { value: "NETBANKING", label: "Net Banking" },
    { value: "WALLET", label: "E-Wallet" },
    { value: "CHEQUE", label: "Cheque" },
    { value: "CORPORATE", label: "Corporate Account" },
];

const REVENUE_CATEGORIES = [
    { value: "ROOM_RENT", label: "Room Rent" },
    { value: "FOOD_BEVERAGE", label: "Food & Beverage" },
    { value: "LAUNDRY", label: "Laundry" },
    { value: "SPA", label: "Spa Services" },
    { value: "TRANSPORT", label: "Transport" },
    { value: "MINIBAR", label: "Minibar" },
    { value: "OTHER", label: "Other" },
    { value: "DISCOUNT", label: "Discount" },
];

const EXPENSE_CATEGORIES = [
    { value: "SALARIES", label: "Salaries & Wages" },
    { value: "MAINTENANCE", label: "Repairs & Maintenance" },
    { value: "UTILITIES", label: "Utilities" },
    { value: "SUPPLIES", label: "Operating Supplies" },
    { value: "MARKETING", label: "Marketing & Advertising" },
    { value: "INSURANCE", label: "Insurance" },
    { value: "RENT", label: "Rent" },
    { value: "TAXES", label: "Taxes & Licenses" },
];

const ACCOUNT_CATEGORIES = ["Asset", "Liability", "Revenue", "Expense"];
const TAXABILITY_OPTIONS = ["Taxable", "Exempt", "Zero Rated"];

// ─── Component ────────────────────────────────────────────────────────────────

export default function LedgerSettingsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("accounts");

    const [settings, setSettings] = useState<LedgerSettings>({
        chartOfAccounts: {
            baseCurrency: "INR",
            costCenterEnabled: true,
            taxHeavenEnabled: false,
        },
        paymentMethodMappings: [],
        revenueCategoryMappings: [],
        expenseCategoryMappings: [],
        tallySettings: {
            enabled: false,
            companyName: "",
            guid: "",
            exportUrl: "http://localhost:9000",
            autoExport: false,
            exportOnClose: false,
            lastExportDate: null,
        },
    });

    useEffect(() => {
        async function loadSettings() {
            try {
                const data = await fetchLedgerSettings();
                if (data.settings) {
                    setSettings(data.settings);
                }
            } catch (err) {
                console.error("Failed to fetch ledger settings:", err);
                toast({ type: "error", title: "Error", message: "Failed to load ledger settings." });
            } finally {
                setLoading(false);
            }
        }
        loadSettings();
    }, [toast]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateLedgerSettings(settings);
            toast({ type: "success", title: "Saved", message: "Ledger settings saved successfully." });
        } catch (err) {
            console.error("Failed to save ledger settings:", err);
            toast({ type: "error", title: "Error", message: "Failed to save ledger settings." });
        } finally {
            setSaving(false);
        }
    };

    // Payment Method Mapping handlers
    const updatePaymentMapping = (index: number, field: keyof PaymentMethodMapping, value: string) => {
        const newMappings = [...settings.paymentMethodMappings];
        newMappings[index] = { ...newMappings[index], [field]: value };
        setSettings({ ...settings, paymentMethodMappings: newMappings });
    };

    const addPaymentMapping = () => {
        setSettings({
            ...settings,
            paymentMethodMappings: [
                ...settings.paymentMethodMappings,
                { method: "CASH", ledgerName: "", ledgerCode: "", category: "Asset" },
            ],
        });
    };

    const removePaymentMapping = (index: number) => {
        setSettings({
            ...settings,
            paymentMethodMappings: settings.paymentMethodMappings.filter((_, i) => i !== index),
        });
    };

    // Revenue Category Mapping handlers
    const updateRevenueMapping = (index: number, field: keyof RevenueCategoryMapping, value: string) => {
        const newMappings = [...settings.revenueCategoryMappings];
        newMappings[index] = { ...newMappings[index], [field]: value };
        setSettings({ ...settings, revenueCategoryMappings: newMappings });
    };

    const addRevenueMapping = () => {
        setSettings({
            ...settings,
            revenueCategoryMappings: [
                ...settings.revenueCategoryMappings,
                { category: "ROOM_RENT", ledgerName: "", ledgerCode: "", taxability: "Taxable" },
            ],
        });
    };

    const removeRevenueMapping = (index: number) => {
        setSettings({
            ...settings,
            revenueCategoryMappings: settings.revenueCategoryMappings.filter((_, i) => i !== index),
        });
    };

    // Expense Category Mapping handlers
    const updateExpenseMapping = (index: number, field: keyof ExpenseCategoryMapping, value: string) => {
        const newMappings = [...settings.expenseCategoryMappings];
        newMappings[index] = { ...newMappings[index], [field]: value };
        setSettings({ ...settings, expenseCategoryMappings: newMappings });
    };

    const addExpenseMapping = () => {
        setSettings({
            ...settings,
            expenseCategoryMappings: [
                ...settings.expenseCategoryMappings,
                { category: "SALARIES", ledgerName: "", ledgerCode: "", payableAccount: "" },
            ],
        });
    };

    const removeExpenseMapping = (index: number) => {
        setSettings({
            ...settings,
            expenseCategoryMappings: settings.expenseCategoryMappings.filter((_, i) => i !== index),
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
                title="Ledger Mapping"
                description="Configure chart of accounts, payment method mappings, and Tally integration"
                actions={
                    <Button onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                    </Button>
                }
            />

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="accounts">Chart of Accounts</TabsTrigger>
                    <TabsTrigger value="payment">Payment Methods</TabsTrigger>
                    <TabsTrigger value="revenue">Revenue</TabsTrigger>
                    <TabsTrigger value="expense">Expense</TabsTrigger>
                    <TabsTrigger value="tally">Tally Integration</TabsTrigger>
                </TabsList>

                {/* ─── Chart of Accounts Tab ──────────────────────────────────────── */}
                <TabsContent value="accounts" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-heading text-lg flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-primary" />
                                General Settings
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-6 lg:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Base Currency</Label>
                                    <Select
                                        value={settings.chartOfAccounts.baseCurrency}
                                        onValueChange={(v) => setSettings({
                                            ...settings,
                                            chartOfAccounts: { ...settings.chartOfAccounts, baseCurrency: v }
                                        })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="INR">Indian Rupee (INR)</SelectItem>
                                            <SelectItem value="USD">US Dollar (USD)</SelectItem>
                                            <SelectItem value="EUR">Euro (EUR)</SelectItem>
                                            <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-medium">Cost Center Tracking</p>
                                        <p className="text-xs text-muted-foreground">Enable tracking of expenses by department/location</p>
                                    </div>
                                    <Switch
                                        checked={settings.chartOfAccounts.costCenterEnabled}
                                        onCheckedChange={(checked) => setSettings({
                                            ...settings,
                                            chartOfAccounts: { ...settings.chartOfAccounts, costCenterEnabled: checked }
                                        })}
                                    />
                                </div>

                                <div className="flex items-start justify-between gap-4 pt-4 border-t">
                                    <div>
                                        <p className="text-sm font-medium">Tax Haven Support</p>
                                        <p className="text-xs text-muted-foreground">Enable separate tracking for tax-exempt transactions</p>
                                    </div>
                                    <Switch
                                        checked={settings.chartOfAccounts.taxHeavenEnabled}
                                        onCheckedChange={(checked) => setSettings({
                                            ...settings,
                                            chartOfAccounts: { ...settings.chartOfAccounts, taxHeavenEnabled: checked }
                                        })}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ─── Payment Methods Tab ──────────────────────────────────────────── */}
                <TabsContent value="payment" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-heading text-lg flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-primary" />
                                Payment Method to Ledger Mapping
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Map payment methods to their corresponding ledger accounts for accurate accounting.
                            </p>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Payment Method</TableHead>
                                        <TableHead>Ledger Name</TableHead>
                                        <TableHead>Ledger Code</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {settings.paymentMethodMappings.map((mapping, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                                <Select
                                                    value={mapping.method}
                                                    onValueChange={(v) => updatePaymentMapping(index, "method", v)}
                                                >
                                                    <SelectTrigger className="w-[140px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {PAYMENT_METHODS.map((pm) => (
                                                            <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={mapping.ledgerName}
                                                    onChange={(e) => updatePaymentMapping(index, "ledgerName", e.target.value)}
                                                    placeholder="Ledger name"
                                                    className="w-[180px]"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={mapping.ledgerCode}
                                                    onChange={(e) => updatePaymentMapping(index, "ledgerCode", e.target.value)}
                                                    placeholder="Code"
                                                    className="w-[120px] font-mono"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={mapping.category}
                                                    onValueChange={(v) => updatePaymentMapping(index, "category", v)}
                                                >
                                                    <SelectTrigger className="w-[120px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {ACCOUNT_CATEGORIES.map((cat) => (
                                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removePaymentMapping(index)}
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            <Button variant="outline" onClick={addPaymentMapping}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Mapping
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ─── Revenue Categories Tab ─────────────────────────────────────── */}
                <TabsContent value="revenue" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-heading text-lg flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-primary" />
                                Revenue Category Mapping
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Map revenue categories to their corresponding ledger accounts for accurate income tracking.
                            </p>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Revenue Category</TableHead>
                                        <TableHead>Ledger Name</TableHead>
                                        <TableHead>Ledger Code</TableHead>
                                        <TableHead>Taxability</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {settings.revenueCategoryMappings.map((mapping, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                                <Select
                                                    value={mapping.category}
                                                    onValueChange={(v) => updateRevenueMapping(index, "category", v)}
                                                >
                                                    <SelectTrigger className="w-[160px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {REVENUE_CATEGORIES.map((cat) => (
                                                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={mapping.ledgerName}
                                                    onChange={(e) => updateRevenueMapping(index, "ledgerName", e.target.value)}
                                                    placeholder="Ledger name"
                                                    className="w-[180px]"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={mapping.ledgerCode}
                                                    onChange={(e) => updateRevenueMapping(index, "ledgerCode", e.target.value)}
                                                    placeholder="Code"
                                                    className="w-[120px] font-mono"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={mapping.taxability}
                                                    onValueChange={(v) => updateRevenueMapping(index, "taxability", v)}
                                                >
                                                    <SelectTrigger className="w-[120px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {TAXABILITY_OPTIONS.map((tax) => (
                                                            <SelectItem key={tax} value={tax}>{tax}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeRevenueMapping(index)}
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            <Button variant="outline" onClick={addRevenueMapping}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Mapping
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ─── Expense Categories Tab ──────────────────────────────────────── */}
                <TabsContent value="expense" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-heading text-lg flex items-center gap-2">
                                <TrendingDown className="h-4 w-4 text-primary" />
                                Expense Category Mapping
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Map expense categories to their corresponding ledger accounts for accurate expense tracking.
                            </p>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Expense Category</TableHead>
                                        <TableHead>Ledger Name</TableHead>
                                        <TableHead>Ledger Code</TableHead>
                                        <TableHead>Payable Account</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {settings.expenseCategoryMappings.map((mapping, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                                <Select
                                                    value={mapping.category}
                                                    onValueChange={(v) => updateExpenseMapping(index, "category", v)}
                                                >
                                                    <SelectTrigger className="w-[180px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {EXPENSE_CATEGORIES.map((cat) => (
                                                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={mapping.ledgerName}
                                                    onChange={(e) => updateExpenseMapping(index, "ledgerName", e.target.value)}
                                                    placeholder="Ledger name"
                                                    className="w-[180px]"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={mapping.ledgerCode}
                                                    onChange={(e) => updateExpenseMapping(index, "ledgerCode", e.target.value)}
                                                    placeholder="Code"
                                                    className="w-[120px] font-mono"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={mapping.payableAccount}
                                                    onChange={(e) => updateExpenseMapping(index, "payableAccount", e.target.value)}
                                                    placeholder="Payable account"
                                                    className="w-[160px]"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeExpenseMapping(index)}
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            <Button variant="outline" onClick={addExpenseMapping}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Mapping
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ─── Tally Integration Tab ───────────────────────────────────────── */}
                <TabsContent value="tally" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-heading text-lg flex items-center gap-2">
                                <Link2 className="h-4 w-4 text-primary" />
                                Tally Integration
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-medium">Enable Tally Export</p>
                                    <p className="text-xs text-muted-foreground">Export accounting data to Tally Prime</p>
                                </div>
                                <Switch
                                    checked={settings.tallySettings.enabled}
                                    onCheckedChange={(checked) => setSettings({
                                        ...settings,
                                        tallySettings: { ...settings.tallySettings, enabled: checked }
                                    })}
                                />
                            </div>

                            {settings.tallySettings.enabled && (
                                <div className="space-y-4 pt-4 border-t">
                                    <div className="grid gap-4 lg:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label>Tally Company Name</Label>
                                            <Input
                                                value={settings.tallySettings.companyName}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    tallySettings: { ...settings.tallySettings, companyName: e.target.value }
                                                })}
                                                placeholder="My Hotel Company"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Company GUID</Label>
                                            <Input
                                                value={settings.tallySettings.guid}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    tallySettings: { ...settings.tallySettings, guid: e.target.value }
                                                })}
                                                placeholder="Auto-generated by Tally"
                                                className="font-mono"
                                            />
                                            <p className="text-xs text-muted-foreground">Found in Tally: Help → About → License → GUID</p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Tally Export URL</Label>
                                            <Input
                                                value={settings.tallySettings.exportUrl}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    tallySettings: { ...settings.tallySettings, exportUrl: e.target.value }
                                                })}
                                                placeholder="http://localhost:9000"
                                            />
                                            <p className="text-xs text-muted-foreground">Tally Silverlight/TCP API port (default: 9000)</p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Last Export Date</Label>
                                            <Input
                                                value={settings.tallySettings.lastExportDate || "Never"}
                                                disabled
                                                className="bg-muted"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-medium">Auto Export</p>
                                                <p className="text-xs text-muted-foreground">Automatically export on night audit close</p>
                                            </div>
                                            <Switch
                                                checked={settings.tallySettings.autoExport}
                                                onCheckedChange={(checked) => setSettings({
                                                    ...settings,
                                                    tallySettings: { ...settings.tallySettings, autoExport: checked }
                                                })}
                                            />
                                        </div>

                                        <div className="flex items-start justify-between gap-4 pt-4 border-t">
                                            <div>
                                                <p className="text-sm font-medium">Export on Day Close</p>
                                                <p className="text-xs text-muted-foreground">Export vouchers when day is closed in Tally</p>
                                            </div>
                                            <Switch
                                                checked={settings.tallySettings.exportOnClose}
                                                onCheckedChange={(checked) => setSettings({
                                                    ...settings,
                                                    tallySettings: { ...settings.tallySettings, exportOnClose: checked }
                                                })}
                                            />
                                        </div>
                                    </div>

                                    <div className="rounded-md bg-muted/50 p-4 mt-4">
                                        <p className="text-sm font-medium mb-2">How to Enable Tally Connection</p>
                                        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                                            <li>Open Tally Prime</li>
                                            <li>Go to F12 (Configure) → Tally.ERP 9 Gateway</li>
                                            <li>Enable "Accept TCP API requests" and set port to 9000</li>
                                            <li>Allow "Remote/Silverlight HTTP API" connections</li>
                                            <li>Restart Tally</li>
                                        </ol>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
