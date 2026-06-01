"use client";

import { useState } from "react";
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

const REVENUE_DATA: RevenuePeriod[] = [
  {
    label: "Today",
    grossRevenue: 38450,
    netRevenue: 33480,
    expenses: 4200,
    profit: 29280,
    bookings: 4,
    adr: 1922,
  },
  {
    label: "This Week",
    grossRevenue: 287340,
    netRevenue: 249780,
    expenses: 31500,
    profit: 218280,
    bookings: 31,
    adr: 1847,
  },
  {
    label: "This Month",
    grossRevenue: 948217,
    netRevenue: 824150,
    expenses: 142300,
    profit: 681850,
    bookings: 98,
    adr: 1847,
  },
  {
    label: "This Year",
    grossRevenue: 6842900,
    netRevenue: 5948900,
    expenses: 1823400,
    profit: 4125500,
    bookings: 1247,
    adr: 1789,
  },
];

const ROOM_BREAKDOWN = [
  { type: "Studio", daily: 18, monthly: 12, revenue: 412890, percentage: 43.5 },
  { type: "Premium", daily: 14, monthly: 6, revenue: 535327, percentage: 56.5 },
];

const BOOKING_TYPE_BREAKDOWN = [
  { type: "Daily", bookings: 78, revenue: 598420, percentage: 63.1 },
  { type: "Monthly", bookings: 20, revenue: 349797, percentage: 36.9 },
];

const DAILY_TREND = [
  { date: "May 23", revenue: 38200 },
  { date: "May 24", revenue: 41500 },
  { date: "May 25", revenue: 39800 },
  { date: "May 26", revenue: 44200 },
  { date: "May 27", revenue: 45600 },
  { date: "May 28", revenue: 42300 },
  { date: "May 29", revenue: 38450 },
];

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
          value={formatCurrency(948217)}
          format="currency"
          change={8.2}
          changeLabel="vs last month"
          icon={DollarSign}
        />
        <StatCard
          label="Total Expenses"
          value={formatCurrency(142300)}
          format="currency"
          change={-3.1}
          changeLabel="vs last month"
          icon={TrendingDown}
        />
        <StatCard
          label="Net Profit"
          value={formatCurrency(681850)}
          format="currency"
          change={11.4}
          changeLabel="vs last month"
          icon={TrendingUp}
        />
        <StatCard
          label="Net Margin"
          value="71.9%"
          change={2.3}
          changeLabel="vs last month"
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
          <RevenueTable data={REVENUE_DATA} />
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
                {ROOM_BREAKDOWN.map((r) => (
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
                {BOOKING_TYPE_BREAKDOWN.map((b) => (
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
                {DAILY_TREND.map((day, i) => {
                  const max = Math.max(...DAILY_TREND.map((d) => d.revenue));
                  const pct = (day.revenue / max) * 100;
                  return (
                    <div key={day.date} className="flex items-center gap-4">
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
