"use client";

// apps/admin/src/app/(dashboard)/channels/[id]/page.tsx
// Channel configuration page

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    ArrowLeft,
    Save,
    RefreshCw,
    Link2,
    CheckCircle,
    XCircle,
    AlertCircle,
    TestTube,
} from "lucide-react";
import { PageHeader, Button, Input, Select, SelectTrigger, SelectContent, Badge, Textarea } from "@the-rooms/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@the-rooms/ui";

interface Channel {
    id: string;
    name: string;
    displayName: string;
    logoUrl: string | null;
    isActive: boolean;
    config: Record<string, string> | null;
    metadata: Record<string, unknown> | null;
    syncSettings: {
        id: string;
        syncMode: string;
        fullSyncSchedule: string | null;
        incrementalSyncSchedule: string | null;
        autoSyncInventory: boolean;
        autoSyncRates: boolean;
        autoImportBookings: boolean;
        conflictStrategy: string;
        pushEnabled: boolean;
        pushEndpoint: string | null;
        maxRetries: number;
        retryDelayMs: number;
    } | null;
    roomMappings: Array<{
        id: string;
        roomId: string;
        otaRoomTypeId: string;
        otaRoomTypeName: string | null;
        isActive: boolean;
    }>;
    rateMappings: Array<{
        id: string;
        rateType: string;
        otaRatePlanId: string;
        otaRatePlanName: string | null;
        isActive: boolean;
    }>;
}

interface SyncLog {
    id: string;
    syncType: string;
    syncDirection: string;
    status: string;
    itemsTotal: number;
    itemsSynced: number;
    itemsFailed: number;
    errorMessage: string | null;
    startedAt: string | null;
    completedAt: string | null;
    durationMs: number | null;
    createdAt: string;
}

export default function ChannelConfigPage() {
    const router = useRouter();
    const params = useParams();
    const channelId = params.id as string;

    const [channel, setChannel] = useState<Channel | null>(null);
    const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const [form, setForm] = useState({
        displayName: "",
        isActive: false,
        apiKey: "",
        apiSecret: "",
        propertyId: "",
        hotelId: "",
        username: "",
        password: "",
        endpoint: "",
        webhookSecret: "",
        syncMode: "PUSH_BASED",
        fullSyncSchedule: "",
        incrementalSyncSchedule: "",
        autoSyncInventory: true,
        autoSyncRates: true,
        autoImportBookings: true,
        conflictStrategy: "PMS_WINS",
        pushEnabled: false,
        pushEndpoint: "",
        maxRetries: 3,
        retryDelayMs: 5000,
    });

    const fetchChannel = useCallback(async () => {
        const res = await fetch(`/api/channels/${channelId}`);
        const data = await res.json();
        if (data.channel) {
            setChannel(data.channel);
            const config = data.channel.config ?? {};
            const settings = data.channel.syncSettings ?? {};
            setForm({
                displayName: data.channel.displayName ?? "",
                isActive: data.channel.isActive ?? false,
                apiKey: config.apiKey ?? "",
                apiSecret: config.apiSecret ?? "",
                propertyId: config.propertyId ?? "",
                hotelId: config.hotelId ?? "",
                username: config.username ?? "",
                password: config.password ?? "",
                endpoint: config.endpoint ?? "",
                webhookSecret: config.webhookSecret ?? "",
                syncMode: settings.syncMode ?? "PUSH_BASED",
                fullSyncSchedule: settings.fullSyncSchedule ?? "",
                incrementalSyncSchedule: settings.incrementalSyncSchedule ?? "",
                autoSyncInventory: settings.autoSyncInventory ?? true,
                autoSyncRates: settings.autoSyncRates ?? true,
                autoImportBookings: settings.autoImportBookings ?? true,
                conflictStrategy: settings.conflictStrategy ?? "PMS_WINS",
                pushEnabled: settings.pushEnabled ?? false,
                pushEndpoint: settings.pushEndpoint ?? "",
                maxRetries: settings.maxRetries ?? 3,
                retryDelayMs: settings.retryDelayMs ?? 5000,
            });
        }
        setLoading(false);
    }, [channelId]);

    const fetchSyncLogs = useCallback(async () => {
        const res = await fetch(`/api/channels/${channelId}/sync?limit=10`);
        const data = await res.json();
        setSyncLogs(data.syncLogs ?? []);
    }, [channelId]);

    useEffect(() => {
        fetchChannel();
        fetchSyncLogs();
    }, [fetchChannel, fetchSyncLogs]);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            // Update channel basic info
            await fetch(`/api/channels/${channelId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    displayName: form.displayName,
                    isActive: form.isActive,
                    config: {
                        apiKey: form.apiKey || undefined,
                        apiSecret: form.apiSecret || undefined,
                        propertyId: form.propertyId || undefined,
                        hotelId: form.hotelId || undefined,
                        username: form.username || undefined,
                        password: form.password || undefined,
                        endpoint: form.endpoint || undefined,
                        webhookSecret: form.webhookSecret || undefined,
                    },
                }),
            });
            fetchChannel();
        } finally {
            setSaving(false);
        }
    }

    async function handleSync(syncType: string = "FULL_INVENTORY") {
        setSyncing(true);
        try {
            await fetch(`/api/channels/${channelId}/sync`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ syncType }),
            });
            fetchSyncLogs();
        } finally {
            setSyncing(false);
        }
    }

    async function handleTestConnection() {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch(`/api/channels/${channelId}/test-connection`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    apiKey: form.apiKey || undefined,
                    propertyId: form.propertyId || undefined,
                    hotelId: form.hotelId || undefined,
                    username: form.username || undefined,
                    password: form.password || undefined,
                    endpoint: form.endpoint || undefined,
                }),
            });
            const data = await res.json();
            setTestResult(data);
        } catch (error) {
            setTestResult({ success: false, message: "Test failed" });
        } finally {
            setTesting(false);
        }
    }

    function getStatusBadge(status: string) {
        switch (status) {
            case "COMPLETED":
                return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Completed</Badge>;
            case "FAILED":
                return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
            case "IN_PROGRESS":
                return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> In Progress</Badge>;
            case "PARTIAL_FAILURE":
                return <Badge variant="outline" className="text-orange-600 border-orange-600"><AlertCircle className="h-3 w-3 mr-1" /> Partial</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse h-8 w-48 bg-muted rounded" />
                <div className="animate-pulse h-96 bg-muted rounded-xl" />
            </div>
        );
    }

    if (!channel) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Channel not found</p>
                <Button onClick={() => router.push("/channels")} className="mt-4">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to Channels
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={channel.displayName}
                description={`Configure ${channel.name} channel integration`}
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => router.push("/channels")}>
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Back
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            <Save className="h-4 w-4 mr-1" />
                            {saving ? "Saving…" : "Save Changes"}
                        </Button>
                    </div>
                }
            />

            <form onSubmit={handleSave} className="space-y-6">
                {/* Basic Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle>Basic Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Display Name</label>
                                <Input
                                    value={form.displayName}
                                    onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Status</label>
                                <Select value={form.isActive ? "true" : "false"} onValueChange={(v) => setForm({ ...form, isActive: v === "true" })}>
                                    <SelectTrigger>
                                        <span className={form.isActive ? "text-green-600" : "text-muted-foreground"}>
                                            {form.isActive ? "Active" : "Inactive"}
                                        </span>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <option value="true">Active</option>
                                        <option value="false">Inactive</option>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* API Credentials */}
                <Card>
                    <CardHeader>
                        <CardTitle>API Credentials</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="text-sm font-medium mb-1 block">API Key</label>
                                <Input
                                    type="password"
                                    value={form.apiKey}
                                    onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                                    placeholder="Enter API key"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">API Secret</label>
                                <Input
                                    type="password"
                                    value={form.apiSecret}
                                    onChange={(e) => setForm({ ...form, apiSecret: e.target.value })}
                                    placeholder="Enter API secret"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Property ID</label>
                                <Input
                                    value={form.propertyId}
                                    onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
                                    placeholder="Property ID"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Hotel ID</label>
                                <Input
                                    value={form.hotelId}
                                    onChange={(e) => setForm({ ...form, hotelId: e.target.value })}
                                    placeholder="Hotel ID"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Username</label>
                                <Input
                                    value={form.username}
                                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                                    placeholder="Username"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Password</label>
                                <Input
                                    type="password"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    placeholder="Password"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="text-sm font-medium mb-1 block">API Endpoint</label>
                                <Input
                                    value={form.endpoint}
                                    onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                                    placeholder="https://api.example.com"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="text-sm font-medium mb-1 block">Webhook Secret</label>
                                <Input
                                    type="password"
                                    value={form.webhookSecret}
                                    onChange={(e) => setForm({ ...form, webhookSecret: e.target.value })}
                                    placeholder="Webhook secret for incoming events"
                                />
                            </div>
                        </div>

                        {/* Test Connection */}
                        <div className="flex items-center gap-4 pt-4 border-t">
                            <Button type="button" variant="outline" onClick={handleTestConnection} disabled={testing}>
                                <TestTube className="h-4 w-4 mr-1" />
                                {testing ? "Testing…" : "Test Connection"}
                            </Button>
                            {testResult && (
                                <div className={`flex items-center gap-2 ${testResult.success ? "text-green-600" : "text-red-600"}`}>
                                    {testResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                    <span className="text-sm">{testResult.message}</span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Sync Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle>Synchronization Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Sync Mode</label>
                                <Select value={form.syncMode} onValueChange={(v) => setForm({ ...form, syncMode: v })}>
                                    <SelectTrigger><span>{form.syncMode.replace("_", " ")}</span></SelectTrigger>
                                    <SelectContent>
                                        <option value="PUSH_BASED">Push Based</option>
                                        <option value="PULL_BASED">Pull Based</option>
                                        <option value="WEBHOOK_BASED">Webhook Based</option>
                                        <option value="HYBRID">Hybrid</option>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Conflict Strategy</label>
                                <Select value={form.conflictStrategy} onValueChange={(v) => setForm({ ...form, conflictStrategy: v })}>
                                    <SelectTrigger><span>{form.conflictStrategy.replace("_", " ")}</span></SelectTrigger>
                                    <SelectContent>
                                        <option value="PMS_WINS">PMS Wins</option>
                                        <option value="OTA_WINS">OTA Wins</option>
                                        <option value="NEWEST_WINS">Newest Wins</option>
                                        <option value="MANUAL">Manual</option>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Full Sync Schedule (Cron)</label>
                                <Input
                                    value={form.fullSyncSchedule}
                                    onChange={(e) => setForm({ ...form, fullSyncSchedule: e.target.value })}
                                    placeholder="0 2 * * *"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Incremental Sync Schedule</label>
                                <Input
                                    value={form.incrementalSyncSchedule}
                                    onChange={(e) => setForm({ ...form, incrementalSyncSchedule: e.target.value })}
                                    placeholder="*/15 * * * *"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4 pt-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.autoSyncInventory}
                                    onChange={(e) => setForm({ ...form, autoSyncInventory: e.target.checked })}
                                    className="rounded border-input"
                                />
                                <span className="text-sm">Auto-sync Inventory</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.autoSyncRates}
                                    onChange={(e) => setForm({ ...form, autoSyncRates: e.target.checked })}
                                    className="rounded border-input"
                                />
                                <span className="text-sm">Auto-sync Rates</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.autoImportBookings}
                                    onChange={(e) => setForm({ ...form, autoImportBookings: e.target.checked })}
                                    className="rounded border-input"
                                />
                                <span className="text-sm">Auto-import Bookings</span>
                            </label>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3 pt-4 border-t">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Max Retries</label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={form.maxRetries}
                                    onChange={(e) => setForm({ ...form, maxRetries: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Retry Delay (ms)</label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={form.retryDelayMs}
                                    onChange={(e) => setForm({ ...form, retryDelayMs: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Push Endpoint</label>
                                <Input
                                    value={form.pushEndpoint}
                                    onChange={(e) => setForm({ ...form, pushEndpoint: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Manual Sync */}
                <Card>
                    <CardHeader>
                        <CardTitle>Manual Synchronization</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="outline"
                                onClick={() => handleSync("FULL_INVENTORY")}
                                disabled={syncing}
                            >
                                <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
                                Full Inventory Sync
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handleSync("INCREMENTAL_INVENTORY")}
                                disabled={syncing}
                            >
                                <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
                                Incremental Sync
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handleSync("BOOKING_IMPORT")}
                                disabled={syncing}
                            >
                                <Link2 className="h-4 w-4 mr-1" />
                                Import Bookings
                            </Button>
                        </div>

                        {/* Sync Logs */}
                        {syncLogs.length > 0 && (
                            <div className="mt-4">
                                <h4 className="text-sm font-medium mb-2">Recent Sync History</h4>
                                <div className="space-y-2">
                                    {syncLogs.map((log) => (
                                        <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                                            <div className="flex items-center gap-3">
                                                {getStatusBadge(log.status)}
                                                <span className="text-sm font-medium">{log.syncType.replace("_", " ")}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {log.itemsSynced}/{log.itemsTotal} items
                                                </span>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {log.durationMs ? `${log.durationMs}ms` : ""}
                                                {" · "}
                                                {new Date(log.createdAt).toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
