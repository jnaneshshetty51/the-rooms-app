"use client";

// apps/admin/src/app/(dashboard)/reports/page.tsx
import { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  BedDouble,
  CalendarDays,
  AlertTriangle,
  DollarSign,
} from "lucide-react";
import { PageHeader, StatCard, Select, SelectTrigger, SelectContent, SelectValue, Button } from "@the-rooms/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@the-rooms/ui";
import { formatCurrency } from "@the-rooms/ui";

interface ReportData {
  period: string;
  revenueByPeriod: Record<string, number>;
  occupancyByType: { STUDIO: number; PREMIUM: number };
  monthlyByMonth: Record<string, { count: number; revenue: number }>;
  summary: {
    totalRevenue: number;
    totalBookings: number;
    avgBookingValue: number;
    cancellationRate: number;
    cancelledBookings: number;
  };
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("monthly");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports/revenue?period=${period}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [period]);

  const monthlyRevenue = data ? Object.entries(data.revenueByPeriod)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12) : [];

  const maxRevenue = Math.max(...monthlyRevenue.map(([, v]) => v), 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Revenue analytics, occupancy trends, and booking statistics"
      />

      {/* Period selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Period:</span>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <option value="daily">Last 30 Days (Daily)</option>
            <option value="weekly">Last 12 Weeks</option>
            <option value="monthly">Last 12 Months</option>
            <option value="yearly">Last 2 Years (Yearly)</option>
          </SelectContent>
        </Select>
      </div>

      {loading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Revenue"
              value={data.summary.totalRevenue}
              format="currency"
              icon={DollarSign}
            />
            <StatCard
              label="Total Bookings"
              value={data.summary.totalBookings}
              icon={CalendarDays}
            />
            <StatCard
              label="Avg. Booking Value"
              value={formatCurrency(data.summary.avgBookingValue)}
              icon={TrendingUp}
            />
            <StatCard
              label="Cancellation Rate"
              value={`${data.summary.cancellationRate}%`}
              format="percent"
              icon={AlertTriangle}
              className={data.summary.cancellationRate > 15 ? "border-l-4 border-l-destructive" : ""}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Revenue by {period === "daily" ? "Day" : period === "weekly" ? "Week" : period === "yearly" ? "Year" : "Month"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {monthlyRevenue.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
                  ) : (
                    monthlyRevenue.map(([key, value]) => (
                      <div key={key} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-20 shrink-0 font-mono">{key}</span>
                        <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                            style={{ width: `${Math.max(2, (value / maxRevenue) * 100)}%` }}
                          >
                            {value / maxRevenue > 0.15 && (
                              <span className="text-[10px] font-bold text-primary-foreground">
                                {formatCurrency(value)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Occupancy by Room Type */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <BedDouble className="h-4 w-4 text-primary" />
                  Occupancy by Room Type
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { label: "Studio", value: data.occupancyByType.STUDIO, color: "bg-blue-500" },
                  { label: "Premium", value: data.occupancyByType.PREMIUM, color: "bg-amber-500" },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div className="flex justify-between mb-2">
                      <span className="font-medium text-sm">{label}</span>
                      <span className="text-sm font-bold">{value}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                      <div
                        className={`${color} h-full rounded-full transition-all duration-700`}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t space-y-2">
                  <h3 className="text-sm font-semibold">Cancellation Summary</h3>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cancelled Bookings</span>
                    <span className="font-medium text-destructive">{data.summary.cancelledBookings}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cancellation Rate</span>
                    <span className={`font-medium ${data.summary.cancellationRate > 10 ? "text-destructive" : "text-success"}`}>
                      {data.summary.cancellationRate}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Trend Table */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Monthly Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Month</th>
                        <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Bookings</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(data.monthlyByMonth)
                        .sort(([a], [b]) => b.localeCompare(a))
                        .slice(0, 12)
                        .map(([month, stats]) => (
                          <tr key={month} className="border-b last:border-0">
                            <td className="py-2.5 pr-4 font-mono text-xs">{month}</td>
                            <td className="py-2.5 pr-4 text-right font-medium">{stats.count}</td>
                            <td className="py-2.5 text-right font-semibold text-success">
                              {formatCurrency(stats.revenue)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
