"use client";

import { useState } from "react";
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  StatCard,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge,
} from "@the-rooms/ui";
import { Bed, TrendingUp, CalendarDays, BarChart3 } from "lucide-react";
import { formatCurrency } from "@the-rooms/ui";

interface OccupancyDataPoint {
  month: string;
  occupancy: number;
  rooms: number;
}

interface BookingTrendPoint {
  month: string;
  daily: number;
  monthly: number;
  total: number;
}

interface ADRDataPoint {
  month: string;
  adr: number;
  revpar: number;
}

const OCCUPANCY_TREND: OccupancyDataPoint[] = [
  { month: "Jun '25", occupancy: 65.2, rooms: 23 },
  { month: "Jul '25", occupancy: 71.8, rooms: 26 },
  { month: "Aug '25", occupancy: 69.4, rooms: 25 },
  { month: "Sep '25", occupancy: 74.1, rooms: 27 },
  { month: "Oct '25", occupancy: 79.6, rooms: 29 },
  { month: "Nov '25", occupancy: 82.3, rooms: 30 },
  { month: "Dec '25", occupancy: 91.2, rooms: 33 },
  { month: "Jan '26", occupancy: 85.7, rooms: 31 },
  { month: "Feb '26", occupancy: 88.4, rooms: 32 },
  { month: "Mar '26", occupancy: 84.1, rooms: 30 },
  { month: "Apr '26", occupancy: 80.9, rooms: 29 },
  { month: "May '26", occupancy: 78.4, rooms: 28 },
];

const BOOKING_TRENDS: BookingTrendPoint[] = [
  { month: "Jun '25", daily: 38, monthly: 8, total: 46 },
  { month: "Jul '25", daily: 42, monthly: 9, total: 51 },
  { month: "Aug '25", daily: 40, monthly: 7, total: 47 },
  { month: "Sep '25", daily: 45, monthly: 10, total: 55 },
  { month: "Oct '25", daily: 52, monthly: 11, total: 63 },
  { month: "Nov '25", daily: 58, monthly: 12, total: 70 },
  { month: "Dec '25", daily: 71, monthly: 14, total: 85 },
  { month: "Jan '26", daily: 63, monthly: 13, total: 76 },
  { month: "Feb '26", daily: 67, monthly: 14, total: 81 },
  { month: "Mar '26", daily: 61, monthly: 12, total: 73 },
  { month: "Apr '26", daily: 58, monthly: 11, total: 69 },
  { month: "May '26", daily: 55, monthly: 10, total: 65 },
];

const ADR_DATA: ADRDataPoint[] = [
  { month: "Jun '25", adr: 1542, revpar: 1005 },
  { month: "Jul '25", adr: 1598, revpar: 1147 },
  { month: "Aug '25", adr: 1612, revpar: 1119 },
  { month: "Sep '25", adr: 1687, revpar: 1250 },
  { month: "Oct '25", adr: 1721, revpar: 1370 },
  { month: "Nov '25", adr: 1789, revpar: 1472 },
  { month: "Dec '25", adr: 1923, revpar: 1753 },
  { month: "Jan '26", adr: 1812, revpar: 1553 },
  { month: "Feb '26", adr: 1834, revpar: 1621 },
  { month: "Mar '26", adr: 1801, revpar: 1515 },
  { month: "Apr '26", adr: 1820, revpar: 1473 },
  { month: "May '26", adr: 1847, revpar: 1448 },
];

function OccupancyChart({ data }: { data: OccupancyDataPoint[] }) {
  const maxOcc = 100;
  return (
    <div className="space-y-2">
      {data.map((d, i) => {
        const isPeak = d.occupancy >= 85;
        return (
          <div key={d.month} className="flex items-center gap-3">
            <span className="w-14 text-xs text-muted-foreground text-right">{d.month}</span>
            <div className="flex-1 h-7 bg-muted rounded overflow-hidden">
              <div
                className={`h-full rounded transition-all ${
                  isPeak ? "bg-[#E17055]" : "bg-[#2D3436]/70"
                }`}
                style={{ width: `${d.occupancy}%` }}
              />
            </div>
            <div className="w-28 text-xs font-medium text-right">
              <span className={isPeak ? "text-[#E17055]" : ""}>
                {d.occupancy.toFixed(1)}%
              </span>
              <span className="text-muted-foreground ml-1">
                ({d.rooms} rooms)
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BookingTrendChart({ data }: { data: BookingTrendPoint[] }) {
  const maxTotal = Math.max(...data.map((d) => d.total));
  return (
    <div className="space-y-2">
      {data.map((d) => {
        const totalPct = (d.total / maxTotal) * 100;
        const dailyPct = (d.daily / maxTotal) * 100;
        return (
          <div key={d.month} className="flex items-center gap-3">
            <span className="w-14 text-xs text-muted-foreground text-right">{d.month}</span>
            <div className="flex-1 h-7 bg-muted rounded overflow-hidden flex">
              <div
                className="h-full bg-[#2D3436]/60 rounded-r"
                style={{ width: `${dailyPct}%` }}
              />
              <div
                className="h-full bg-[#E17055] rounded-l -ml-px"
                style={{ width: `${(d.monthly / maxTotal) * 100}%` }}
              />
            </div>
            <div className="w-20 text-xs font-medium text-right">
              <span className="text-[#2D3436]">{d.daily}</span>
              <span className="text-muted-foreground"> + </span>
              <span className="text-[#E17055]">{d.monthly}</span>
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-6 pt-2 pl-[4.5rem]">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-3 bg-[#2D3436]/60 rounded" />
          <span className="text-[10px] text-muted-foreground">Daily</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-3 bg-[#E17055] rounded" />
          <span className="text-[10px] text-muted-foreground">Monthly</span>
        </div>
      </div>
    </div>
  );
}

function ADRChart({ data }: { data: ADRDataPoint[] }) {
  const maxADR = Math.max(...data.map((d) => d.adr));
  return (
    <div className="space-y-2">
      {data.map((d) => {
        const adrPct = (d.adr / maxADR) * 100;
        const revparPct = (d.revpar / maxADR) * 100;
        return (
          <div key={d.month} className="flex items-center gap-3">
            <span className="w-14 text-xs text-muted-foreground text-right">{d.month}</span>
            <div className="flex-1 space-y-0.5">
              <div className="h-4 bg-muted rounded overflow-hidden">
                <div
                  className="h-full bg-[#E17055] rounded"
                  style={{ width: `${adrPct}%` }}
                />
              </div>
              <div className="h-3 bg-muted/50 rounded overflow-hidden">
                <div
                  className="h-full bg-[#2D3436]/50 rounded"
                  style={{ width: `${revparPct}%` }}
                />
              </div>
            </div>
            <div className="w-32 text-right">
              <p className="text-xs font-semibold">{formatCurrency(d.adr)}</p>
              <p className="text-[10px] text-muted-foreground">RevPAR: {formatCurrency(d.revpar)}</p>
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-6 pt-2 pl-[4.5rem]">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-3 bg-[#E17055] rounded" />
          <span className="text-[10px] text-muted-foreground">ADR</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-3 bg-[#2D3436]/50 rounded" />
          <span className="text-[10px] text-muted-foreground">RevPAR</span>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState("occupancy");

  const latestOcc = OCCUPANCY_TREND[OCCUPANCY_TREND.length - 1];
  const prevOcc = OCCUPANCY_TREND[OCCUPANCY_TREND.length - 2];
  const occChange = latestOcc.occupancy - prevOcc.occupancy;

  const latestBookings = BOOKING_TRENDS[BOOKING_TRENDS.length - 1];
  const prevBookings = BOOKING_TRENDS[BOOKING_TRENDS.length - 2];
  const bookingChange = latestBookings.total - prevBookings.total;

  const latestADR = ADR_DATA[ADR_DATA.length - 1];
  const prevADR = ADR_DATA[ADR_DATA.length - 2];
  const adrChange = ((latestADR.adr - prevADR.adr) / prevADR.adr) * 100;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Analytics"
        description="Occupancy trends, booking patterns, ADR & RevPAR — last 12 months"
      />

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Current Occupancy"
          value={`${latestOcc.occupancy.toFixed(1)}%`}
          format="percent"
          change={occChange}
          changeLabel="vs last month"
          icon={Bed}
        />
        <StatCard
          label="Bookings This Month"
          value={latestBookings.total}
          change={bookingChange}
          changeLabel="vs last month"
          icon={CalendarDays}
        />
        <StatCard
          label="Avg Daily Rate (ADR)"
          value={formatCurrency(latestADR.adr)}
          format="currency"
          change={Number(adrChange.toFixed(1))}
          changeLabel="vs last month"
          icon={TrendingUp}
        />
        <StatCard
          label="RevPAR"
          value={formatCurrency(latestADR.revpar)}
          format="currency"
          icon={BarChart3}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="occupancy">Occupancy Trends</TabsTrigger>
          <TabsTrigger value="bookings">Booking Trends</TabsTrigger>
          <TabsTrigger value="adr">ADR & RevPAR</TabsTrigger>
        </TabsList>

        <TabsContent value="occupancy">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Occupancy Rate — Last 12 Months
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {latestOcc.occupancy.toFixed(1)}% current
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <OccupancyChart data={OCCUPANCY_TREND} />
              <div className="mt-4 p-3 bg-accent/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Peak season:</strong> December 2025 at{" "}
                  <strong>91.2%</strong> occupancy — highest in the past 12 months. Lowest: June 2025 at{" "}
                  <strong>65.2%</strong>.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Booking Trends — Last 12 Months
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {latestBookings.total} bookings this month
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <BookingTrendChart data={BOOKING_TRENDS} />
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="p-3 bg-accent/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Daily bookings avg:</strong>{" "}
                    {Math.round(BOOKING_TRENDS.reduce((s, d) => s + d.daily, 0) / 12)}/month
                  </p>
                </div>
                <div className="p-3 bg-accent/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Monthly bookings avg:</strong>{" "}
                    {Math.round(BOOKING_TRENDS.reduce((s, d) => s + d.monthly, 0) / 12)}/month
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adr">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  ADR & RevPAR — Last 12 Months
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  ADR: {formatCurrency(latestADR.adr)} · RevPAR: {formatCurrency(latestADR.revpar)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ADRChart data={ADR_DATA} />
              <div className="mt-4 p-3 bg-accent/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">ADR formula:</strong> Total Room Revenue ÷ Rooms Sold.{" "}
                  <strong className="text-foreground">RevPAR formula:</strong> ADR × Occupancy Rate.{" "}
                  December shows highest RevPAR at{" "}
                  <strong>{formatCurrency(1753)}</strong>.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
