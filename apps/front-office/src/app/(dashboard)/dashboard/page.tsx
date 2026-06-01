"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, LogOut, CalendarCheck, CalendarX, Bed, AlertCircle, ArrowRight, Loader2, IndianRupee } from "lucide-react";
import { formatDate, formatCurrency } from "@the-rooms/ui";

interface DashboardData {
  date: string;
  arrivals: Array<{ id: string; bookingNumber: string; checkIn: string; guest: { name: string; phone: string }; room: { roomNumber: string; type: string } }>;
  departures: Array<{ id: string; bookingNumber: string; checkOut: string; guest: { name: string; phone: string }; room: { roomNumber: string; type: string } }>;
  inHouseCount: number;
  todayRevenue: number;
  pendingTasks: number;
  summary: { pendingCheckIns: number; pendingCheckOuts: number; openComplaints: number };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/bookings/today");
        if (!res.ok) throw new Error("Failed to fetch");
        setData(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#E17055]" /></div>;
  if (error) return <div className="flex h-[60vh] items-center justify-center"><div className="text-center"><AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" /><p className="text-gray-900 font-medium">{error}</p></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold text-gray-900">{data?.date ? formatDate(data.date, "full") : "Today"}</h2><p className="text-gray-500">Front Office Dashboard</p></div>
        <div className="flex gap-3">
          <Link href="/bookings/new" className="inline-flex items-center gap-2 rounded-lg bg-[#E17055] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#D35B3F] transition-colors"><Users className="h-4 w-4" />Walk-In Booking</Link>
          <Link href="/reports/daily" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Daily Report</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-500">Expected Arrivals</p><p className="mt-2 text-3xl font-bold text-gray-900">{data?.summary.pendingCheckIns ?? 0}</p></div><div className="rounded-lg bg-green-100 p-3"><CalendarCheck className="h-6 w-6 text-green-600" /></div></div>
          <Link href="/bookings?filter=arrivals" className="mt-4 flex items-center gap-1 text-sm font-medium text-[#E17055] hover:text-[#D35B3F]">View all <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-500">Expected Departures</p><p className="mt-2 text-3xl font-bold text-gray-900">{data?.summary.pendingCheckOuts ?? 0}</p></div><div className="rounded-lg bg-orange-100 p-3"><CalendarX className="h-6 w-6 text-orange-600" /></div></div>
          <Link href="/bookings?filter=departures" className="mt-4 flex items-center gap-1 text-sm font-medium text-[#E17055] hover:text-[#D35B3F]">View all <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-500">In-House Guests</p><p className="mt-2 text-3xl font-bold text-gray-900">{data?.inHouseCount ?? 0}</p></div><div className="rounded-lg bg-blue-100 p-3"><Bed className="h-6 w-6 text-blue-600" /></div></div>
          <Link href="/rooms/board" className="mt-4 flex items-center gap-1 text-sm font-medium text-[#E17055] hover:text-[#D35B3F]">View board <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-500">Today&apos;s Revenue</p><p className="mt-2 text-3xl font-bold text-gray-900">{data?.todayRevenue ? formatCurrency(data.todayRevenue) : "₹0"}</p></div><div className="rounded-lg bg-emerald-100 p-3"><IndianRupee className="h-6 w-6 text-emerald-600" /></div></div>
          <Link href="/payments" className="mt-4 flex items-center gap-1 text-sm font-medium text-[#E17055] hover:text-[#D35B3F]">View payments <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4"><h3 className="text-lg font-semibold text-gray-900">Today&apos;s Arrivals</h3><span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">{data?.arrivals.length ?? 0} guests</span></div>
          <div className="divide-y divide-gray-100">
            {data?.arrivals.length === 0 ? <div className="px-6 py-12 text-center"><CalendarCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No arrivals scheduled</p></div> : data?.arrivals.map((arrival) => (
              <Link key={arrival.id} href={`/bookings/${arrival.id}`} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                <div><p className="font-medium text-gray-900">{arrival.guest.name}</p><p className="text-sm text-gray-500">{arrival.guest.phone}</p></div>
                <div className="text-right"><p className="font-medium text-gray-900">Room {arrival.room.roomNumber}</p><p className="text-sm text-gray-500">{arrival.room.type}</p></div>
              </Link>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4"><h3 className="text-lg font-semibold text-gray-900">Today&apos;s Departures</h3><span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">{data?.departures.length ?? 0} guests</span></div>
          <div className="divide-y divide-gray-100">
            {data?.departures.length === 0 ? <div className="px-6 py-12 text-center"><CalendarX className="h-12 w-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No departures scheduled</p></div> : data?.departures.map((departure) => (
              <Link key={departure.id} href={`/bookings/${departure.id}`} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                <div><p className="font-medium text-gray-900">{departure.guest.name}</p><p className="text-sm text-gray-500">{departure.guest.phone}</p></div>
                <div className="text-right"><p className="font-medium text-gray-900">Room {departure.room.roomNumber}</p><p className="text-sm text-gray-500">Check-out: {formatDate(departure.checkOut, "short")}</p></div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {(data?.summary.openComplaints ?? 0) > 0 && <div className="rounded-xl border border-orange-200 bg-orange-50 p-4"><Link href="/complaints" className="flex items-center gap-3"><AlertCircle className="h-5 w-5 text-orange-600" /><span className="font-medium text-orange-800">{data?.summary.openComplaints} open complaint{(data?.summary.openComplaints ?? 0) > 1 ? "s" : ""} need attention</span><ArrowRight className="h-4 w-4 text-orange-600 ml-auto" /></Link></div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/bookings/new" className="rounded-xl border border-gray-200 bg-white p-6 text-center hover:shadow-md hover:border-[#E17055] transition-all"><Users className="h-8 w-8 text-[#E17055] mx-auto mb-3" /><p className="font-medium text-gray-900">New Booking</p><p className="text-sm text-gray-500">Walk-in guest</p></Link>
        <Link href="/guests" className="rounded-xl border border-gray-200 bg-white p-6 text-center hover:shadow-md hover:border-[#E17055] transition-all"><Users className="h-8 w-8 text-[#E17055] mx-auto mb-3" /><p className="font-medium text-gray-900">Guest Search</p><p className="text-sm text-gray-500">Find guest records</p></Link>
        <Link href="/rooms/board" className="rounded-xl border border-gray-200 bg-white p-6 text-center hover:shadow-md hover:border-[#E17055] transition-all"><Bed className="h-8 w-8 text-[#E17055] mx-auto mb-3" /><p className="font-medium text-gray-900">Room Board</p><p className="text-sm text-gray-500">View all rooms</p></Link>
        <Link href="/reports/daily" className="rounded-xl border border-gray-200 bg-white p-6 text-center hover:shadow-md hover:border-[#E17055] transition-all"><LogOut className="h-8 w-8 text-[#E17055] mx-auto mb-3" /><p className="font-medium text-gray-900">End of Day</p><p className="text-sm text-gray-500">Generate report</p></Link>
      </div>
    </div>
  );
}
