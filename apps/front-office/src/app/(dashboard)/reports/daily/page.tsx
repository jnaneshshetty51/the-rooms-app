"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@the-rooms/ui";
import {
  Loader2,
  Calendar,
  Users,
  Bed,
  CreditCard,
  TrendingUp,
  AlertCircle,
  Printer,
  Download,
  ArrowRight,
} from "lucide-react";
import { formatDate, formatCurrency } from "@the-rooms/ui";

interface DailyReport {
  date: string;
  summary: {
    totalRooms: number;
    occupiedRooms: number;
    vacantRooms: number;
    maintenanceRooms: number;
    inHouseCount: number;
    occupancyRate: number;
    totalRevenue: number;
    openComplaints: number;
  };
  arrivals: Array<{
    id: string;
    bookingNumber: string;
    guest: { name: string; phone: string };
    room: { roomNumber: string; type: string };
  }>;
  departures: Array<{
    id: string;
    bookingNumber: string;
    guest: { name: string; phone: string };
    room: { roomNumber: string; type: string };
  }>;
  checkedOutToday: Array<{
    id: string;
    bookingNumber: string;
    guest: { name: string };
    room: { roomNumber: string };
    payments: Array<{ amount: string }>;
  }>;
  paymentsToday: Array<{
    id: string;
    amount: string;
    method: string;
    createdAt: string;
    booking?: {
      guest: { name: string };
      room: { roomNumber: string };
    };
  }>;
  roomTypeBreakdown: {
    studio: { total: number; occupied: number };
    premium: { total: number; occupied: number };
  };
}

export default function DailyReportPage() {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    async function fetchReport() {
      setLoading(true);
      try {
        const res = await fetch(`/api/daily-report?date=${selectedDate}`);
        if (!res.ok) throw new Error("Failed to fetch report");
        const data = await res.json();
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [selectedDate]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#E17055]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 font-medium">{error}</p>
          <button
            onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
            className="mt-4 text-[#E17055] hover:underline"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Daily Report</h2>
          <p className="text-gray-500">End of day summary for {formatDate(selectedDate, "long")}</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-[#E17055]"
          />
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Occupancy</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {report?.summary.occupancyRate ?? 0}%
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full"
              style={{ width: `${report?.summary.occupancyRate ?? 0}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">In-House</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {report?.summary.inHouseCount ?? 0}
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            of {report?.summary.totalRooms ?? 0} rooms
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Today&apos;s Revenue</p>
              <p className="mt-2 text-3xl font-bold text-[#E17055]">
                {formatCurrency(report?.summary.totalRevenue ?? 0)}
              </p>
            </div>
            <CreditCard className="h-8 w-8 text-emerald-600" />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Arrivals</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {report?.arrivals.length ?? 0}
              </p>
            </div>
            <ArrowRight className="h-8 w-8 text-green-600 rotate-180" />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {report?.departures.length ?? 0} departures
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Room Occupancy */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Room Occupancy</h3>
          <div className="space-y-4">
            {/* Overall */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Overall</span>
                <span className="font-medium">
                  {report?.summary.occupiedRooms ?? 0}/{report?.summary.totalRooms ?? 0}
                </span>
              </div>
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${report?.summary.occupancyRate ?? 0}%` }}
                />
              </div>
            </div>

            {/* Studio */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Studio Rooms</span>
                <span className="font-medium">
                  {report?.roomTypeBreakdown.studio.occupied ?? 0}/
                  {report?.roomTypeBreakdown.studio.total ?? 0}
                </span>
              </div>
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{
                    width: `${((report?.roomTypeBreakdown.studio.occupied ?? 0) /
                      (report?.roomTypeBreakdown.studio.total ?? 1)) *
                      100
                      }%`,
                  }}
                />
              </div>
            </div>

            {/* Premium */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Premium Rooms</span>
                <span className="font-medium">
                  {report?.roomTypeBreakdown.premium.occupied ?? 0}/
                  {report?.roomTypeBreakdown.premium.total ?? 0}
                </span>
              </div>
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{
                    width: `${((report?.roomTypeBreakdown.premium.occupied ?? 0) /
                      (report?.roomTypeBreakdown.premium.total ?? 1)) *
                      100
                      }%`,
                  }}
                />
              </div>
            </div>

            {/* Maintenance */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Maintenance</span>
                <span className="text-sm font-medium text-yellow-600">
                  {report?.summary.maintenanceRooms ?? 0} rooms
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Arrivals & Departures */}
        <div className="space-y-6">
          {/* Arrivals */}
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Arrivals</h3>
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                {report?.arrivals.length ?? 0}
              </span>
            </div>
            <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
              {report?.arrivals.length === 0 ? (
                <p className="px-6 py-8 text-center text-gray-500">No arrivals</p>
              ) : (
                report?.arrivals.map((arrival) => (
                  <div key={arrival.id} className="px-6 py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{arrival.guest.name}</p>
                      <p className="text-sm text-gray-500">{arrival.guest.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">Room {arrival.room.roomNumber}</p>
                      <p className="text-xs text-gray-500">{arrival.room.type}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Departures */}
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Departures</h3>
              <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
                {report?.departures.length ?? 0}
              </span>
            </div>
            <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
              {report?.departures.length === 0 ? (
                <p className="px-6 py-8 text-center text-gray-500">No departures</p>
              ) : (
                report?.departures.map((departure) => (
                  <div key={departure.id} className="px-6 py-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{departure.guest.name}</p>
                      <p className="text-sm text-gray-500">{departure.guest.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">Room {departure.room.roomNumber}</p>
                      <p className="text-xs text-gray-500">{departure.room.type}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">
              {report?.paymentsToday.length ?? 0}
            </p>
            <p className="text-sm text-gray-500">Transactions</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(report?.summary.totalRevenue ?? 0)}
            </p>
            <p className="text-sm text-gray-500">Total Collected</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">
              {report?.checkedOutToday.length ?? 0}
            </p>
            <p className="text-sm text-gray-500">Check-outs</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-orange-600">
              {report?.summary.openComplaints ?? 0}
            </p>
            <p className="text-sm text-gray-500">Open Complaints</p>
          </div>
        </div>
      </div>

    </div>
  );
}
