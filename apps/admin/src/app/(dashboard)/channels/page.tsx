"use client";

// apps/admin/src/app/(dashboard)/channels/page.tsx
// Channel management page

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Plus,
    Search,
    RefreshCw,
    Settings,
    Link2,
    CheckCircle,
    XCircle,
    Clock,
} from "lucide-react";
import { PageHeader, Button, Dialog, Input, Select, SelectTrigger, SelectContent, Badge } from "@the-rooms/ui";
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
        autoSyncInventory: boolean;
        autoSyncRates: boolean;
        autoImportBookings: boolean;
    } | null;
    createdAt: string;
    updatedAt: string;
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

const CHANNEL_DISPLAY_NAMES: Record<string, string> = {
    BOOKING_COM: "Booking.com",
    EXPEDIA: "Expedia",
    AIRBNB: "Airbnb",
    AGODA: "Agoda",
};

const CHANNEL_LOGOS: Record<string, string> = {
    BOOKING_COM: "https://cf.bstatic.com/static/img/favicon/32x32-booking/48b8f953f34c2e285fcdd0f4c40d1e39c40d7df0.png",
    EXPEDIA: "https://www.expedia.com/favicon.ico",
    AIRBNB: "https://www.airbnb.com/favicon.ico",
    AGODA: "https://www.agoda.com/favicon.ico",
};

export default function ChannelsPage() {
    const router = useRouter();
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [syncingChannel, setSyncingChannel] = useState<string | null>(null);

    const [form, setForm] = useState({
        name: "BOOKING_COM" as string,
        displayName: "",
        logoUrl: "",
    });

    const fetchChannels = useCallback(async () => {
        const res = await fetch("/api/channels?withSyncSettings=true");
        const data = await res.json();
        setChannels(data.channels ?? []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchChannels(); }, [fetchChannels]);

    const filtered = channels.filter((c) => {
        const matchSearch = c.displayName.toLowerCase().includes(search.toLowerCase()) ||
            c.name.toLowerCase().includes(search.toLowerCase());
        return matchSearch;
    });

    async function handleAddChannel(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch("/api/channels", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name,
                    displayName: form.displayName || CHANNEL_DISPLAY_NAMES[form.name] || form.name,
                    logoUrl: form.logoUrl || CHANNEL_LOGOS[form.name] || null,
                }),
            });
            if (res.ok) {
                setShowAddModal(false);
                setForm({ name: "BOOKING_COM", displayName: "", logoUrl: "" });
                fetchChannels();
            }
        } finally {
            setSubmitting(false);
        }
    }

    async function handleSync(channelId: string, syncType: string = "FULL_INVENTORY") {
        setSyncingChannel(channelId);
        try {
            await fetch(`/api/channels/${channelId}/sync`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ syncType }),
            });
            fetchChannels();
        } finally {
            setSyncingChannel(null);
        }
    }

    async function handleToggleActive(channel: Channel) {
        await fetch(`/api/channels/${channel.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: !channel.isActive }),
        });
        fetchChannels();
    }

    function getStatusIcon(status: string) {
        switch (status) {
            case "COMPLETED":
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case "FAILED":
                return <XCircle className="h-4 w-4 text-red-500" />;
            case "IN_PROGRESS":
            case "PENDING":
                return <Clock className="h-4 w-4 text-yellow-500" />;
            default:
                return <Clock className="h-4 w-4 text-muted-foreground" />;
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Channel Manager"
                description="Manage OTA channel integrations and synchronization"
                actions={
                    <Button onClick={() => setShowAddModal(true)}>
                        <Plus className="h-4 w-4 mr-1.5" />
                        Add Channel
                    </Button>
                }
            />

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search channels…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            {/* Channel Grid */}
            {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-56 animate-pulse rounded-xl bg-muted" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Link2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No channels configured yet.</p>
                        <Button onClick={() => setShowAddModal(true)} className="mt-4">
                            <Plus className="h-4 w-4 mr-1.5" />
                            Add Your First Channel
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filtered.map((channel) => (
                        <Card key={channel.id} className="overflow-hidden hover:shadow-md transition-shadow">
                            <CardContent className="p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {channel.logoUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={channel.logoUrl} alt={channel.displayName} className="h-8 w-8 object-contain" />
                                        ) : (
                                            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                                                <Link2 className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="font-heading font-bold">{channel.displayName}</h3>
                                            <p className="text-xs text-muted-foreground">{channel.name}</p>
                                        </div>
                                    </div>
                                    <Badge variant={channel.isActive ? "default" : "secondary"}>
                                        {channel.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                </div>

                                {/* Sync Status */}
                                {channel.syncSettings && (
                                    <div className="text-xs text-muted-foreground space-y-1">
                                        <div className="flex items-center gap-2">
                                            <RefreshCw className="h-3 w-3" />
                                            <span>Mode: {channel.syncSettings.syncMode.replace("_", " ")}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            {channel.syncSettings.autoSyncInventory && (
                                                <Badge variant="outline" className="text-[10px]">Inventory</Badge>
                                            )}
                                            {channel.syncSettings.autoSyncRates && (
                                                <Badge variant="outline" className="text-[10px]">Rates</Badge>
                                            )}
                                            {channel.syncSettings.autoImportBookings && (
                                                <Badge variant="outline" className="text-[10px]">Bookings</Badge>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-1 pt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => router.push(`/channels/${channel.id}`)}
                                    >
                                        <Settings className="h-3.5 w-3.5 mr-1" />
                                        Configure
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleSync(channel.id)}
                                        disabled={syncingChannel === channel.id}
                                        title="Sync now"
                                    >
                                        <RefreshCw className={`h-3.5 w-3.5 ${syncingChannel === channel.id ? "animate-spin" : ""}`} />
                                    </Button>
                                    <Button
                                        variant={channel.isActive ? "destructive" : "default"}
                                        size="sm"
                                        onClick={() => handleToggleActive(channel)}
                                        title={channel.isActive ? "Deactivate" : "Activate"}
                                    >
                                        {channel.isActive ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add Channel Modal */}
            {showAddModal && (
                <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                    <div className="space-y-4">
                        <h2 className="font-heading text-xl font-bold">Add New Channel</h2>
                        <form onSubmit={handleAddChannel} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Channel *</label>
                                <Select value={form.name} onValueChange={(v) => setForm({ ...form, name: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <option value="BOOKING_COM">Booking.com</option>
                                        <option value="EXPEDIA">Expedia</option>
                                        <option value="AIRBNB">Airbnb</option>
                                        <option value="AGODA">Agoda</option>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Display Name</label>
                                <Input
                                    value={form.displayName}
                                    onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                                    placeholder={CHANNEL_DISPLAY_NAMES[form.name] || "Channel name"}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Logo URL</label>
                                <Input
                                    value={form.logoUrl}
                                    onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={submitting} className="flex-1">
                                    {submitting ? "Adding…" : "Add Channel"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </Dialog>
            )}
        </div>
    );
}
