"use client";

// apps/admin/src/app/(dashboard)/dashboard/page.tsx
import { useEffect, useState } from "react";
import {
  BedDouble,
  CalendarCheck,
  CalendarX,
  DollarSign,
  Percent,
  TrendingUp,
  Wrench,
  AlertCircle,
} from "lucide-react";
import { StatCard, StatusBadge, PageHeader, Card, CardContent, CardHeader, CardTitle } from "@the-rooms/ui";
import { formatCurrency, formatDate } from "@the-rooms/ui";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { OccupancyChart } from "@/components/charts/OccupancyChart";

interface DashboardStats {
  occupancyRate: number;
  totalRooms: number;
  occupiedRooms: number;
  maintenanceRooms: number;
  todayCheckIns: number;
  todayCheckOuts: number;
  upcomingBookings: number;
  monthRevenue: number;
  monthBookingCount: number;
}

interface MaintenanceAlert {
  id: string;
  roomNumber: string;
  type: string;
  updatedAt: string;
}

interface RecentBooking {
  id: string;
  bookingNumber: string;
  status: string;
  paymentStatus: string;
  checkIn: string;
  checkOut: string;
  totalAmount: string;
  guest: { name: string; phone: string };
  room: { roomNumber: string; type: string };
}

interface OccupancyDataPoint {
  date: string;
  occupancy: number;
}

interface DashboardData {
  stats: DashboardStats;
  maintenanceAlerts: MaintenanceAlert[];
  recentBookings: RecentBooking[];
  revenueByMonth: Record<string, number>;
  occupancyByDay: OccupancyDataPoint[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Property overview and key metrics" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const { stats, maintenanceAlerts, recentBookings, revenueByMonth, occupancyByDay } = data;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Property overview and key metrics" />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Occupancy Rate"
          value={`${stats.occupancyRate}%`}
          format="percent"
          icon={Percent}
          className={stats.occupancyRate >= 70 ? "border-l-4 border-l-success" : ""}
        />
        <StatCard
          label="Revenue MTD"
          value={stats.monthRevenue}
          format="currency"
          icon={DollarSign}
          changeLabel={`${stats.monthBookingCount} bookings`}
        />
        <StatCard
          label="Upcoming Check-ins"
          value={stats.todayCheckIns}
          icon={CalendarCheck}
          changeLabel={`${stats.todayCheckOuts} check-outs today`}
        />
        <StatCard
          label="Rooms in Maintenance"
          value={stats.maintenanceRooms}
          icon={Wrench}
          className={stats.maintenanceRooms > 0 ? "border-l-4 border-l-warning" : ""}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Rooms" value={stats.totalRooms} icon={BedDouble} />
        <StatCard label="Occupied Rooms" value={stats.occupiedRooms} icon={BedDouble} />
        <StatCard label="Upcoming Bookings (7d)" value={stats.upcomingBookings} icon={TrendingUp} />
        <StatCard label="Check-outs Today" value={stats.todayCheckOuts} icon={CalendarX} />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Revenue (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenueByMonth || {}} />
          </CardContent>
        </Card>

        {/* Occupancy Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Occupancy Trend (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <OccupancyChart data={occupancyByDay || []} />
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Bookings */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No recent bookings</p>
            ) : (
              recentBookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-sm font-medium truncate">{b.guest.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.room.roomNumber} · {formatDate(b.checkIn, "short")}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                    <StatusBadge status={b.status as "CONFIRMED"} type="booking" />
                    <span className="text-xs font-medium">{formatCurrency(Number(b.totalAmount))}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Maintenance Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning" />
              Maintenance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {maintenanceAlerts.length === 0 ? (
              <div className="text-center py-8">
                <Wrench className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No rooms under maintenance</p>
              </div>
            ) : (
              <div className="space-y-3">
                {maintenanceAlerts.map((room) => (
                  <div key={room.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-semibold">Room {room.roomNumber}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {room.type.toLowerCase()} · {formatDate(room.updatedAt, "short")}
                      </p>
                    </div>
                    <StatusBadge status="MAINTENANCE" type="room" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
