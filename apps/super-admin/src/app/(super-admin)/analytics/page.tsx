"use client";

import { useState, useEffect } from "react";
import { cn } from "@the-rooms/ui";
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
import { Bed, TrendingUp, CalendarDays, BarChart3, Building2, Check } from "lucide-react";
import { formatCurrency } from "@the-rooms/ui";
import { LoadingSpinner } from "@the-rooms/ui";

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

interface PropertyBreakdown {
  propertyId: string;
  propertyName: string;
  propertyCode: string;
  totalRooms?: number;
  occupiedRooms?: number;
  currentOccupancy?: number;
  monthlyRevenue?: number;
  yearlyRevenue?: number;
  monthlyBookings?: number;
  yearlyBookings?: number;
  totalBookings?: number;
}

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
                className={`h-full rounded transition-all ${isPeak ? "bg-[#E17055]" : "bg-[#2D3436]/70"
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

// Property Comparison Chart Component
function PropertyComparisonChart({ properties }: { properties: PropertyBreakdown[] }) {
  const colors = ["bg-[#E17055]", "bg-[#2D3436]/70", "bg-green-500", "bg-blue-500", "bg-purple-500"];

  const maxOccupancy = Math.max(...properties.map(p => p.currentOccupancy || 0), 100);
  const maxRooms = Math.max(...properties.map(p => p.totalRooms || 0), 1);
  const maxRevenue = Math.max(...properties.map(p => p.monthlyRevenue || 0), 1);

  return (
    <div className="space-y-6">
      {/* Occupancy Comparison */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Current Occupancy Rate</h4>
        <div className="space-y-3">
          {properties.map((property, index) => (
            <div key={property.propertyId} className="flex items-center gap-3">
              <div className="w-32 text-xs text-gray-600 truncate" title={property.propertyName}>
                {property.propertyName}
              </div>
              <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", colors[index % colors.length])}
                  style={{ width: `${((property.currentOccupancy || 0) / maxOccupancy) * 100}%` }}
                />
              </div>
              <div className="w-16 text-xs font-medium text-right">
                {(property.currentOccupancy || 0).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total Rooms Comparison */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Total Rooms</h4>
        <div className="space-y-3">
          {properties.map((property, index) => (
            <div key={property.propertyId} className="flex items-center gap-3">
              <div className="w-32 text-xs text-gray-600 truncate" title={property.propertyName}>
                {property.propertyName}
              </div>
              <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", colors[index % colors.length])}
                  style={{ width: `${((property.totalRooms || 0) / maxRooms) * 100}%` }}
                />
              </div>
              <div className="w-16 text-xs font-medium text-right">
                {property.totalRooms || 0}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Revenue Comparison */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Monthly Revenue</h4>
        <div className="space-y-3">
          {properties.map((property, index) => (
            <div key={property.propertyId} className="flex items-center gap-3">
              <div className="w-32 text-xs text-gray-600 truncate" title={property.propertyName}>
                {property.propertyName}
              </div>
              <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", colors[index % colors.length])}
                  style={{ width: `${((property.monthlyRevenue || 0) / maxRevenue) * 100}%` }}
                />
              </div>
              <div className="w-24 text-xs font-medium text-right">
                {formatCurrency(property.monthlyRevenue || 0)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Property Comparison Table
function PropertyComparisonTable({ properties }: { properties: PropertyBreakdown[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left p-3 font-medium text-gray-600">Property</th>
            <th className="text-right p-3 font-medium text-gray-600">Total Rooms</th>
            <th className="text-right p-3 font-medium text-gray-600">Occupied</th>
            <th className="text-right p-3 font-medium text-gray-600">Occupancy %</th>
            <th className="text-right p-3 font-medium text-gray-600">Monthly Bookings</th>
            <th className="text-right p-3 font-medium text-gray-600">Monthly Revenue</th>
          </tr>
        </thead>
        <tbody>
          {properties.map((property) => (
            <tr key={property.propertyId} className="border-b last:border-0">
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">{property.propertyName}</span>
                  <span className="text-xs text-gray-400">({property.propertyCode})</span>
                </div>
              </td>
              <td className="p-3 text-right">{property.totalRooms || 0}</td>
              <td className="p-3 text-right">{property.occupiedRooms || 0}</td>
              <td className="p-3 text-right">
                <span className={cn(
                  "font-semibold",
                  (property.currentOccupancy || 0) >= 70 ? "text-green-600" :
                    (property.currentOccupancy || 0) >= 50 ? "text-yellow-600" : "text-red-600"
                )}>
                  {(property.currentOccupancy || 0).toFixed(1)}%
                </span>
              </td>
              <td className="p-3 text-right">{property.monthlyBookings || 0}</td>
              <td className="p-3 text-right font-semibold text-[#E17055]">
                {formatCurrency(property.monthlyRevenue || 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState("occupancy");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [availableProperties, setAvailableProperties] = useState<PropertyBreakdown[]>([]);

  const [occupancyTrend, setOccupancyTrend] = useState<OccupancyDataPoint[]>([]);
  const [bookingTrends, setBookingTrends] = useState<BookingTrendPoint[]>([]);
  const [adrData, setAdrData] = useState<ADRDataPoint[]>([]);
  const [propertyBreakdown, setPropertyBreakdown] = useState<PropertyBreakdown[]>([]);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [trendsRes, occRes] = await Promise.all([
          fetch("/api/analytics/trends?months=12"),
          fetch("/api/analytics/occupancy?months=12")
        ]);

        if (trendsRes.ok && occRes.ok) {
          const trendsJson = await trendsRes.json();
          const occJson = await occRes.json();

          setBookingTrends(trendsJson.data.bookingTrends || []);
          setAdrData(trendsJson.data.adrData || []);
          setOccupancyTrend(occJson.data.monthlyOccupancy || []);

          // Set property breakdown from API response
          if (occJson.propertyBreakdown) {
            setPropertyBreakdown(occJson.propertyBreakdown);
            // Auto-select first two properties for comparison
            if (occJson.propertyBreakdown.length >= 2) {
              setSelectedProperties([
                occJson.propertyBreakdown[0].propertyId,
                occJson.propertyBreakdown[1].propertyId
              ]);
            } else if (occJson.propertyBreakdown.length === 1) {
              setSelectedProperties([occJson.propertyBreakdown[0].propertyId]);
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const toggleProperty = (propertyId: string) => {
    setSelectedProperties(prev =>
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const selectedPropertyData = propertyBreakdown.filter(p => selectedProperties.includes(p.propertyId));

  if (isLoading || occupancyTrend.length === 0 || bookingTrends.length === 0 || adrData.length === 0) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const latestOcc = occupancyTrend[occupancyTrend.length - 1];
  const prevOcc = occupancyTrend[occupancyTrend.length - 2] || { occupancy: 0 };
  const occChange = latestOcc.occupancy - prevOcc.occupancy;

  const latestBookings = bookingTrends[bookingTrends.length - 1];
  const prevBookings = bookingTrends[bookingTrends.length - 2] || { total: 0 };
  const bookingChange = latestBookings.total - prevBookings.total;

  const latestADR = adrData[adrData.length - 1];
  const prevADR = adrData[adrData.length - 2] || { adr: 1 };
  const adrChange = prevADR.adr > 0 ? ((latestADR.adr - prevADR.adr) / prevADR.adr) * 100 : 0;

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
          <TabsTrigger value="comparison">Property Comparison</TabsTrigger>
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
              <OccupancyChart data={occupancyTrend} />
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
              <BookingTrendChart data={bookingTrends} />
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="p-3 bg-accent/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Daily bookings avg:</strong>{" "}
                    {Math.round(bookingTrends.reduce((s, d) => s + d.daily, 0) / 12)}/month
                  </p>
                </div>
                <div className="p-3 bg-accent/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Monthly bookings avg:</strong>{" "}
                    {Math.round(bookingTrends.reduce((s, d) => s + d.monthly, 0) / 12)}/month
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
              <ADRChart data={adrData} />
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

        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle className="text-base">
                  Property Comparison
                </CardTitle>
                {/* Property Selector */}
                <div className="flex flex-wrap gap-2">
                  {propertyBreakdown.map((property) => (
                    <button
                      key={property.propertyId}
                      onClick={() => toggleProperty(property.propertyId)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all border",
                        selectedProperties.includes(property.propertyId)
                          ? "bg-[#E17055] text-white border-[#E17055]"
                          : "bg-white text-gray-600 border-gray-200 hover:border-[#E17055]"
                      )}
                    >
                      {selectedProperties.includes(property.propertyId) && (
                        <Check className="h-3 w-3" />
                      )}
                      {property.propertyName}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {selectedPropertyData.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Select properties above to compare their performance</p>
                </div>
              ) : selectedPropertyData.length === 1 ? (
                <div className="py-8">
                  <PropertyComparisonTable properties={selectedPropertyData} />
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Comparison Charts */}
                  <PropertyComparisonChart properties={selectedPropertyData} />

                  {/* Comparison Table */}
                  <div className="border-t pt-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-4">Detailed Comparison</h4>
                    <PropertyComparisonTable properties={selectedPropertyData} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
