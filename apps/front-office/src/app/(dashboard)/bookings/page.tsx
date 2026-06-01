"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@the-rooms/ui";
import { Loader2, Plus, Search, Calendar } from "lucide-react";
import { formatDate, formatCurrency } from "@the-rooms/ui";

interface Booking { id: string; bookingNumber: string; status: string; paymentStatus: string; bookingSource: string; checkIn: string; checkOut: string; totalAmount: string; guest: { name: string; phone: string }; room: { roomNumber: string; type: string } }

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "confirmed" | "checked_in" | "checked_out" | "cancelled">("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchBookings() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filter !== "all") params.set("status", filter.toUpperCase());
        const res = await fetch(`/api/bookings?${params.toString()}`);
        if (res.ok) { const data = await res.json(); setBookings(data.bookings ?? []); }
      } finally { setLoading(false); }
    }
    fetchBookings();
  }, [filter]);

  const filtered = bookings.filter((b) => !searchQuery || b.guest.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.bookingNumber.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h2 className="text-2xl font-bold text-gray-900">All Bookings</h2><p className="text-gray-500">Manage all bookings</p></div><Link href="/bookings/new" className="inline-flex items-center gap-2 rounded-lg bg-[#E17055] px-4 py-2 text-sm font-medium text-white hover:bg-[#D35B3F]"><Plus className="h-4 w-4" />New Booking</Link></div>
      <div className="flex items-center gap-4 border-b border-gray-200">
        {[{ key: "all", label: "All" }, { key: "confirmed", label: "Confirmed" }, { key: "checked_in", label: "Checked In" }, { key: "checked_out", label: "Checked Out" }, { key: "cancelled", label: "Cancelled" }].map((tab) => (
          <button key={tab.key} onClick={() => setFilter(tab.key as typeof filter)} className={cn("pb-3 px-1 border-b-2 text-sm font-medium transition-colors", filter === tab.key ? "border-[#E17055] text-[#E17055]" : "border-transparent text-gray-500 hover:text-gray-700")}>{tab.label}</button>
        ))}
      </div>
      <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055]" /></div>
      {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#E17055]" /></div> : filtered.length === 0 ? <div className="rounded-xl border border-gray-200 bg-white py-12 text-center"><Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">No bookings found</p></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((booking) => (
            <Link key={booking.id} href={`/bookings/${booking.id}`} className="rounded-xl border border-gray-200 bg-white hover:shadow-md hover:border-[#E17055] transition-all">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4"><div><div className="flex items-center gap-2"><h3 className="font-semibold text-gray-900">{booking.guest.name}</h3><span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{booking.bookingSource}</span></div><p className="text-sm text-gray-500">{booking.guest.phone}</p></div><span className={cn("rounded-full px-3 py-1 text-xs font-medium", booking.status === "CONFIRMED" ? "bg-green-100 text-green-700" : booking.status === "CHECKED_IN" ? "bg-blue-100 text-blue-700" : booking.status === "CHECKED_OUT" ? "bg-gray-100 text-gray-700" : "bg-red-100 text-red-700")}>{booking.status.replace("_", " ")}</span></div>
                <div className="space-y-2 text-sm"><div className="flex items-center gap-2 text-gray-600"><Calendar className="h-4 w-4" />{formatDate(booking.checkIn, "short")} - {formatDate(booking.checkOut, "short")}</div><div className="flex items-center justify-between"><span className="text-gray-600">Room {booking.room.roomNumber}</span><span className="font-semibold text-[#E17055]">{formatCurrency(Number(booking.totalAmount))}</span></div></div>
              </div>
              <div className="border-t border-gray-100 px-6 py-3 flex items-center justify-between text-sm"><span className="text-gray-400">#{booking.bookingNumber}</span></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
