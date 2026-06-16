"use client";

// apps/admin/src/app/(dashboard)/channels/[id]/sync/page.tsx
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { RefreshCw, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
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
import { fetchSyncHistory, triggerOTASync, type SyncStatus } from "@/lib/api";

export default function ChannelSyncPage() {
    const params = useParams();
    const channelId = params.id as string;
    const [history, setHistory] = useState<{ history: SyncStatus[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const result = await fetchSyncHistory(channelId);
            setHistory(result);
        } finally {
            setLoading(false);
        }
    }, [channelId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSync = async (type: "full" | "inventory" | "pricing") => {
        setSyncing(true);
        try {
            await triggerOTASync(channelId, type);
            await fetchData();
        } finally {
            setSyncing(false);
        }
    };

    const stats = history?.history ? {
        total: history.history.length,
        success: history.history.filter((h) => h.status === "SUCCESS").length,
        failed: history.history.filter((h) => h.status === "FAILED").length,
    } : { total: 0, success: 0, failed: 0 };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Channel Sync"
                description={`Manage synchronization for channel ${channelId}`}
            />

            {/* Sync Controls */}
            <Card>
                <CardHeader>
                    <CardTitle className="font-heading text-lg">Sync Controls</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-3">
                        <Button
                            onClick={() => handleSync("full")}
                            disabled={syncing}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                            Full Sync
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => handleSync("inventory")}
                            disabled={syncing}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                            Inventory Only
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => handleSync("pricing")}
                            disabled={syncing}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                            Pricing Only
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Total Syncs" value={stats.total} icon={RefreshCw} />
                <StatCard label="Successful" value={stats.success} icon={CheckCircle} />
                <StatCard
                    label="Failed"
                    value={stats.failed}
                    icon={XCircle}
                    className={stats.failed > 0 ? "border-l-4 border-l-destructive" : ""}
                />
            </div>

            {/* Sync History */}
            <Card>
                <CardHeader>
                    <CardTitle className="font-heading text-lg">Sync History</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(10)].map((_, i) => (
                                <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
                            ))}
                        </div>
                    ) : history?.history.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground">No sync history available</p>
                    ) : (
                        <div className="space-y-3">
                            {history?.history.map((record) => (
                                <div
                                    key={record.lastSyncAt}
                                    className={`flex items-center justify-between p-4 border rounded-lg ${record.status === "FAILED" ? "border-destructive" : ""
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${record.status === "SUCCESS" ? "bg-green-100" :
                                                record.status === "FAILED" ? "bg-red-100" :
                                                    "bg-yellow-100"
                                            }`}>
                                            {record.status === "SUCCESS" ? (
                                                <CheckCircle className="h-5 w-5 text-green-600" />
                                            ) : record.status === "FAILED" ? (
                                                <XCircle className="h-5 w-5 text-red-600" />
                                            ) : (
                                                <Clock className="h-5 w-5 text-yellow-600" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium">{record.channelName}</p>
                                                <Badge variant={
                                                    record.status === "SUCCESS" ? "success" :
                                                        record.status === "FAILED" ? "destructive" :
                                                            "warning"
                                                }>
                                                    {record.status}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {record.lastSyncAt
                                                    ? formatDate(record.lastSyncAt, "long")
                                                    : "Never"}
                                            </p>
                                            {record.errorMessage && (
                                                <p className="text-xs text-destructive mt-1">{record.errorMessage}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                {record.inventorySynced ? (
                                                    <CheckCircle className="h-4 w-4 text-success" />
                                                ) : (
                                                    <XCircle className="h-4 w-4" />
                                                )}
                                                <span>Inventory</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {record.pricingSynced ? (
                                                    <CheckCircle className="h-4 w-4 text-success" />
                                                ) : (
                                                    <XCircle className="h-4 w-4" />
                                                )}
                                                <span>Pricing</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {record.bookingsSynced ? (
                                                    <CheckCircle className="h-4 w-4 text-success" />
                                                ) : (
                                                    <XCircle className="h-4 w-4" />
                                                )}
                                                <span>Bookings</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}