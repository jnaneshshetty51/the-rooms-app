"use client";

import { useState, useEffect } from "react";
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  StatCard,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Input,
  LoadingSpinner,
} from "@the-rooms/ui";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
} from "lucide-react";
import { formatCurrency } from "@the-rooms/ui";

interface RevenuePeriod {
  label: string;
  grossRevenue: number;
  netRevenue: number;
  expenses: number;
  profit: number;
  bookings: number;
  adr: number;
}

// Mock data removed in favor of live API data

function RevenueTable({ data }: { data: RevenuePeriod[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Period</TableHead>
          <TableHead className="text-right">Gross Revenue</TableHead>
          <TableHead className="text-right">Expenses</TableHead>
          <TableHead className="text-right">Net Revenue</TableHead>
          <TableHead className="text-right">Bookings</TableHead>
          <TableHead className="text-right">ADR</TableHead>
          <TableHead className="text-right">Net Margin</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => {
          const margin = ((row.netRevenue / row.grossRevenue) * 100).toFixed(1);
          return (
            <TableRow key={row.label}>
              <TableCell className="font-medium">{row.label}</TableCell>
              <TableCell className="text-right">{formatCurrency(row.grossRevenue)}</TableCell>
              <TableCell className="text-right text-muted-foreground">
                {formatCurrency(row.expenses)}
              </TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(row.netRevenue)}
              </TableCell>
              <TableCell className="text-right">{row.bookings}</TableCell>
              <TableCell className="text-right">{formatCurrency(row.adr)}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {Number(margin) >= 70 ? (
                    <ArrowUpRight className="h-3 w-3 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-red-500" />
                  )}
                  <span
                    className={
                      Number(margin) >= 70
                        ? "text-green-600 font-semibold"
                        : "text-red-500"
                    }
                  >
                    {margin}%
                  </span>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default function FinancialPage() {
  const [period, setPeriod] = useState("month");
  const [roomFilter, setRoomFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function loadFinancials() {
      try {
        const res = await fetch("/api/financial");
        if (res.ok) {
          const json = await res.json();
          setData(json.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadFinancials();
  }, []);

  if (isLoading || !data) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const { periods, roomBreakdown, bookingTypeBreakdown, dailyTrend, summary } = data;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Financial Overview"
        description="Revenue, expenses, and profitability across all periods"
      />

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Gross Revenue"
          value={formatCurrency(summary.grossRevenue)}
          format="currency"
          icon={DollarSign}
        />
        <StatCard
          label="Total Expenses"
          value={formatCurrency(summary.expenses)}
          format="currency"
          icon={TrendingDown}
        />
        <StatCard
          label="Net Profit"
          value={formatCurrency(summary.netProfit)}
          format="currency"
          icon={TrendingUp}
        />
        <StatCard
          label="Net Margin"
          value={summary.netMargin}
          icon={TrendingUp}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filters:</span>
            </div>
            <Select value={roomFilter} onValueChange={setRoomFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Room Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Rooms</SelectItem>
                <SelectItem value="studio">Studio Only</SelectItem>
                <SelectItem value="premium">Premium Only</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40"
              placeholder="From"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
              placeholder="To"
            />
            <Badge variant="outline" className="text-xs">
              May 1 – May 29, 2026
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Revenue by Period Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Revenue by Period</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueTable data={periods} />
        </CardContent>
      </Card>

      {/* Breakdown Tabs */}
      <Tabs defaultValue="room-type" className="space-y-4">
        <TabsList>
          <TabsTrigger value="room-type">By Room Type</TabsTrigger>
          <TabsTrigger value="booking-type">By Booking Type</TabsTrigger>
          <TabsTrigger value="daily-trend">Daily Trend</TabsTrigger>
        </TabsList>

        <TabsContent value="room-type">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue by Room Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {roomBreakdown.length === 0 && <p className="text-sm text-muted-foreground">No data available for this period.</p>}
                {roomBreakdown.map((r: any) => (
                  <div key={r.type} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{r.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.daily} daily rooms · {r.monthly} monthly guests
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(r.revenue)}</p>
                        <p className="text-xs text-muted-foreground">{r.percentage}% of total</p>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#E17055] rounded-full"
                        style={{ width: `${r.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="booking-type">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue by Booking Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bookingTypeBreakdown.length === 0 && <p className="text-sm text-muted-foreground">No data available for this period.</p>}
                {bookingTypeBreakdown.map((b: any) => (
                  <div key={b.type} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{b.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.bookings} bookings
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(b.revenue)}</p>
                        <p className="text-xs text-muted-foreground">{b.percentage}% of total</p>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#2D3436] rounded-full"
                        style={{ width: `${b.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily-trend">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily Revenue (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dailyTrend.length === 0 && <p className="text-sm text-muted-foreground">No data available.</p>}
                {dailyTrend.map((day: any, i: number) => {
                  const max = Math.max(...dailyTrend.map((d: any) => d.revenue), 1);
                  const pct = (day.revenue / max) * 100;
                  return (
                    <div key={day.date + i} className="flex items-center gap-4">
                      <span className="w-16 text-xs text-muted-foreground">{day.date}</span>
                      <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                        <div
                          className="h-full bg-[#E17055] rounded transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-24 text-right text-xs font-semibold">
                        {formatCurrency(day.revenue)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
