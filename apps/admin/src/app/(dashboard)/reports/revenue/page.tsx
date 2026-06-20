"use client";

// apps/admin/src/app/(dashboard)/reports/revenue/page.tsx
import { useEffect, useState, useCallback } from "react";
import { DollarSign, TrendingUp, Calendar, PieChart } from "lucide-react";
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
import { formatCurrency, formatDate } from "@the-rooms/ui";
import { fetchRevenueReport, type RevenueReport } from "@/lib/api";

export default function RevenueReportPage() {
    const [data, setData] = useState<{
        reports: RevenueReport[];
        summary: { totalRevenue: number; avgRevpar: number; avgAdr: number };
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

            const result = await fetchRevenueReport(params);
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

    const stats = data?.summary ?? { totalRevenue: 0, avgRevpar: 0, avgAdr: 0 };

    const exportData = data?.reports.map((r) => ({
        "Date": formatDate(r.date, "short"),
        "Total Revenue": r.totalRevenue,
        "Room Revenue": r.roomRevenue,
        "Addon Revenue": r.addonRevenue,
        "RevPAR": r.revpar.toFixed(2),
        "ADR": r.adr.toFixed(2),
    })) ?? [];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Revenue Report"
                description="RevPAR, ADR and revenue breakdown"
            />

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Total Revenue"
                    value={stats.totalRevenue}
                    format="currency"
                    icon={DollarSign}
                    changeLabel={`${data?.reports.length ?? 0} days`}
                />
                <StatCard
                    label="Avg RevPAR"
                    value={stats.avgRevpar.toFixed(2)}
                    icon={TrendingUp}
                />
                <StatCard
                    label="Avg ADR"
                    value={stats.avgAdr.toFixed(2)}
                    icon={DollarSign}
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

            {/* Revenue Table */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="font-heading text-lg">Daily Revenue</CardTitle>
                    <ExportButton
                        data={exportData}
                        filename="revenue-report"
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
                                        <th className="text-right p-3 font-medium">Total Revenue</th>
                                        <th className="text-right p-3 font-medium">Room Revenue</th>
                                        <th className="text-right p-3 font-medium">Addon Revenue</th>
                                        <th className="text-right p-3 font-medium">RevPAR</th>
                                        <th className="text-right p-3 font-medium">ADR</th>
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
                                            <td className="p-3 text-right font-semibold text-primary">
                                                {formatCurrency(report.totalRevenue)}
                                            </td>
                                            <td className="p-3 text-right">
                                                {formatCurrency(report.roomRevenue)}
                                            </td>
                                            <td className="p-3 text-right text-muted-foreground">
                                                {formatCurrency(report.addonRevenue)}
                                            </td>
                                            <td className="p-3 text-right">
                                                {report.revpar.toFixed(2)}
                                            </td>
                                            <td className="p-3 text-right">
                                                {report.adr.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Source Breakdown */}
            {data?.reports && data.reports.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-heading text-lg flex items-center gap-2">
                            <PieChart className="h-5 w-5" />
                            Revenue by Source (Latest)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {Object.entries(data.reports[data.reports.length - 1]?.sourceBreakdown ?? {}).map(
                                ([source, amount]) => (
                                    <div key={source} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full bg-primary" />
                                            <span className="font-medium">{source}</span>
                                        </div>
                                        <span className="font-semibold">{formatCurrency(amount)}</span>
                                    </div>
                                )
                            )}
                            {Object.keys(data.reports[data.reports.length - 1]?.sourceBreakdown ?? {}).length === 0 && (
                                <p className="text-center py-4 text-muted-foreground">No source data available</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}