"use client";

// apps/admin/src/app/(dashboard)/offline-entries/page.tsx
import { useEffect, useState, useCallback } from "react";
import { CloudOff, RefreshCw, AlertCircle, CheckCircle, Clock } from "lucide-react";
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
import { fetchOfflineEntries, syncOfflineEntry, type OfflineEntry } from "@/lib/api";

export default function OfflineEntriesPage() {
    const [data, setData] = useState<{ entries: OfflineEntry[]; total: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const result = await fetchOfflineEntries();
            setData(result);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSync = async (id: string) => {
        setSyncing(id);
        try {
            await syncOfflineEntry(id);
            await fetchData();
        } finally {
            setSyncing(null);
        }
    };

    const stats = data?.entries ? {
        total: data.entries.length,
        pending: data.entries.filter((e) => e.status === "PENDING").length,
        synced: data.entries.filter((e) => e.status === "SYNCED").length,
        conflict: data.entries.filter((e) => e.status === "CONFLICT").length,
        failed: data.entries.filter((e) => e.status === "FAILED").length,
    } : { total: 0, pending: 0, synced: 0, conflict: 0, failed: 0 };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "PENDING":
                return <Clock className="h-5 w-5 text-warning" />;
            case "SYNCED":
                return <CheckCircle className="h-5 w-5 text-success" />;
            case "CONFLICT":
                return <AlertCircle className="h-5 w-5 text-destructive" />;
            case "FAILED":
                return <AlertCircle className="h-5 w-5 text-destructive" />;
            default:
                return <Clock className="h-5 w-5" />;
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Offline Entries"
                description="Manage offline booking entries and sync status"
            />

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-4">
                <StatCard label="Total Entries" value={stats.total} icon={CloudOff} />
                <StatCard
                    label="Pending"
                    value={stats.pending}
                    icon={Clock}
                    className={stats.pending > 0 ? "border-l-4 border-l-warning" : ""}
                />
                <StatCard label="Synced" value={stats.synced} icon={CheckCircle} />
                <StatCard
                    label="Conflicts"
                    value={stats.conflict + stats.failed}
                    icon={AlertCircle}
                    className={stats.conflict + stats.failed > 0 ? "border-l-4 border-l-destructive" : ""}
                />
            </div>

            {/* Entries List */}
            <div className="grid gap-4">
                {loading ? (
                    [...Array(3)].map((_, i) => (
                        <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
                    ))
                ) : data?.entries.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <CloudOff className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No offline entries</p>
                        </CardContent>
                    </Card>
                ) : (
                    data?.entries.map((entry) => (
                        <Card
                            key={entry.id}
                            className={entry.status === "CONFLICT" ? "border-destructive" :
                                entry.status === "FAILED" ? "border-destructive" : ""}
                        >
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-muted">
                                            {getStatusIcon(entry.status)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold">Offline Entry</p>
                                                <Badge variant={
                                                    entry.status === "PENDING" ? "warning" :
                                                        entry.status === "SYNCED" ? "success" :
                                                            entry.status === "CONFLICT" ? "destructive" :
                                                                "destructive"
                                                }>
                                                    {entry.status}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Created: {formatDate(entry.createdAt, "long")}
                                            </p>
                                            {entry.syncedAt && (
                                                <p className="text-sm text-muted-foreground">
                                                    Synced: {formatDate(entry.syncedAt, "long")}
                                                </p>
                                            )}
                                            {entry.conflictReason && (
                                                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                                                    <p className="text-sm text-destructive">{entry.conflictReason}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {entry.status === "PENDING" && (
                                            <Button
                                                size="sm"
                                                onClick={() => handleSync(entry.id)}
                                                disabled={syncing === entry.id}
                                            >
                                                <RefreshCw className={`h-4 w-4 mr-2 ${syncing === entry.id ? "animate-spin" : ""}`} />
                                                Sync
                                            </Button>
                                        )}
                                        {entry.status === "CONFLICT" && (
                                            <Button size="sm" variant="outline">
                                                Resolve
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}