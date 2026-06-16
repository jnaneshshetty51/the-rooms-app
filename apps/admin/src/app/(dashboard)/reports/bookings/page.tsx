"use client";

// apps/admin/src/app/(dashboard)/reports/bookings/page.tsx
import { useEffect, useState, useCallback } from "react";
import { PieChart, TrendingUp, XCircle, AlertCircle, Download } from "lucide-react";
import {
    PageHeader,
    Input,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    StatCard,
    DataTable,
    type ColumnDef,
    Badge,
    ExportButton,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
} from "@the-rooms/ui";
import { formatCurrency, formatDate } from "@the-rooms/ui";
import {
    fetchBookingSourceReport,
    fetchCancellationReport,
    fetchNoShowReport,
    type BookingSourceReport,
    type CancellationReport,
    type NoShowReport,
} from "@/lib/api";

export default function BookingsReportPage() {
    const [sourceData, setSourceData] = useState<{ sources: BookingSourceReport[] } | null>(null);
    const [cancellationData, setCancellationData] = useState<{
        cancellations: CancellationReport[];
        totalCount: number;
        totalRefunds: number;
    } | null>(null);
    const [noShowData, setNoShowData] = useState<{
        noShows: NoShowReport[];
        totalCount: number;
        totalRevenue: number;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("sources");
    const [filters, setFilters] = useState({
        fromDate: "",
        toDate: "",
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (filters.fromDate) params.fromDate = filters.fromDate;
            if (filters.toDate) params.toDate = filters.toDate;

            const [sources, cancellations, noShows] = await Promise.all([
                fetchBookingSourceReport(params),
                fetchCancellationReport(params),
                fetchNoShowReport(params),
            ]);

            setSourceData(sources);
            setCancellationData(cancellations);
            setNoShowData(noShows);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    function updateFilter(key: string, value: string) {
        setFilters((f) => ({ ...f, [key]: value }));
    }

    const cancellationColumns: ColumnDef<CancellationReport, unknown>[] = [
        {
            accessorKey: "bookingNumber",
            header: "Booking ID",
            cell: ({ row }) => (
                <code className="text-sm font-semibold">{row.original.bookingNumber}</code>
            ),
        },
        {
            accessorKey: "guest.name",
            header: "Guest",
            cell: ({ row }) => <span className="font-medium">{row.original.guest.name}</span>,
        },
        {
            accessorKey: "cancelledAt",
            header: "Cancelled On",
            cell: ({ row }) => (
                <span className="text-sm">{formatDate(row.original.cancelledAt, "short")}</span>
            ),
        },
        {
            accessorKey: "reason",
            header: "Reason",
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                    {row.original.reason ?? "Not specified"}
                </span>
            ),
        },
        {
            accessorKey: "refundAmount",
            header: "Refund",
            cell: ({ row }) => (
                <span className="font-medium text-destructive">
                    {formatCurrency(row.original.refundAmount)}
                </span>
            ),
        },
    ];

    const noShowColumns: ColumnDef<NoShowReport, unknown>[] = [
        {
            accessorKey: "bookingNumber",
            header: "Booking ID",
            cell: ({ row }) => (
                <code className="text-sm font-semibold">{row.original.bookingNumber}</code>
            ),
        },
        {
            accessorKey: "guest.name",
            header: "Guest",
            cell: ({ row }) => <span className="font-medium">{row.original.guest.name}</span>,
        },
        {
            accessorKey: "scheduledDate",
            header: "Scheduled Date",
            cell: ({ row }) => (
                <span className="text-sm">{formatDate(row.original.scheduledDate, "short")}</span>
            ),
        },
        {
            accessorKey: "totalAmount",
            header: "Amount",
            cell: ({ row }) => (
                <span className="font-medium">{formatCurrency(Number(row.original.totalAmount))}</span>
            ),
        },
    ];

    const exportSourceData = sourceData?.sources.map((s) => ({
        "Source": s.source,
        "Bookings": s.count,
        "Revenue": s.revenue,
        "Percentage": `${s.percentage.toFixed(1)}%`,
    })) ?? [];

    const exportCancellationData = cancellationData?.cancellations.map((c) => ({
        "Booking ID": c.bookingNumber,
        "Guest": c.guest.name,
        "Cancelled On": formatDate(c.cancelledAt, "short"),
        "Reason": c.reason ?? "Not specified",
        "Refund": c.refundAmount,
    })) ?? [];

    const exportNoShowData = noShowData?.noShows.map((n) => ({
        "Booking ID": n.bookingNumber,
        "Guest": n.guest.name,
        "Scheduled Date": formatDate(n.scheduledDate, "short"),
        "Amount": n.totalAmount,
    })) ?? [];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Booking Reports"
                description="Booking source analytics, cancellations and no-shows"
            />

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total Sources" value={sourceData?.sources.length ?? 0} icon={PieChart} />
                <StatCard label="Cancellations" value={cancellationData?.totalCount ?? 0} icon={XCircle} />
                <StatCard label="No Shows" value={noShowData?.totalCount ?? 0} icon={AlertCircle} />
                <StatCard
                    label="Cancellation Revenue"
                    value={formatCurrency(cancellationData?.totalRefunds ?? 0)}
                    icon={TrendingUp}
                />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <Input
                    type="date"
                    className="w-[160px]"
                    value={filters.fromDate}
                    onChange={(e) => updateFilter("fromDate", e.target.value)}
                    placeholder="From date"
                />
                <Input
                    type="date"
                    className="w-[160px]"
                    value={filters.toDate}
                    onChange={(e) => updateFilter("toDate", e.target.value)}
                    placeholder="To date"
                />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="sources">Booking Sources</TabsTrigger>
                    <TabsTrigger value="cancellations">Cancellations</TabsTrigger>
                    <TabsTrigger value="no-shows">No Shows</TabsTrigger>
                </TabsList>

                {/* Booking Sources Tab */}
                <TabsContent value="sources" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="font-heading text-lg">Source Contribution</CardTitle>
                            <ExportButton
                                data={exportSourceData}
                                filename="booking-sources"
                                className="bg-primary text-primary-foreground hover:bg-primary/90"
                            />
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="space-y-3">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
                                    ))}
                                </div>
                            ) : sourceData?.sources.length === 0 ? (
                                <p className="text-center py-8 text-muted-foreground">No source data available</p>
                            ) : (
                                <div className="space-y-3">
                                    {sourceData?.sources.map((source) => (
                                        <div key={source.source} className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-3 h-3 rounded-full bg-primary" />
                                                    <span className="font-medium">{source.source}</span>
                                                    <Badge variant="secondary">{source.count} bookings</Badge>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-semibold">{formatCurrency(source.revenue)}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {source.percentage.toFixed(1)}%
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary rounded-full"
                                                    style={{ width: `${source.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Cancellations Tab */}
                <TabsContent value="cancellations" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="font-heading text-lg">
                                Cancellation Report ({cancellationData?.totalCount ?? 0})
                            </CardTitle>
                            <ExportButton
                                data={exportCancellationData}
                                filename="cancellations"
                                className="bg-primary text-primary-foreground hover:bg-primary/90"
                            />
                        </CardHeader>
                        <CardContent>
                            <DataTable
                                columns={cancellationColumns}
                                data={cancellationData?.cancellations ?? []}
                                isLoading={loading}
                                pageSize={20}
                                filterPlaceholder="Filter cancellations..."
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* No Shows Tab */}
                <TabsContent value="no-shows" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="font-heading text-lg">
                                No Show Report ({noShowData?.totalCount ?? 0})
                            </CardTitle>
                            <ExportButton
                                data={exportNoShowData}
                                filename="no-shows"
                                className="bg-primary text-primary-foreground hover:bg-primary/90"
                            />
                        </CardHeader>
                        <CardContent>
                            <DataTable
                                columns={noShowColumns}
                                data={noShowData?.noShows ?? []}
                                isLoading={loading}
                                pageSize={20}
                                filterPlaceholder="Filter no-shows..."
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}