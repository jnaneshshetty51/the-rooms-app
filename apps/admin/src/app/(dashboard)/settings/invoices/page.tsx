"use client";

// apps/admin/src/app/(dashboard)/settings/invoices/page.tsx
// Invoice Settings - GST-compliant invoice configuration

import { useEffect, useState } from "react";
import { PageHeader } from "@the-rooms/ui";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Switch, Select, SelectTrigger, SelectContent, SelectValue, SelectItem, Tabs, TabsList, TabsTrigger, TabsContent, useToast } from "@the-rooms/ui";
import { LoadingSpinner } from "@the-rooms/ui";
import { LucideLoader2 as Loader2 } from "lucide-react";
import { FileText, Hash, Calendar, Percent, CreditCard, StickyNote, AlignLeft, CheckSquare } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TaxSettings {
    cgstRate: number;
    sgstRate: number;
    igstRate: number;
    defaultTaxType: string;
    hsnCode: string;
}

interface PaymentTerms {
    defaultPaymentTerms: string;
    allowPartPayment: boolean;
    autoReminderDays: number;
}

interface InvoiceSettings {
    invoicePrefix: string;
    invoiceNumberingFormat: string;
    defaultDueDays: number;
    taxSettings: TaxSettings;
    paymentTerms: PaymentTerms;
    invoiceNotes: string;
    invoiceTerms: string;
    invoiceFooter: string;
    showHotelAddress: boolean;
    showGstNumber: boolean;
    showPanNumber: boolean;
    panNumber: string;
}

// ─── API Functions ─────────────────────────────────────────────────────────────

async function fetchInvoiceSettings(): Promise<{ settings: InvoiceSettings }> {
    const res = await fetch("/api/settings/invoices");
    return res.json();
}

async function updateInvoiceSettings(data: Partial<InvoiceSettings>) {
    const res = await fetch("/api/settings/invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function InvoiceSettingsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("formatting");

    const [settings, setSettings] = useState<InvoiceSettings>({
        invoicePrefix: "INV",
        invoiceNumberingFormat: "BKN-YYYYMMDD-XXXX",
        defaultDueDays: 7,
        taxSettings: {
            cgstRate: 9,
            sgstRate: 9,
            igstRate: 18,
            defaultTaxType: "GST",
            hsnCode: "9963",
        },
        paymentTerms: {
            defaultPaymentTerms: "NET_15",
            allowPartPayment: true,
            autoReminderDays: 3,
        },
        invoiceNotes: "",
        invoiceTerms: "1. Payment due within 15 days of issue date.\n2. Late payments attract 18% interest per annum.\n3. Goods once sold will not be taken back.",
        invoiceFooter: "Thank you for your business!",
        showHotelAddress: true,
        showGstNumber: true,
        showPanNumber: false,
        panNumber: "",
    });

    useEffect(() => {
        async function loadSettings() {
            try {
                const data = await fetchInvoiceSettings();
                if (data.settings) {
                    setSettings(data.settings);
                }
            } catch (err) {
                console.error("Failed to fetch invoice settings:", err);
                toast({ type: "error", title: "Error", message: "Failed to load invoice settings." });
            } finally {
                setLoading(false);
            }
        }
        loadSettings();
    }, [toast]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateInvoiceSettings(settings);
            toast({ type: "success", title: "Saved", message: "Invoice settings saved successfully." });
        } catch (err) {
            console.error("Failed to save invoice settings:", err);
            toast({ type: "error", title: "Error", message: "Failed to save invoice settings." });
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = (key: keyof InvoiceSettings) => {
        if (typeof settings[key] === "boolean") {
            setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
        }
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
                title="Invoice Settings"
                description="Configure GST-compliant invoice formatting, tax rates, and payment terms"
                actions={
                    <Button onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Save Changes
                    </Button>
                }
            />

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="formatting">Formatting</TabsTrigger>
                    <TabsTrigger value="tax">Tax Settings</TabsTrigger>
                    <TabsTrigger value="payment">Payment Terms</TabsTrigger>
                    <TabsTrigger value="content">Content</TabsTrigger>
                </TabsList>

                {/* ─── Formatting Tab ─────────────────────────────────────────────── */}
                <TabsContent value="formatting" className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Invoice Prefix & Numbering */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-heading text-lg flex items-center gap-2">
                                    <Hash className="h-4 w-4 text-primary" />
                                    Invoice Numbering
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Invoice Prefix</Label>
                                    <Input
                                        value={settings.invoicePrefix}
                                        onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                                        placeholder="INV"
                                        maxLength={10}
                                    />
                                    <p className="text-xs text-muted-foreground">Prefix for all invoice numbers (e.g., INV, BILL)</p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Numbering Format</Label>
                                    <Input
                                        value={settings.invoiceNumberingFormat}
                                        onChange={(e) => setSettings({ ...settings, invoiceNumberingFormat: e.target.value })}
                                        placeholder="BKN-YYYYMMDD-XXXX"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Use: YYYY (year), MM (month), DD (day), XXXX (sequence). E.g., INV-20240615-0001
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Default Due Days</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="90"
                                        value={settings.defaultDueDays}
                                        onChange={(e) => setSettings({ ...settings, defaultDueDays: parseInt(e.target.value) || 0 })}
                                    />
                                    <p className="text-xs text-muted-foreground">Number of days until invoice is due</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Display Options */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-heading text-lg flex items-center gap-2">
                                    <CheckSquare className="h-4 w-4 text-primary" />
                                    Display Options
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {[
                                    { key: "showHotelAddress" as const, label: "Show Hotel Address", description: "Display hotel address on invoice" },
                                    { key: "showGstNumber" as const, label: "Show GST Number", description: "Display GST registration number" },
                                    { key: "showPanNumber" as const, label: "Show PAN Number", description: "Display PAN card number" },
                                ].map((item) => (
                                    <div key={item.key} className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-medium">{item.label}</p>
                                            <p className="text-xs text-muted-foreground">{item.description}</p>
                                        </div>
                                        <Switch
                                            checked={settings[item.key] as boolean}
                                            onCheckedChange={() => handleToggle(item.key)}
                                        />
                                    </div>
                                ))}

                                {settings.showPanNumber && (
                                    <div className="space-y-2 pt-2">
                                        <Label>PAN Number</Label>
                                        <Input
                                            value={settings.panNumber}
                                            onChange={(e) => setSettings({ ...settings, panNumber: e.target.value.toUpperCase() })}
                                            placeholder="AAAAA0000A"
                                            maxLength={10}
                                            className="font-mono"
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ─── Tax Settings Tab ───────────────────────────────────────────── */}
                <TabsContent value="tax" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-heading text-lg flex items-center gap-2">
                                <Percent className="h-4 w-4 text-primary" />
                                GST Tax Rates
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <div className="space-y-2">
                                    <Label>CGST Rate (%)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={settings.taxSettings.cgstRate}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            taxSettings: { ...settings.taxSettings, cgstRate: parseFloat(e.target.value) || 0 }
                                        })}
                                    />
                                    <p className="text-xs text-muted-foreground">Central GST</p>
                                </div>

                                <div className="space-y-2">
                                    <Label>SGST Rate (%)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={settings.taxSettings.sgstRate}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            taxSettings: { ...settings.taxSettings, sgstRate: parseFloat(e.target.value) || 0 }
                                        })}
                                    />
                                    <p className="text-xs text-muted-foreground">State GST</p>
                                </div>

                                <div className="space-y-2">
                                    <Label>IGST Rate (%)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={settings.taxSettings.igstRate}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            taxSettings: { ...settings.taxSettings, igstRate: parseFloat(e.target.value) || 0 }
                                        })}
                                    />
                                    <p className="text-xs text-muted-foreground">Integrated GST (interstate)</p>
                                </div>

                                <div className="space-y-2">
                                    <Label>HSN Code</Label>
                                    <Input
                                        value={settings.taxSettings.hsnCode}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            taxSettings: { ...settings.taxSettings, hsnCode: e.target.value }
                                        })}
                                        placeholder="9963"
                                    />
                                    <p className="text-xs text-muted-foreground">Harmonized System Nomenclature</p>
                                </div>
                            </div>

                            <div className="space-y-2 pt-4">
                                <Label>Default Tax Type</Label>
                                <Select
                                    value={settings.taxSettings.defaultTaxType}
                                    onValueChange={(v) => setSettings({
                                        ...settings,
                                        taxSettings: { ...settings.taxSettings, defaultTaxType: v }
                                    })}
                                >
                                    <SelectTrigger className="w-full sm:w-[200px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="GST">GST (CGST + SGST)</SelectItem>
                                        <SelectItem value="IGST">IGST (Interstate)</SelectItem>
                                        <SelectItem value="EXEMPT">Exempt</SelectItem>
                                        <SelectItem value="ZERO_RATED">Zero Rated</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">Tax type applied by default for intrastate transactions</p>
                            </div>

                            <div className="rounded-md bg-muted/50 p-4 mt-4">
                                <p className="text-sm font-medium mb-2">Current Tax Calculation</p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <span className="text-muted-foreground">CGST + SGST:</span>
                                    <span className="font-mono">{(settings.taxSettings.cgstRate + settings.taxSettings.sgstRate).toFixed(2)}%</span>
                                    <span className="text-muted-foreground">IGST (Interstate):</span>
                                    <span className="font-mono">{settings.taxSettings.igstRate.toFixed(2)}%</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ─── Payment Terms Tab ───────────────────────────────────────────── */}
                <TabsContent value="payment" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-heading text-lg flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-primary" />
                                Payment Terms
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-6 lg:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Default Payment Terms</Label>
                                    <Select
                                        value={settings.paymentTerms.defaultPaymentTerms}
                                        onValueChange={(v) => setSettings({
                                            ...settings,
                                            paymentTerms: { ...settings.paymentTerms, defaultPaymentTerms: v }
                                        })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="IMMEDIATE">Immediate</SelectItem>
                                            <SelectItem value="NET_7">Net 7 Days</SelectItem>
                                            <SelectItem value="NET_15">Net 15 Days</SelectItem>
                                            <SelectItem value="NET_30">Net 30 Days</SelectItem>
                                            <SelectItem value="NET_45">Net 45 Days</SelectItem>
                                            <SelectItem value="NET_60">Net 60 Days</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">Standard payment terms for invoices</p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Auto Reminder Days</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="30"
                                        value={settings.paymentTerms.autoReminderDays}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            paymentTerms: { ...settings.paymentTerms, autoReminderDays: parseInt(e.target.value) || 0 }
                                        })}
                                    />
                                    <p className="text-xs text-muted-foreground">Days before due date to send reminder</p>
                                </div>
                            </div>

                            <div className="flex items-start justify-between gap-4 pt-4 border-t">
                                <div>
                                    <p className="text-sm font-medium">Allow Part Payments</p>
                                    <p className="text-xs text-muted-foreground">Allow guests to pay invoices partially</p>
                                </div>
                                <Switch
                                    checked={settings.paymentTerms.allowPartPayment}
                                    onCheckedChange={(checked) => setSettings({
                                        ...settings,
                                        paymentTerms: { ...settings.paymentTerms, allowPartPayment: checked }
                                    })}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ─── Content Tab ───────────────────────────────────────────────── */}
                <TabsContent value="content" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-heading text-lg flex items-center gap-2">
                                <FileText className="h-4 w-4 text-primary" />
                                Invoice Content
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Invoice Notes</Label>
                                <textarea
                                    value={settings.invoiceNotes}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSettings({ ...settings, invoiceNotes: e.target.value })}
                                    placeholder="Notes to appear below line items..."
                                    rows={3}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px]"
                                />
                                <p className="text-xs text-muted-foreground">Optional notes that appear on the invoice (e.g., special requests)</p>
                            </div>

                            <div className="space-y-2">
                                <Label>Invoice Terms & Conditions</Label>
                                <textarea
                                    value={settings.invoiceTerms}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSettings({ ...settings, invoiceTerms: e.target.value })}
                                    placeholder="Enter terms and conditions..."
                                    rows={5}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[100px]"
                                />
                                <p className="text-xs text-muted-foreground">Standard terms and conditions displayed on invoices</p>
                            </div>

                            <div className="space-y-2">
                                <Label>Invoice Footer</Label>
                                <Input
                                    value={settings.invoiceFooter}
                                    onChange={(e) => setSettings({ ...settings, invoiceFooter: e.target.value })}
                                    placeholder="Thank you for your business!"
                                />
                                <p className="text-xs text-muted-foreground">Footer text shown on all invoices</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Preview Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-heading text-lg flex items-center gap-2">
                                <AlignLeft className="h-4 w-4 text-primary" />
                                Invoice Preview Snippet
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border bg-white p-4 text-sm space-y-2">
                                <div className="font-bold text-lg">{settings.invoicePrefix}-20240615-0001</div>
                                <div className="text-muted-foreground">Invoice Date: June 15, 2024</div>
                                <div className="text-muted-foreground">Due Date: June {14 + settings.defaultDueDays}, 2024</div>
                                <hr className="my-2" />
                                <div>Room Charges (2 nights)</div>
                                <div className="text-right font-mono">₹4,000.00</div>
                                <div className="flex justify-between">
                                    <span>CGST @ {settings.taxSettings.cgstRate}%</span>
                                    <span className="font-mono">₹360.00</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>SGST @ {settings.taxSettings.sgstRate}%</span>
                                    <span className="font-mono">₹360.00</span>
                                </div>
                                <hr className="my-2" />
                                <div className="flex justify-between font-bold">
                                    <span>Total</span>
                                    <span className="font-mono">₹4,720.00</span>
                                </div>
                                {settings.invoiceNotes && (
                                    <>
                                        <hr className="my-2" />
                                        <div className="text-muted-foreground text-xs italic">{settings.invoiceNotes}</div>
                                    </>
                                )}
                                <hr className="my-2" />
                                <div className="text-xs text-muted-foreground whitespace-pre-line">{settings.invoiceTerms}</div>
                                <div className="text-center text-xs text-muted-foreground pt-2">{settings.invoiceFooter}</div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
