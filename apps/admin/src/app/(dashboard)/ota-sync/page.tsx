"use client";

// apps/admin/src/app/(dashboard)/ota-sync/page.tsx
import { useEffect, useState, useCallback } from "react";
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock, ExternalLink } from "lucide-react";
import {
    PageHeader,
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Badge,
    StatCard,
} from "@the-rooms/ui";
import { formatDate } from "@the-rooms/ui";
import { fetchOTASyncStatus, type SyncStatus } from "@/lib/api";
import Link from "next/link";

export default function OTASyncPage() {
    const [data, setData] = useState<{ channels: SyncStatus[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const result = await fetchOTASyncStatus();
            setData(result);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSync = async (channelId: string, type: "full" | "inventory" | "pricing") => {
        setSyncing(channelId);
        try {
            await fetch(`/api/channels/${channelId}/sync`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type }),
            });
            await fetchData();
        } finally {
            setSyncing(null);
        }
    };

    const stats = data?.channels ? {
        total: data.channels.length,
        healthy: data.channels.filter((c) => c.status === "SUCCESS").length,
        failed: data.channels.filter((c) => c.status === "FAILED").length,
        pending: data.channels.filter((c) => c.status === "PENDING").length,
    } : { total: 0, healthy: 0, failed: 0, pending: 0 };

    return (
        <div className="space-y-6">
            <PageHeader
                title="OTA Sync Dashboard"
                description="Monitor and manage channel manager synchronization"
            />

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-4">
                <StatCard label="Total Channels" value={stats.total} icon={ExternalLink} />
                <StatCard
                    label="Healthy"
                    value={stats.healthy}
                    icon={CheckCircle}
                    className={stats.healthy === stats.total && stats.total > 0 ? "border-l-4 border-l-success" : ""}
                />
                <StatCard
                    label="Failed"
                    value={stats.failed}
                    icon={XCircle}
                    className={stats.failed > 0 ? "border-l-4 border-l-destructive" : ""}
                />
                <StatCard label="Pending" value={stats.pending} icon={Clock} />
            </div>

            {/* Failed Syncs Alert */}
            {stats.failed > 0 && (
                <Card className="border-l-4 border-l-destructive">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            <div>
                                <p className="font-medium text-destructive">
                                    {stats.failed} channel(s) have sync failures
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Click on a channel to view error details and retry sync
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Channels Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                    [...Array(6)].map((_, i) => (
                        <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
                    ))
                ) : data?.channels.length === 0 ? (
                    <Card className="col-span-full">
                        <CardContent className="py-12 text-center">
                            <ExternalLink className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No channels configured</p>
                        </CardContent>
                    </Card>
                ) : (
                    data?.channels.map((channel) => (
                        <Card key={channel.channelId} className={channel.status === "FAILED" ? "border-destructive" : ""}>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="font-heading text-lg">{channel.channelName}</CardTitle>
                                    <Badge variant={
                                        channel.status === "SUCCESS" ? "success" :
                                            channel.status === "FAILED" ? "destructive" :
                                                "warning"
                                    }>
                                        {channel.status}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="text-sm">
                                    <p className="text-muted-foreground">
                                        Last sync:{" "}
                                        <span className={channel.status === "FAILED" ? "text-destructive" : ""}>
                                            {channel.lastSyncAt
                                                ? formatDate(channel.lastSyncAt, "short")
                                                : "Never"}
                                        </span>
                                    </p>
                                    {channel.errorMessage && (
                                        <p className="text-destructive mt-1 text-xs">{channel.errorMessage}</p>
                                    )}
                                </div>

                                {/* Sync Status */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Inventory</span>
                                        {channel.inventorySynced ? (
                                            <CheckCircle className="h-4 w-4 text-success" />
                                        ) : (
                                            <XCircle className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Pricing</span>
                                        {channel.pricingSynced ? (
                                            <CheckCircle className="h-4 w-4 text-success" />
                                        ) : (
                                            <XCircle className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Bookings</span>
                                        {channel.bookingsSynced ? (
                                            <CheckCircle className="h-4 w-4 text-success" />
                                        ) : (
                                            <XCircle className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    <Link href={`/channels/${channel.channelId}/sync`} className="flex-1">
                                        <Button variant="outline" size="sm" className="w-full">
                                            View Details
                                        </Button>
                                    </Link>
                                    <Button
                                        size="sm"
                                        onClick={() => handleSync(channel.channelId, "full")}
                                        disabled={syncing === channel.channelId}
                                    >
                                        <RefreshCw className={`h-4 w-4 ${syncing === channel.channelId ? "animate-spin" : ""}`} />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}