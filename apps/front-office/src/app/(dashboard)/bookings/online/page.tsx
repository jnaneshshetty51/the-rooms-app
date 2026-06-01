"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@the-rooms/ui";
import { Loader2, CalendarCheck, Clock, Eye, CheckCircle } from "lucide-react";
import { formatDate, formatCurrency } from "@the-rooms/ui";

interface Booking { id: string; bookingNumber: string; checkIn: string; checkOut: string; status: string; paymentStatus: string; bookingSource: string; guest: { name: string; phone: string; email?: string }; room: { roomNumber: string; type: string }; totalAmount: string }

export default function OnlineBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "confirmed" | "checked_in" | "all">("pending");

  useEffect(() => {
    async function fetchBookings() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filter === "pending") params.set("paymentStatus", "PENDING");
        else if (filter === "confirmed") params.set("status", "CONFIRMED");
        else if (filter === "checked_in") params.set("status", "CHECKED_IN");
        const res = await fetch(`/api/bookings?${params.toString()}`);
        if (res.ok) { const data = await res.json(); setBookings((data.bookings ?? []).filter((b: Booking) => b.bookingSource === "WEBSITE")); }
      } finally { setLoading(false); }
    }
    fetchBookings();
  }, [filter]);

  const pendingCount = bookings.filter((b) => b.paymentStatus === "PENDING").length;
  const confirmedCount = bookings.filter((b) => b.status === "CONFIRMED").length;

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-gray-900">Online Bookings</h2><p className="text-gray-500">Process bookings from the website</p></div>
      <div className="flex items-center gap-4 border-b border-gray-200">
        <button onClick={() => setFilter("pending")} className={cn("flex items-center gap-2 pb-3 px-1 border-b-2 text-sm font-medium transition-colors", filter === "pending" ? "border-[#E17055] text-[#E17055]" : "border-transparent text-gray-500 hover:text-gray-700")}><Clock className="h-4 w-4" />Pending Payment {pendingCount > 0 && <span className="ml-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">{pendingCount}</span>}</button>
        <button onClick={() => setFilter("confirmed")} className={cn("flex items-center gap-2 pb-3 px-1 border-b-2 text-sm font-medium transition-colors", filter === "confirmed" ? "border-[#E17055] text-[#E17055]" : "border-transparent text-gray-500 hover:text-gray-700")}><CalendarCheck className="h-4 w-4" />Awaiting Check-In {confirmedCount > 0 && <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">{confirmedCount}</span>}</button>
        <button onClick={() => setFilter("checked_in")} className={cn("flex items-center gap-2 pb-3 px-1 border-b-2 text-sm font-medium transition-colors", filter === "checked_in" ? "border-[#E17055] text-[#E17055]" : "border-transparent text-gray-500 hover:text-gray-700")}><CheckCircle className="h-4 w-4" />In House</button>
        <button onClick={() => setFilter("all")} className={cn("pb-3 px-1 border-b-2 text-sm font-medium transition-colors", filter === "all" ? "border-[#E17055] text-[#E17055]" : "border-transparent text-gray-500 hover:text-gray-700")}>All</button>
      </div>
      {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#E17055]" /></div> : bookings.length === 0 ? <div className="rounded-xl border border-gray-200 bg-white py-12 text-center"><CalendarCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">No bookings found</p></div> : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div key={booking.id} className="rounded-xl border border-gray-200 bg-white hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div><div className="flex items-center gap-3"><h3 className="text-lg font-semibold text-gray-900">{booking.guest.name}</h3><span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">WEBSITE</span></div><p className="text-sm text-gray-500 mt-1">Booking #{booking.bookingNumber}</p></div>
                  <div className="text-right"><p className="text-lg font-bold text-[#E17055]">{formatCurrency(Number(booking.totalAmount))}</p><span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium", booking.paymentStatus === "PAID" ? "bg-green-100 text-green-700" : booking.paymentStatus === "PENDING" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-700")}>{booking.paymentStatus}</span></div>
                </div>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4"><div><p className="text-xs text-gray-500">Check-in</p><p className="font-medium text-gray-900">{formatDate(booking.checkIn, "short")}</p></div><div><p className="text-xs text-gray-500">Check-out</p><p className="font-medium text-gray-900">{formatDate(booking.checkOut, "short")}</p></div><div><p className="text-xs text-gray-500">Room</p><p className="font-medium text-gray-900">{booking.room.roomNumber}</p></div><div><p className="text-xs text-gray-500">Status</p><span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium", booking.status === "CONFIRMED" ? "bg-green-100 text-green-700" : booking.status === "CHECKED_IN" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700")}>{booking.status.replace("_", " ")}</span></div></div>
              </div>
              <div className="border-t border-gray-100 px-6 py-3 flex gap-3">
                <Link href={`/bookings/${booking.id}`} className="flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"><Eye className="h-4 w-4" />View Details</Link>
                {booking.status === "CONFIRMED" && booking.paymentStatus === "PAID" && <Link href={`/bookings/${booking.id}/check-in`} className="flex items-center gap-1 rounded-lg bg-[#E17055] px-4 py-2 text-sm font-medium text-white hover:bg-[#D35B3F]"><CheckCircle className="h-4 w-4" />Check-In</Link>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
