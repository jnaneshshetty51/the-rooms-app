"use client";

// apps/admin/src/app/(dashboard)/integrations/payments/page.tsx
// Payment gateway integration management page

import { useEffect, useState, useCallback } from "react";
import {
    CreditCard,
    Settings,
    Plus,
    RefreshCw,
    Search,
    Eye,
    Trash2,
    Globe,
    Key,
    Webhook,
    Link2,
    CheckCircle,
    XCircle,
    Clock,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    Receipt,
    AlertTriangle,
    EyeOff,
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

interface PaymentGateway {
    id: string;
    name: string;
    provider: "RAZORPAY" | "INDUSIND" | "IDFC" | "PAYTM" | "PHONEPE" | "CASH" | "CUSTOM";
    merchantId: string;
    apiKey: string;
    apiSecret: string;
    webhookUrl: string;
    webhookSecret: string;
    isActive: boolean;
    isDefault: boolean;
    config: Record<string, string>;
    supportedMethods: string[];
    createdAt: string;
    updatedAt: string;
}

interface TransactionRecord {
    id: string;
    gatewayId: string | null;
    gateway: { name: string; provider: string } | null;
    bookingId: string | null;
    booking: { bookingNumber: string; guest: { name: string } } | null;
    amount: number;
    currency: string;
    status: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED" | "PARTIAL_REFUND";
    paymentMethod: string;
    transactionId: string;
    externalTransactionId: string | null;
    errorMessage: string | null;
    refundAmount: number | null;
    refundReason: string | null;
    refundId: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    updatedAt: string;
}

interface GatewayStats {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    totalAmount: number;
    successRate: number;
    todayTransactions: number;
    todayAmount: number;
}

interface WebhookEvent {
    id: string;
    gatewayId: string;
    gateway: { name: string };
    eventType: string;
    eventData: Record<string, unknown>;
    status: "PROCESSED" | "FAILED" | "PENDING";
    errorMessage: string | null;
    processedAt: string | null;
    createdAt: string;
}

// ─── API Functions ─────────────────────────────────────────────────────────────

async function fetchGateways(): Promise<{ gateways: PaymentGateway[] }> {
    const res = await fetch("/api/integrations/payments/gateways");
    return res.json();
}

async function fetchTransactions(filters?: {
    gatewayId?: string;
    status?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
}): Promise<{ transactions: TransactionRecord[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.gatewayId) params.set("gatewayId", filters.gatewayId);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.search) params.set("search", filters.search);
    if (filters?.fromDate) params.set("fromDate", filters.fromDate);
    if (filters?.toDate) params.set("toDate", filters.toDate);
    const res = await fetch(`/api/integrations/payments/transactions?${params}`);
    return res.json();
}

async function fetchGatewayStats(): Promise<{ stats: GatewayStats }> {
    const res = await fetch("/api/integrations/payments/stats");
    return res.json();
}

async function fetchWebhookEvents(filters?: {
    gatewayId?: string;
    status?: string;
}): Promise<{ events: WebhookEvent[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.gatewayId) params.set("gatewayId", filters.gatewayId);
    if (filters?.status) params.set("status", filters.status);
    const res = await fetch(`/api/integrations/payments/webhooks?${params}`);
    return res.json();
}

async function updateGateway(id: string, data: Partial<PaymentGateway>) {
    const res = await fetch(`/api/integrations/payments/gateways/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

async function createGateway(data: Partial<PaymentGateway>) {
    const res = await fetch("/api/integrations/payments/gateways", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

async function deleteGateway(id: string) {
    const res = await fetch(`/api/integrations/payments/gateways/${id}`, {
        method: "DELETE",
    });
    return res.json();
}

async function setDefaultGateway(id: string) {
    const res = await fetch(`/api/integrations/payments/gateways/${id}/set-default`, {
        method: "POST",
    });
    return res.json();
}

async function refundTransaction(id: string, amount: number, reason: string) {
    const res = await fetch(`/api/integrations/payments/transactions/${id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, reason }),
    });
    return res.json();
}

async function testGatewayConnection(id: string) {
    const res = await fetch(`/api/integrations/payments/gateways/${id}/test`, {
        method: "POST",
    });
    return res.json();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PaymentGatewaysPage() {
    const [activeTab, setActiveTab] = useState("gateways");
    const [gateways, setGateways] = useState<PaymentGateway[]>([]);
    const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
    const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
    const [stats, setStats] = useState<GatewayStats | null>(null);
    const [loading, setLoading] = useState(true);

    // Dialog states
    const [showGatewayDialog, setShowGatewayDialog] = useState(false);
    const [showRefundDialog, setShowRefundDialog] = useState(false);
    const [showViewTransactionDialog, setShowViewTransactionDialog] = useState(false);
    const [editingGateway, setEditingGateway] = useState<PaymentGateway | null>(null);
    const [viewingTransaction, setViewingTransaction] = useState<TransactionRecord | null>(null);
    const [refundTransactionId, setRefundTransactionId] = useState<string | null>(null);

    // Filter states
    const [filters, setFilters] = useState({
        gatewayId: "ALL",
        status: "ALL",
        search: "",
    });

    // Form states
    const [gatewayForm, setGatewayForm] = useState({
        name: "",
        provider: "RAZORPAY" as PaymentGateway["provider"],
        merchantId: "",
        apiKey: "",
        apiSecret: "",
        webhookUrl: "",
        webhookSecret: "",
        supportedMethods: [] as string[],
        isDefault: false,
    });

    const [refundForm, setRefundForm] = useState({
        amount: "",
        reason: "",
    });

    const [submitting, setSubmitting] = useState(false);
    const [testingGateway, setTestingGateway] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [gatewaysData, transactionsData, statsData, webhookData] = await Promise.all([
                fetchGateways(),
                fetchTransactions({
                    gatewayId: filters.gatewayId !== "ALL" ? filters.gatewayId : undefined,
                    status: filters.status !== "ALL" ? filters.status : undefined,
                    search: filters.search || undefined,
                }),
                fetchGatewayStats(),
                fetchWebhookEvents(),
            ]);

            setGateways(gatewaysData.gateways ?? []);
            setTransactions(transactionsData.transactions ?? []);
            setStats(statsData.stats);
            setWebhookEvents(webhookData.events ?? []);
        } catch (error) {
            console.error("Error fetching payment gateway data:", error);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    async function handleSaveGateway(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingGateway) {
                await updateGateway(editingGateway.id, gatewayForm);
            } else {
                await createGateway(gatewayForm);
            }
            setShowGatewayDialog(false);
            setEditingGateway(null);
            resetGatewayForm();
            fetchData();
        } catch (error) {
            console.error("Error saving gateway:", error);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDeleteGateway(id: string) {
        if (!confirm("Are you sure you want to delete this gateway? This action cannot be undone.")) {
            return;
        }
        try {
            await deleteGateway(id);
            fetchData();
        } catch (error) {
            console.error("Error deleting gateway:", error);
        }
    }

    async function handleToggleGateway(gateway: PaymentGateway) {
        await updateGateway(gateway.id, { isActive: !gateway.isActive });
        fetchData();
    }

    async function handleSetDefault(gateway: PaymentGateway) {
        await setDefaultGateway(gateway.id);
        fetchData();
    }

    async function handleTestConnection(gateway: PaymentGateway) {
        setTestingGateway(gateway.id);
        try {
            const result = await testGatewayConnection(gateway.id);
            alert(result.success ? "Connection successful!" : `Connection failed: ${result.error}`);
        } catch (error) {
            alert("Connection test failed");
        } finally {
            setTestingGateway(null);
        }
    }

    async function handleRefund(e: React.FormEvent) {
        e.preventDefault();
        if (!refundTransactionId) return;

        setSubmitting(true);
        try {
            await refundTransaction(
                refundTransactionId,
                parseFloat(refundForm.amount),
                refundForm.reason
            );
            setShowRefundDialog(false);
            setRefundTransactionId(null);
            resetRefundForm();
            fetchData();
        } catch (error) {
            console.error("Error processing refund:", error);
        } finally {
            setSubmitting(false);
        }
    }

    function resetGatewayForm() {
        setGatewayForm({
            name: "",
            provider: "RAZORPAY",
            merchantId: "",
            apiKey: "",
            apiSecret: "",
            webhookUrl: "",
            webhookSecret: "",
            supportedMethods: [],
            isDefault: false,
        });
    }

    function resetRefundForm() {
        setRefundForm({
            amount: "",
            reason: "",
        });
    }

    function openEditGateway(gateway: PaymentGateway) {
        setEditingGateway(gateway);
        setGatewayForm({
            name: gateway.name,
            provider: gateway.provider,
            merchantId: gateway.merchantId,
            apiKey: gateway.apiKey,
            apiSecret: gateway.apiSecret,
            webhookUrl: gateway.webhookUrl,
            webhookSecret: gateway.webhookSecret,
            supportedMethods: gateway.supportedMethods,
            isDefault: gateway.isDefault,
        });
        setShowGatewayDialog(true);
    }

    function openRefundDialog(transaction: TransactionRecord) {
        setRefundTransactionId(transaction.id);
        setRefundForm({
            amount: transaction.amount.toString(),
            reason: "",
        });
        setShowRefundDialog(true);
    }

    function openViewTransaction(transaction: TransactionRecord) {
        setViewingTransaction(transaction);
        setShowViewTransactionDialog(true);
    }

    function getProviderIcon(provider: string) {
        return <CreditCard className="h-5 w-5" />;
    }

    function getStatusIcon(status: TransactionRecord["status"]) {
        switch (status) {
            case "SUCCESS":
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case "FAILED":
                return <XCircle className="h-4 w-4 text-red-500" />;
            case "PENDING":
                return <Clock className="h-4 w-4 text-yellow-500" />;
            case "REFUNDED":
            case "PARTIAL_REFUND":
                return <ArrowDownRight className="h-4 w-4 text-blue-500" />;
            default:
                return <Clock className="h-4 w-4 text-muted-foreground" />;
        }
    }

    function getStatusBadge(status: TransactionRecord["status"]) {
        const variants: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
            SUCCESS: "success",
            PENDING: "warning",
            FAILED: "destructive",
            REFUNDED: "secondary",
            PARTIAL_REFUND: "outline",
        };
        return (
            <Badge variant={variants[status] ?? "outline"}>
                {status.replace("_", " ")}
            </Badge>
        );
    }

    const filteredTransactions = transactions;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Payment Gateways"
                description="Configure payment gateways, manage transactions, and view webhook events"
                actions={
                    <Button onClick={() => { resetGatewayForm(); setEditingGateway(null); setShowGatewayDialog(true); }}>
                        <Plus className="h-4 w-4 mr-1.5" />
                        Add Gateway
                    </Button>
                }
            />

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <StatCard
                    label="Total Transactions"
                    value={stats?.totalTransactions ?? 0}
                    icon={CreditCard}
                />
                <StatCard
                    label="Successful"
                    value={stats?.successfulTransactions ?? 0}
                    icon={CheckCircle}
                />
                <StatCard
                    label="Failed"
                    value={stats?.failedTransactions ?? 0}
                    icon={XCircle}
                />
                <StatCard
                    label="Success Rate"
                    value={`${stats?.successRate ?? 0}%`}
                    icon={Activity}
                />
                <StatCard
                    label="Today Amount"
                    value={`₹${(stats?.todayAmount ?? 0).toLocaleString()}`}
                    icon={Receipt}
                />
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="gateways">Gateways</TabsTrigger>
                    <TabsTrigger value="transactions">Transactions</TabsTrigger>
                    <TabsTrigger value="webhooks">Webhook Events</TabsTrigger>
                </TabsList>

                {/* Gateways Tab */}
                <TabsContent value="gateways" className="space-y-4">
                    {loading ? (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-56 animate-pulse rounded-xl bg-muted" />
                            ))}
                        </div>
                    ) : gateways.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                                <p className="text-muted-foreground mb-4">No payment gateways configured yet.</p>
                                <Button onClick={() => { resetGatewayForm(); setEditingGateway(null); setShowGatewayDialog(true); }}>
                                    <Plus className="h-4 w-4 mr-1.5" />
                                    Add Your First Gateway
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {gateways.map((gateway) => (
                                <Card key={gateway.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                    <CardContent className="p-4 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                                                    {getProviderIcon(gateway.provider)}
                                                </div>
                                                <div>
                                                    <h3 className="font-heading font-bold">{gateway.name}</h3>
                                                    <p className="text-xs text-muted-foreground">{gateway.provider}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <Badge variant={gateway.isActive ? "success" : "secondary"}>
                                                    {gateway.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                                {gateway.isDefault && (
                                                    <Badge variant="outline" className="text-xs">Default</Badge>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-xs text-muted-foreground space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Globe className="h-3 w-3" />
                                                <span>Merchant ID: {gateway.merchantId || "Not set"}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Key className="h-3 w-3" />
                                                <span>API Key: {gateway.apiKey ? "••••••••" : "Not configured"}</span>
                                            </div>
                                            {gateway.webhookUrl && (
                                                <div className="flex items-center gap-2">
                                                    <Webhook className="h-3 w-3" />
                                                    <span className="truncate max-w-[200px]">Webhook: {gateway.webhookUrl}</span>
                                                </div>
                                            )}
                                        </div>

                                        {gateway.supportedMethods.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {gateway.supportedMethods.map((method) => (
                                                    <Badge key={method} variant="outline" className="text-[10px]">
                                                        {method}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-1 pt-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => openEditGateway(gateway)}
                                            >
                                                <Settings className="h-3.5 w-3.5 mr-1" />
                                                Configure
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleTestConnection(gateway)}
                                                disabled={testingGateway === gateway.id}
                                                title="Test connection"
                                            >
                                                <RefreshCw className={`h-3.5 w-3.5 ${testingGateway === gateway.id ? "animate-spin" : ""}`} />
                                            </Button>
                                            {!gateway.isDefault && gateway.isActive && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleSetDefault(gateway)}
                                                    title="Set as default"
                                                >
                                                    <CheckCircle className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                            <Button
                                                variant={gateway.isActive ? "destructive" : "default"}
                                                size="sm"
                                                onClick={() => handleToggleGateway(gateway)}
                                            >
                                                {gateway.isActive ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Transactions Tab */}
                <TabsContent value="transactions" className="space-y-4">
                    {/* Filters */}
                    <div className="flex flex-wrap gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by transaction ID, booking..."
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                className="pl-9"
                            />
                        </div>
                        <Select value={filters.gatewayId} onValueChange={(v) => setFilters({ ...filters, gatewayId: v })}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Gateway" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Gateways</SelectItem>
                                {gateways.map((g) => (
                                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Status</SelectItem>
                                <SelectItem value="SUCCESS">Success</SelectItem>
                                <SelectItem value="PENDING">Pending</SelectItem>
                                <SelectItem value="FAILED">Failed</SelectItem>
                                <SelectItem value="REFUNDED">Refunded</SelectItem>
                                <SelectItem value="PARTIAL_REFUND">Partial Refund</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" onClick={fetchData}>
                            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        </Button>
                    </div>

                    {/* Transactions Table */}
                    <Card>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="h-64 flex items-center justify-center">
                                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : filteredTransactions.length === 0 ? (
                                <div className="py-12 text-center">
                                    <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                                    <p className="text-muted-foreground">No transactions found.</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Transaction ID</TableHead>
                                            <TableHead>Gateway</TableHead>
                                            <TableHead>Booking</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredTransactions.map((txn) => (
                                            <TableRow key={txn.id}>
                                                <TableCell className="font-mono text-sm">
                                                    <div className="flex flex-col">
                                                        <span>{txn.transactionId.slice(0, 12)}...</span>
                                                        <span className="text-xs text-muted-foreground">{txn.paymentMethod}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {txn.gateway ? (
                                                        <Badge variant="outline">{txn.gateway.name}</Badge>
                                                    ) : "—"}
                                                </TableCell>
                                                <TableCell>
                                                    {txn.booking ? (
                                                        <div>
                                                            <span className="font-medium">{txn.booking.bookingNumber}</span>
                                                            <p className="text-xs text-muted-foreground">{txn.booking.guest.name}</p>
                                                        </div>
                                                    ) : "—"}
                                                </TableCell>
                                                <TableCell className="font-mono">
                                                    ₹{txn.amount.toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {getStatusIcon(txn.status)}
                                                        {getStatusBadge(txn.status)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {formatDate(txn.createdAt, "short")}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => openViewTransaction(txn)}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        {txn.status === "SUCCESS" && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => openRefundDialog(txn)}
                                                            >
                                                                <ArrowDownRight className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Webhooks Tab */}
                <TabsContent value="webhooks" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Webhook className="h-5 w-5" />
                                Webhook Events
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="h-64 flex items-center justify-center">
                                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : webhookEvents.length === 0 ? (
                                <div className="py-12 text-center">
                                    <Webhook className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                                    <p className="text-muted-foreground">No webhook events recorded.</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Gateway</TableHead>
                                            <TableHead>Event Type</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Received At</TableHead>
                                            <TableHead>Processed At</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {webhookEvents.map((event) => (
                                            <TableRow key={event.id}>
                                                <TableCell>
                                                    <Badge variant="outline">{event.gateway.name}</Badge>
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">
                                                    {event.eventType}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={
                                                            event.status === "PROCESSED" ? "success" :
                                                                event.status === "FAILED" ? "destructive" : "warning"
                                                        }
                                                    >
                                                        {event.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {formatDate(event.createdAt, "short")}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {event.processedAt ? formatDate(event.processedAt, "short") : "—"}
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

            {/* Gateway Dialog */}
            {showGatewayDialog && (
                <Dialog open={showGatewayDialog} onOpenChange={setShowGatewayDialog}>
                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                {editingGateway ? "Edit Payment Gateway" : "Add Payment Gateway"}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSaveGateway} className="space-y-4">
                            <div>
                                <Label>Gateway Name *</Label>
                                <Input
                                    value={gatewayForm.name}
                                    onChange={(e) => setGatewayForm({ ...gatewayForm, name: e.target.value })}
                                    placeholder="e.g., Production Razorpay"
                                    required
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Provider *</Label>
                                <Select
                                    value={gatewayForm.provider}
                                    onValueChange={(v) => setGatewayForm({ ...gatewayForm, provider: v as PaymentGateway["provider"] })}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="RAZORPAY">Razorpay</SelectItem>
                                        <SelectItem value="INDUSIND">IndusInd Bank</SelectItem>
                                        <SelectItem value="IDFC">IDFC First Bank</SelectItem>
                                        <SelectItem value="PAYTM">Paytm</SelectItem>
                                        <SelectItem value="PHONEPE">PhonePe</SelectItem>
                                        <SelectItem value="CASH">Cash</SelectItem>
                                        <SelectItem value="CUSTOM">Custom</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Merchant ID</Label>
                                <Input
                                    value={gatewayForm.merchantId}
                                    onChange={(e) => setGatewayForm({ ...gatewayForm, merchantId: e.target.value })}
                                    placeholder="Merchant/Client ID"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>API Key *</Label>
                                <Input
                                    type="password"
                                    value={gatewayForm.apiKey}
                                    onChange={(e) => setGatewayForm({ ...gatewayForm, apiKey: e.target.value })}
                                    placeholder="Enter API key"
                                    required
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>API Secret</Label>
                                <Input
                                    type="password"
                                    value={gatewayForm.apiSecret}
                                    onChange={(e) => setGatewayForm({ ...gatewayForm, apiSecret: e.target.value })}
                                    placeholder="Enter API secret"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Webhook URL</Label>
                                <Input
                                    value={gatewayForm.webhookUrl}
                                    onChange={(e) => setGatewayForm({ ...gatewayForm, webhookUrl: e.target.value })}
                                    placeholder="https://your-domain.com/api/webhooks/payments"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Webhook Secret</Label>
                                <Input
                                    type="password"
                                    value={gatewayForm.webhookSecret}
                                    onChange={(e) => setGatewayForm({ ...gatewayForm, webhookSecret: e.target.value })}
                                    placeholder="Webhook verification secret"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Supported Payment Methods</Label>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    {["UPI", "CARD", "NETBANKING", "WALLET", "EMI", "CASH"].map((method) => (
                                        <div key={method} className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id={`method-${method}`}
                                                checked={gatewayForm.supportedMethods.includes(method)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setGatewayForm({
                                                            ...gatewayForm,
                                                            supportedMethods: [...gatewayForm.supportedMethods, method],
                                                        });
                                                    } else {
                                                        setGatewayForm({
                                                            ...gatewayForm,
                                                            supportedMethods: gatewayForm.supportedMethods.filter((m) => m !== method),
                                                        });
                                                    }
                                                }}
                                                className="rounded"
                                            />
                                            <Label htmlFor={`method-${method}`} className="text-sm font-normal">
                                                {method}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={gatewayForm.isDefault}
                                    onCheckedChange={(checked) => setGatewayForm({ ...gatewayForm, isDefault: checked })}
                                />
                                <Label>Set as default gateway</Label>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowGatewayDialog(false)} className="flex-1">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={submitting} className="flex-1">
                                    {submitting ? "Saving..." : editingGateway ? "Update" : "Add Gateway"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            )}

            {/* Refund Dialog */}
            {showRefundDialog && (
                <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Process Refund</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleRefund} className="space-y-4">
                            <div>
                                <Label>Refund Amount *</Label>
                                <Input
                                    type="number"
                                    value={refundForm.amount}
                                    onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })}
                                    placeholder="Enter amount"
                                    required
                                    min="0"
                                    step="0.01"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Reason *</Label>
                                <Input
                                    value={refundForm.reason}
                                    onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                                    placeholder="Reason for refund"
                                    required
                                    className="mt-1"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowRefundDialog(false)} className="flex-1">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={submitting} className="flex-1">
                                    {submitting ? "Processing..." : "Process Refund"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            )}

            {/* View Transaction Dialog */}
            {showViewTransactionDialog && viewingTransaction && (
                <Dialog open={showViewTransactionDialog} onOpenChange={setShowViewTransactionDialog}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Transaction Details</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground">Transaction ID</Label>
                                    <p className="font-mono text-sm">{viewingTransaction.transactionId}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">External ID</Label>
                                    <p className="font-mono text-sm">{viewingTransaction.externalTransactionId ?? "—"}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Amount</Label>
                                    <p className="font-mono text-sm">₹{viewingTransaction.amount.toLocaleString()}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Status</Label>
                                    <div className="mt-1">
                                        {getStatusBadge(viewingTransaction.status)}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Payment Method</Label>
                                    <p className="text-sm">{viewingTransaction.paymentMethod}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Gateway</Label>
                                    <p className="text-sm">{viewingTransaction.gateway?.name ?? "—"}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Booking</Label>
                                    <p className="text-sm">
                                        {viewingTransaction.booking
                                            ? `${viewingTransaction.booking.bookingNumber} (${viewingTransaction.booking.guest.name})`
                                            : "—"}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Created</Label>
                                    <p className="text-sm">{formatDate(viewingTransaction.createdAt, "short")}</p>
                                </div>
                            </div>

                            {viewingTransaction.errorMessage && (
                                <div className="p-3 bg-destructive/10 rounded-md">
                                    <div className="flex items-center gap-2 text-destructive">
                                        <AlertTriangle className="h-4 w-4" />
                                        <Label>Error</Label>
                                    </div>
                                    <p className="text-sm text-destructive mt-1">{viewingTransaction.errorMessage}</p>
                                </div>
                            )}

                            {(viewingTransaction.status === "REFUNDED" || viewingTransaction.status === "PARTIAL_REFUND") && (
                                <div className="p-3 bg-blue-50 rounded-md">
                                    <Label className="text-blue-700">Refund Details</Label>
                                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Amount Refunded:</span> ₹{viewingTransaction.refundAmount?.toLocaleString() ?? 0}
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Refund ID:</span> {viewingTransaction.refundId ?? "—"}
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-muted-foreground">Reason:</span> {viewingTransaction.refundReason ?? "—"}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
