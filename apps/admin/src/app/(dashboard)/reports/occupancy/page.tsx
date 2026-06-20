"use client";

// apps/admin/src/app/(dashboard)/reports/occupancy/page.tsx
import { useEffect, useState, useCallback } from "react";
import { Calendar, TrendingUp, BedDouble, Percent } from "lucide-react";
import {
    PageHeader,
    Input,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    StatCard,
    ExportButton,
} from "@the-rooms/ui";
import { formatDate } from "@the-rooms/ui";
import { fetchOccupancyReport, type OccupancyReport } from "@/lib/api";

export default function OccupancyReportPage() {
    const [data, setData] = useState<{
        reports: OccupancyReport[];
        summary: { avgOccupancy: number; totalBookings: number };
    } | null>(null);
    const [loading, setLoading] = useState(true);
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

            const result = await fetchOccupancyReport(params);
            setData(result);
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

    const stats = data?.summary ?? { avgOccupancy: 0, totalBookings: 0 };

    const exportData = data?.reports.map((r) => ({
        "Date": formatDate(r.date, "short"),
        "Total Rooms": r.totalRooms,
        "Occupied": r.occupiedRooms,
        "Available": r.availableRooms,
        "Occupancy %": r.occupancyRate.toFixed(1),
    })) ?? [];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Occupancy Report"
                description="Daily occupancy metrics and trends"
            />

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Avg Occupancy"
                    value={`${stats.avgOccupancy.toFixed(1)}%`}
                    format="percent"
                    icon={Percent}
                    className={stats.avgOccupancy >= 70 ? "border-l-4 border-l-success" : ""}
                />
                <StatCard
                    label="Total Bookings"
                    value={stats.totalBookings}
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

            {/* Occupancy Table */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="font-heading text-lg">Daily Occupancy</CardTitle>
                    <ExportButton
                        data={exportData}
                        filename="occupancy-report"
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    />
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(10)].map((_, i) => (
                                <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
                            ))}
                        </div>
                    ) : data?.reports.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground">No data available</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-3 font-medium">Date</th>
                                        <th className="text-right p-3 font-medium">Total Rooms</th>
                                        <th className="text-right p-3 font-medium">Occupied</th>
                                        <th className="text-right p-3 font-medium">Available</th>
                                        <th className="text-right p-3 font-medium">Occupancy %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data?.reports.map((report) => (
                                        <tr key={report.date} className="border-b last:border-0">
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                                    {formatDate(report.date, "short")}
                                                </div>
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <BedDouble className="h-4 w-4 text-muted-foreground" />
                                                    {report.totalRooms}
                                                </div>
                                            </td>
                                            <td className="p-3 text-right font-medium text-primary">
                                                {report.occupiedRooms}
                                            </td>
                                            <td className="p-3 text-right text-muted-foreground">
                                                {report.availableRooms}
                                            </td>
                                            <td className="p-3 text-right">
                                                <span className={`font-semibold ${report.occupancyRate >= 70 ? "text-success" :
                                                    report.occupancyRate >= 50 ? "text-warning" :
                                                        "text-destructive"
                                                    }`}>
                                                    {report.occupancyRate.toFixed(1)}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Room Type Breakdown */}
            {data?.reports && data.reports.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-heading text-lg">Room Type Breakdown (Latest)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-3 font-medium">Room Type</th>
                                        <th className="text-right p-3 font-medium">Total</th>
                                        <th className="text-right p-3 font-medium">Occupied</th>
                                        <th className="text-right p-3 font-medium">Rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(data.reports[data.reports.length - 1]?.roomTypeBreakdown ?? {}).map(
                                        ([type, breakdown]) => (
                                            <tr key={type} className="border-b last:border-0">
                                                <td className="p-3 font-medium">{type}</td>
                                                <td className="p-3 text-right">{breakdown.total}</td>
                                                <td className="p-3 text-right">{breakdown.occupied}</td>
                                                <td className="p-3 text-right">
                                                    <span className={`font-semibold ${breakdown.rate >= 70 ? "text-success" :
                                                        breakdown.rate >= 50 ? "text-warning" :
                                                            "text-destructive"
                                                        }`}>
                                                        {breakdown.rate.toFixed(1)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}