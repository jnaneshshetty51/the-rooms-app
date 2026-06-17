"use client";

// apps/admin/src/app/(dashboard)/integrations/sms/page.tsx
// SMS and WhatsApp integration management page

import { useEffect, useState, useCallback } from "react";
import {
    MessageSquare,
    Settings,
    Send,
    CheckCircle,
    XCircle,
    Clock,
    Plus,
    RefreshCw,
    Search,
    Eye,
    Copy,
    Trash2,
    Bell,
    Smartphone,
    Globe,
    Variable,
    FileText,
    Activity,
} from "lucide-react";
import {
    PageHeader,
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    Input,
    Label,
    Select,
    SelectTrigger,
    SelectContent,
    SelectValue,
    SelectItem,
    Badge,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    Switch,
    StatCard,
    formatDate,
} from "@the-rooms/ui";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SMSProvider {
    id: string;
    name: string;
    provider: "TWILIO" | "MSG91" | "TEXTLOCAL" | "BULKSMS" | "AWS_SNS" | "CUSTOM";
    apiKey: string;
    apiSecret: string;
    senderId: string;
    isActive: boolean;
    config: Record<string, string>;
    createdAt: string;
    updatedAt: string;
}

interface WhatsAppConfig {
    id: string;
    provider: "META_BUSINESS" | "TWILIO_WHATSAPP" | "MSG91_WHATSAPP" | "360_DIALOG";
    phoneNumber: string;
    businessAccountId: string;
    apiKey: string;
    apiSecret: string;
    webhookUrl: string;
    webhookSecret: string;
    isActive: boolean;
    templateSyncEnabled: boolean;
    autoReplyEnabled: boolean;
    createdAt: string;
    updatedAt: string;
}

interface MessageTemplate {
    id: string;
    name: string;
    type: "SMS" | "WHATSAPP";
    category: "BOOKING" | "CHECKIN" | "CHECKOUT" | "REMINDER" | "MARKETING" | "OTP" | "ALERT" | "CUSTOM";
    content: string;
    variables: string[];
    isActive: boolean;
    approvedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

interface DeliveryLog {
    id: string;
    templateId: string | null;
    template: { name: string } | null;
    recipient: string;
    channel: "SMS" | "WHATSAPP";
    status: "SENT" | "DELIVERED" | "FAILED" | "PENDING" | "UNDELIVERED";
    provider: string;
    externalId: string | null;
    errorMessage: string | null;
    sentAt: string | null;
    deliveredAt: string | null;
    failedAt: string | null;
    createdAt: string;
}

interface SMSStats {
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    deliveryRate: number;
    todaySent: number;
}

// ─── API Functions ─────────────────────────────────────────────────────────────

async function fetchSMSProviders(): Promise<{ providers: SMSProvider[] }> {
    const res = await fetch("/api/integrations/sms/providers");
    return res.json();
}

async function fetchWhatsAppConfig(): Promise<{ config: WhatsAppConfig | null }> {
    const res = await fetch("/api/integrations/sms/whatsapp");
    return res.json();
}

async function fetchTemplates(type?: string): Promise<{ templates: MessageTemplate[] }> {
    const params = type ? `?type=${type}` : "";
    const res = await fetch(`/api/integrations/sms/templates${params}`);
    return res.json();
}

async function fetchDeliveryLogs(filters?: {
    status?: string;
    channel?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
}): Promise<{ logs: DeliveryLog[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.channel) params.set("channel", filters.channel);
    if (filters?.search) params.set("search", filters.search);
    if (filters?.fromDate) params.set("fromDate", filters.fromDate);
    if (filters?.toDate) params.set("toDate", filters.toDate);
    const res = await fetch(`/api/integrations/sms/logs?${params}`);
    return res.json();
}

async function fetchSMSStats(): Promise<{ stats: SMSStats }> {
    const res = await fetch("/api/integrations/sms/stats");
    return res.json();
}

async function updateSMSProvider(id: string, data: Partial<SMSProvider>) {
    const res = await fetch(`/api/integrations/sms/providers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

async function updateWhatsAppConfig(data: Partial<WhatsAppConfig>) {
    const res = await fetch("/api/integrations/sms/whatsapp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

async function updateTemplate(id: string, data: Partial<MessageTemplate>) {
    const res = await fetch(`/api/integrations/sms/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

async function sendTestMessage(recipient: string, content: string, channel: "SMS" | "WHATSAPP") {
    const res = await fetch("/api/integrations/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient, content, channel }),
    });
    return res.json();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SMSIntegrationPage() {
    const [activeTab, setActiveTab] = useState("providers");
    const [smsProviders, setSmsProviders] = useState<SMSProvider[]>([]);
    const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppConfig | null>(null);
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [deliveryLogs, setDeliveryLogs] = useState<DeliveryLog[]>([]);
    const [stats, setStats] = useState<SMSStats | null>(null);
    const [loading, setLoading] = useState(true);

    // Dialog states
    const [showProviderDialog, setShowProviderDialog] = useState(false);
    const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
    const [showTemplateDialog, setShowTemplateDialog] = useState(false);
    const [showTestMessageDialog, setShowTestMessageDialog] = useState(false);
    const [editingProvider, setEditingProvider] = useState<SMSProvider | null>(null);
    const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);

    // Filter states
    const [logFilters, setLogFilters] = useState({
        status: "ALL",
        channel: "ALL",
        search: "",
    });

    // Form states
    const [providerForm, setProviderForm] = useState({
        name: "",
        provider: "TWILIO" as SMSProvider["provider"],
        apiKey: "",
        apiSecret: "",
        senderId: "",
    });

    const [whatsappForm, setWhatsappForm] = useState({
        provider: "META_BUSINESS" as WhatsAppConfig["provider"],
        phoneNumber: "",
        businessAccountId: "",
        apiKey: "",
        apiSecret: "",
        webhookUrl: "",
        webhookSecret: "",
        templateSyncEnabled: false,
        autoReplyEnabled: false,
    });

    const [templateForm, setTemplateForm] = useState({
        name: "",
        type: "SMS" as MessageTemplate["type"],
        category: "CUSTOM" as MessageTemplate["category"],
        content: "",
    });

    const [testMessageForm, setTestMessageForm] = useState({
        recipient: "",
        content: "",
        channel: "SMS" as "SMS" | "WHATSAPP",
    });

    const [submitting, setSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [providersData, whatsappData, templatesData, logsData, statsData] = await Promise.all([
                fetchSMSProviders(),
                fetchWhatsAppConfig(),
                fetchTemplates(),
                fetchDeliveryLogs({
                    status: logFilters.status !== "ALL" ? logFilters.status : undefined,
                    channel: logFilters.channel !== "ALL" ? logFilters.channel : undefined,
                    search: logFilters.search || undefined,
                }),
                fetchSMSStats(),
            ]);

            setSmsProviders(providersData.providers ?? []);
            setWhatsappConfig(whatsappData.config);
            setTemplates(templatesData.templates ?? []);
            setDeliveryLogs(logsData.logs ?? []);
            setStats(statsData.stats);
        } catch (error) {
            console.error("Error fetching SMS integration data:", error);
        } finally {
            setLoading(false);
        }
    }, [logFilters]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    async function handleSaveProvider(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingProvider) {
                await updateSMSProvider(editingProvider.id, providerForm);
            } else {
                const res = await fetch("/api/integrations/sms/providers", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(providerForm),
                });
                if (!res.ok) throw new Error("Failed to create provider");
            }
            setShowProviderDialog(false);
            setEditingProvider(null);
            resetProviderForm();
            fetchData();
        } catch (error) {
            console.error("Error saving provider:", error);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleSaveWhatsApp(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            await updateWhatsAppConfig(whatsappForm);
            setShowWhatsAppDialog(false);
            fetchData();
        } catch (error) {
            console.error("Error saving WhatsApp config:", error);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleSaveTemplate(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingTemplate) {
                await updateTemplate(editingTemplate.id, templateForm);
            } else {
                const res = await fetch("/api/integrations/sms/templates", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(templateForm),
                });
                if (!res.ok) throw new Error("Failed to create template");
            }
            setShowTemplateDialog(false);
            setEditingTemplate(null);
            resetTemplateForm();
            fetchData();
        } catch (error) {
            console.error("Error saving template:", error);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleSendTestMessage(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            await sendTestMessage(
                testMessageForm.recipient,
                testMessageForm.content,
                testMessageForm.channel
            );
            setShowTestMessageDialog(false);
            resetTestMessageForm();
            fetchData();
        } catch (error) {
            console.error("Error sending test message:", error);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleToggleProvider(provider: SMSProvider) {
        await updateSMSProvider(provider.id, { isActive: !provider.isActive });
        fetchData();
    }

    async function handleToggleTemplate(template: MessageTemplate) {
        await updateTemplate(template.id, { isActive: !template.isActive });
        fetchData();
    }

    function resetProviderForm() {
        setProviderForm({
            name: "",
            provider: "TWILIO",
            apiKey: "",
            apiSecret: "",
            senderId: "",
        });
    }

    function resetTemplateForm() {
        setTemplateForm({
            name: "",
            type: "SMS",
            category: "CUSTOM",
            content: "",
        });
    }

    function resetTestMessageForm() {
        setTestMessageForm({
            recipient: "",
            content: "",
            channel: "SMS",
        });
    }

    function openEditProvider(provider: SMSProvider) {
        setEditingProvider(provider);
        setProviderForm({
            name: provider.name,
            provider: provider.provider,
            apiKey: provider.apiKey,
            apiSecret: provider.apiSecret,
            senderId: provider.senderId,
        });
        setShowProviderDialog(true);
    }

    function openEditTemplate(template: MessageTemplate) {
        setEditingTemplate(template);
        setTemplateForm({
            name: template.name,
            type: template.type,
            category: template.category,
            content: template.content,
        });
        setShowTemplateDialog(true);
    }

    function getStatusIcon(status: DeliveryLog["status"]) {
        switch (status) {
            case "DELIVERED":
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case "FAILED":
            case "UNDELIVERED":
                return <XCircle className="h-4 w-4 text-red-500" />;
            case "PENDING":
            case "SENT":
                return <Clock className="h-4 w-4 text-yellow-500" />;
            default:
                return <Clock className="h-4 w-4 text-muted-foreground" />;
        }
    }

    function getStatusBadge(status: DeliveryLog["status"]) {
        const variants = {
            DELIVERED: "success" as const,
            SENT: "outline" as const,
            PENDING: "warning" as const,
            FAILED: "destructive" as const,
            UNDELIVERED: "destructive" as const,
        };
        return (
            <Badge variant={variants[status] ?? "outline"}>
                {status}
            </Badge>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="SMS & WhatsApp Integration"
                description="Configure SMS and WhatsApp messaging providers, templates, and delivery logs"
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowTestMessageDialog(true)}>
                            <Send className="h-4 w-4 mr-1.5" />
                            Send Test
                        </Button>
                        <Button onClick={() => { resetProviderForm(); setEditingProvider(null); setShowProviderDialog(true); }}>
                            <Plus className="h-4 w-4 mr-1.5" />
                            Add Provider
                        </Button>
                    </div>
                }
            />

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <StatCard
                    label="Total Sent"
                    value={stats?.totalSent ?? 0}
                    icon={Send}
                />
                <StatCard
                    label="Delivered"
                    value={stats?.totalDelivered ?? 0}
                    icon={CheckCircle}
                />
                <StatCard
                    label="Failed"
                    value={stats?.totalFailed ?? 0}
                    icon={XCircle}
                />
                <StatCard
                    label="Delivery Rate"
                    value={`${stats?.deliveryRate ?? 0}%`}
                    icon={Activity}
                />
                <StatCard
                    label="Today Sent"
                    value={stats?.todaySent ?? 0}
                    icon={Bell}
                />
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="providers">SMS Providers</TabsTrigger>
                    <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
                    <TabsTrigger value="templates">Templates</TabsTrigger>
                    <TabsTrigger value="logs">Delivery Logs</TabsTrigger>
                </TabsList>

                {/* SMS Providers Tab */}
                <TabsContent value="providers" className="space-y-4">
                    {loading ? (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
                            ))}
                        </div>
                    ) : smsProviders.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <Smartphone className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                                <p className="text-muted-foreground mb-4">No SMS providers configured yet.</p>
                                <Button onClick={() => { resetProviderForm(); setEditingProvider(null); setShowProviderDialog(true); }}>
                                    <Plus className="h-4 w-4 mr-1.5" />
                                    Add Your First Provider
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {smsProviders.map((provider) => (
                                <Card key={provider.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                    <CardContent className="p-4 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                                                    <MessageSquare className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <h3 className="font-heading font-bold">{provider.name}</h3>
                                                    <p className="text-xs text-muted-foreground">{provider.provider}</p>
                                                </div>
                                            </div>
                                            <Badge variant={provider.isActive ? "success" : "secondary"}>
                                                {provider.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </div>

                                        <div className="text-xs text-muted-foreground space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Globe className="h-3 w-3" />
                                                <span>Sender ID: {provider.senderId || "Not set"}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Key className="h-3 w-3" />
                                                <span>API Key: {provider.apiKey ? "••••••••" : "Not configured"}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 pt-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => openEditProvider(provider)}
                                            >
                                                <Settings className="h-3.5 w-3.5 mr-1" />
                                                Configure
                                            </Button>
                                            <Button
                                                variant={provider.isActive ? "destructive" : "default"}
                                                size="sm"
                                                onClick={() => handleToggleProvider(provider)}
                                            >
                                                {provider.isActive ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* WhatsApp Tab */}
                <TabsContent value="whatsapp" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Globe className="h-5 w-5" />
                                WhatsApp Business Configuration
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {whatsappConfig ? (
                                <div className="space-y-4">
                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        <div className="space-y-1">
                                            <Label className="text-muted-foreground">Provider</Label>
                                            <p className="font-medium">{whatsappConfig.provider}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-muted-foreground">Phone Number</Label>
                                            <p className="font-medium">{whatsappConfig.phoneNumber || "Not configured"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-muted-foreground">Business Account ID</Label>
                                            <p className="font-medium">{whatsappConfig.businessAccountId || "Not configured"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-muted-foreground">API Key</Label>
                                            <p className="font-medium">{whatsappConfig.apiKey ? "••••••••" : "Not configured"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-muted-foreground">Webhook URL</Label>
                                            <p className="font-medium">{whatsappConfig.webhookUrl || "Not configured"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-muted-foreground">Status</Label>
                                            <Badge variant={whatsappConfig.isActive ? "success" : "secondary"}>
                                                {whatsappConfig.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 pt-4 border-t">
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={whatsappConfig.templateSyncEnabled}
                                                disabled
                                            />
                                            <Label>Template Sync</Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={whatsappConfig.autoReplyEnabled}
                                                disabled
                                            />
                                            <Label>Auto Reply</Label>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-4">
                                        <Button variant="outline" onClick={() => {
                                            setWhatsappForm({
                                                provider: whatsappConfig.provider,
                                                phoneNumber: whatsappConfig.phoneNumber,
                                                businessAccountId: whatsappConfig.businessAccountId,
                                                apiKey: whatsappConfig.apiKey,
                                                apiSecret: whatsappConfig.apiSecret,
                                                webhookUrl: whatsappConfig.webhookUrl,
                                                webhookSecret: whatsappConfig.webhookSecret,
                                                templateSyncEnabled: whatsappConfig.templateSyncEnabled,
                                                autoReplyEnabled: whatsappConfig.autoReplyEnabled,
                                            });
                                            setShowWhatsAppDialog(true);
                                        }}>
                                            <Settings className="h-4 w-4 mr-1.5" />
                                            Configure
                                        </Button>
                                        <Button
                                            variant={whatsappConfig.isActive ? "destructive" : "default"}
                                            onClick={() => updateWhatsAppConfig({ isActive: !whatsappConfig.isActive }).then(fetchData)}
                                        >
                                            {whatsappConfig.isActive ? "Deactivate" : "Activate"}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                                    <p className="text-muted-foreground mb-4">WhatsApp Business API not configured.</p>
                                    <Button onClick={() => {
                                        setWhatsappForm({
                                            provider: "META_BUSINESS",
                                            phoneNumber: "",
                                            businessAccountId: "",
                                            apiKey: "",
                                            apiSecret: "",
                                            webhookUrl: "",
                                            webhookSecret: "",
                                            templateSyncEnabled: false,
                                            autoReplyEnabled: false,
                                        });
                                        setShowWhatsAppDialog(true);
                                    }}>
                                        <Plus className="h-4 w-4 mr-1.5" />
                                        Configure WhatsApp
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Templates Tab */}
                <TabsContent value="templates" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                            <Select value={templateForm.type} onValueChange={(v) => setTemplateForm({ ...templateForm, type: v as "SMS" | "WHATSAPP" })}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Filter by type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Types</SelectItem>
                                    <SelectItem value="SMS">SMS</SelectItem>
                                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={() => { resetTemplateForm(); setEditingTemplate(null); setShowTemplateDialog(true); }}>
                            <Plus className="h-4 w-4 mr-1.5" />
                            Add Template
                        </Button>
                    </div>

                    {loading ? (
                        <div className="h-64 animate-pulse rounded-xl bg-muted" />
                    ) : templates.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                                <p className="text-muted-foreground mb-4">No templates created yet.</p>
                                <Button onClick={() => { resetTemplateForm(); setEditingTemplate(null); setShowTemplateDialog(true); }}>
                                    <Plus className="h-4 w-4 mr-1.5" />
                                    Create Your First Template
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                            {templates.map((template) => (
                                <Card key={template.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-muted-foreground" />
                                                <h3 className="font-heading font-bold">{template.name}</h3>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">{template.type}</Badge>
                                                <Badge variant={template.isActive ? "success" : "secondary"}>
                                                    {template.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs">
                                                {template.category}
                                            </Badge>
                                            {template.variables.length > 0 && (
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Variable className="h-3 w-3" />
                                                    {template.variables.length} variables
                                                </div>
                                            )}
                                        </div>

                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {template.content}
                                        </p>

                                        {template.approvedAt && (
                                            <p className="text-xs text-green-600">
                                                Approved on {formatDate(template.approvedAt, "short")}
                                            </p>
                                        )}

                                        <div className="flex items-center gap-1 pt-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => openEditTemplate(template)}
                                            >
                                                <Settings className="h-3.5 w-3.5 mr-1" />
                                                Edit
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(template.content);
                                                }}
                                            >
                                                <Copy className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant={template.isActive ? "destructive" : "default"}
                                                size="sm"
                                                onClick={() => handleToggleTemplate(template)}
                                            >
                                                {template.isActive ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Delivery Logs Tab */}
                <TabsContent value="logs" className="space-y-4">
                    {/* Filters */}
                    <div className="flex flex-wrap gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by recipient..."
                                value={logFilters.search}
                                onChange={(e) => setLogFilters({ ...logFilters, search: e.target.value })}
                                className="pl-9"
                            />
                        </div>
                        <Select value={logFilters.status} onValueChange={(v) => setLogFilters({ ...logFilters, status: v })}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Status</SelectItem>
                                <SelectItem value="SENT">Sent</SelectItem>
                                <SelectItem value="DELIVERED">Delivered</SelectItem>
                                <SelectItem value="FAILED">Failed</SelectItem>
                                <SelectItem value="PENDING">Pending</SelectItem>
                                <SelectItem value="UNDELIVERED">Undelivered</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={logFilters.channel} onValueChange={(v) => setLogFilters({ ...logFilters, channel: v })}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Channel" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Channels</SelectItem>
                                <SelectItem value="SMS">SMS</SelectItem>
                                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" onClick={fetchData}>
                            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        </Button>
                    </div>

                    {/* Logs Table */}
                    <Card>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="h-64 flex items-center justify-center">
                                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : deliveryLogs.length === 0 ? (
                                <div className="py-12 text-center">
                                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                                    <p className="text-muted-foreground">No delivery logs found.</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Recipient</TableHead>
                                            <TableHead>Channel</TableHead>
                                            <TableHead>Template</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Provider</TableHead>
                                            <TableHead>Sent At</TableHead>
                                            <TableHead>Delivered At</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {deliveryLogs.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell className="font-mono text-sm">{log.recipient}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{log.channel}</Badge>
                                                </TableCell>
                                                <TableCell>{log.template?.name ?? "—"}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {getStatusIcon(log.status)}
                                                        {getStatusBadge(log.status)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{log.provider}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {log.sentAt ? formatDate(log.sentAt, "short") : "—"}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {log.deliveredAt ? formatDate(log.deliveredAt, "short") : "—"}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Provider Dialog */}
            {showProviderDialog && (
                <Dialog open={showProviderDialog} onOpenChange={setShowProviderDialog}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>
                                {editingProvider ? "Edit SMS Provider" : "Add SMS Provider"}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSaveProvider} className="space-y-4">
                            <div>
                                <Label>Provider Name *</Label>
                                <Input
                                    value={providerForm.name}
                                    onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })}
                                    placeholder="e.g., Production SMS"
                                    required
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Provider *</Label>
                                <Select
                                    value={providerForm.provider}
                                    onValueChange={(v) => setProviderForm({ ...providerForm, provider: v as SMSProvider["provider"] })}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="TWILIO">Twilio</SelectItem>
                                        <SelectItem value="MSG91">MSG91</SelectItem>
                                        <SelectItem value="TEXTLOCAL">Textlocal</SelectItem>
                                        <SelectItem value="BULKSMS">BulkSMS</SelectItem>
                                        <SelectItem value="AWS_SNS">AWS SNS</SelectItem>
                                        <SelectItem value="CUSTOM">Custom</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>API Key *</Label>
                                <Input
                                    type="password"
                                    value={providerForm.apiKey}
                                    onChange={(e) => setProviderForm({ ...providerForm, apiKey: e.target.value })}
                                    placeholder="Enter API key"
                                    required
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>API Secret</Label>
                                <Input
                                    type="password"
                                    value={providerForm.apiSecret}
                                    onChange={(e) => setProviderForm({ ...providerForm, apiSecret: e.target.value })}
                                    placeholder="Enter API secret"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Sender ID *</Label>
                                <Input
                                    value={providerForm.senderId}
                                    onChange={(e) => setProviderForm({ ...providerForm, senderId: e.target.value })}
                                    placeholder="e.g., HOTELX"
                                    required
                                    className="mt-1"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowProviderDialog(false)} className="flex-1">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={submitting} className="flex-1">
                                    {submitting ? "Saving..." : editingProvider ? "Update" : "Add Provider"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            )}

            {/* WhatsApp Dialog */}
            {showWhatsAppDialog && (
                <Dialog open={showWhatsAppDialog} onOpenChange={setShowWhatsAppDialog}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>WhatsApp Business Configuration</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSaveWhatsApp} className="space-y-4">
                            <div>
                                <Label>Provider *</Label>
                                <Select
                                    value={whatsappForm.provider}
                                    onValueChange={(v) => setWhatsappForm({ ...whatsappForm, provider: v as WhatsAppConfig["provider"] })}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="META_BUSINESS">Meta Business API</SelectItem>
                                        <SelectItem value="TWILIO_WHATSAPP">Twilio WhatsApp</SelectItem>
                                        <SelectItem value="MSG91_WHATSAPP">MSG91 WhatsApp</SelectItem>
                                        <SelectItem value="360_DIALOG">360 Dialog</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Phone Number *</Label>
                                <Input
                                    value={whatsappForm.phoneNumber}
                                    onChange={(e) => setWhatsappForm({ ...whatsappForm, phoneNumber: e.target.value })}
                                    placeholder="+91XXXXXXXXXX"
                                    required
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Business Account ID</Label>
                                <Input
                                    value={whatsappForm.businessAccountId}
                                    onChange={(e) => setWhatsappForm({ ...whatsappForm, businessAccountId: e.target.value })}
                                    placeholder="Facebook Business Account ID"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>API Key *</Label>
                                <Input
                                    type="password"
                                    value={whatsappForm.apiKey}
                                    onChange={(e) => setWhatsappForm({ ...whatsappForm, apiKey: e.target.value })}
                                    placeholder="Enter API key"
                                    required
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>API Secret</Label>
                                <Input
                                    type="password"
                                    value={whatsappForm.apiSecret}
                                    onChange={(e) => setWhatsappForm({ ...whatsappForm, apiSecret: e.target.value })}
                                    placeholder="Enter API secret"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Webhook URL</Label>
                                <Input
                                    value={whatsappForm.webhookUrl}
                                    onChange={(e) => setWhatsappForm({ ...whatsappForm, webhookUrl: e.target.value })}
                                    placeholder="https://your-domain.com/api/webhooks/whatsapp"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Webhook Secret</Label>
                                <Input
                                    type="password"
                                    value={whatsappForm.webhookSecret}
                                    onChange={(e) => setWhatsappForm({ ...whatsappForm, webhookSecret: e.target.value })}
                                    placeholder="Webhook verification token"
                                    className="mt-1"
                                />
                            </div>
                            <div className="flex items-center gap-4 pt-2">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={whatsappForm.templateSyncEnabled}
                                        onCheckedChange={(checked) => setWhatsappForm({ ...whatsappForm, templateSyncEnabled: checked })}
                                    />
                                    <Label>Enable Template Sync</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={whatsappForm.autoReplyEnabled}
                                        onCheckedChange={(checked) => setWhatsappForm({ ...whatsappForm, autoReplyEnabled: checked })}
                                    />
                                    <Label>Enable Auto Reply</Label>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowWhatsAppDialog(false)} className="flex-1">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={submitting} className="flex-1">
                                    {submitting ? "Saving..." : "Save Configuration"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            )}

            {/* Template Dialog */}
            {showTemplateDialog && (
                <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>
                                {editingTemplate ? "Edit Template" : "Add Message Template"}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSaveTemplate} className="space-y-4">
                            <div>
                                <Label>Template Name *</Label>
                                <Input
                                    value={templateForm.name}
                                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                                    placeholder="e.g., Booking Confirmation"
                                    required
                                    className="mt-1"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Channel *</Label>
                                    <Select
                                        value={templateForm.type}
                                        onValueChange={(v) => setTemplateForm({ ...templateForm, type: v as "SMS" | "WHATSAPP" })}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="SMS">SMS</SelectItem>
                                            <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Category *</Label>
                                    <Select
                                        value={templateForm.category}
                                        onValueChange={(v) => setTemplateForm({ ...templateForm, category: v as MessageTemplate["category"] })}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="BOOKING">Booking</SelectItem>
                                            <SelectItem value="CHECKIN">Check-in</SelectItem>
                                            <SelectItem value="CHECKOUT">Check-out</SelectItem>
                                            <SelectItem value="REMINDER">Reminder</SelectItem>
                                            <SelectItem value="MARKETING">Marketing</SelectItem>
                                            <SelectItem value="OTP">OTP</SelectItem>
                                            <SelectItem value="ALERT">Alert</SelectItem>
                                            <SelectItem value="CUSTOM">Custom</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div>
                                <Label>Message Content *</Label>
                                <p className="text-xs text-muted-foreground mb-1">
                                    Use {"{{variable}}"} for dynamic content. e.g., {"{{guest_name}}"}, {"{{booking_number}}"}
                                </p>
                                <textarea
                                    value={templateForm.content}
                                    onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                                    placeholder="Enter your message template..."
                                    required
                                    rows={5}
                                    className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowTemplateDialog(false)} className="flex-1">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={submitting} className="flex-1">
                                    {submitting ? "Saving..." : editingTemplate ? "Update" : "Create Template"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            )}

            {/* Test Message Dialog */}
            {showTestMessageDialog && (
                <Dialog open={showTestMessageDialog} onOpenChange={setShowTestMessageDialog}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Send Test Message</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSendTestMessage} className="space-y-4">
                            <div>
                                <Label>Channel *</Label>
                                <Select
                                    value={testMessageForm.channel}
                                    onValueChange={(v) => setTestMessageForm({ ...testMessageForm, channel: v as "SMS" | "WHATSAPP" })}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SMS">SMS</SelectItem>
                                        <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Recipient *</Label>
                                <Input
                                    value={testMessageForm.recipient}
                                    onChange={(e) => setTestMessageForm({ ...testMessageForm, recipient: e.target.value })}
                                    placeholder="+91XXXXXXXXXX"
                                    required
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Message *</Label>
                                <textarea
                                    value={testMessageForm.content}
                                    onChange={(e) => setTestMessageForm({ ...testMessageForm, content: e.target.value })}
                                    placeholder="Enter your test message..."
                                    required
                                    rows={4}
                                    className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary mt-1"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowTestMessageDialog(false)} className="flex-1">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={submitting} className="flex-1">
                                    {submitting ? "Sending..." : "Send Message"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

// Missing Key icon import helper
function Key({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
        </svg>
    );
}
