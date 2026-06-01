"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { cn } from "@the-rooms/ui";
import { Loader2, ArrowLeft, Calendar, CheckCircle, AlertCircle, IndianRupee } from "lucide-react";
import { formatDate, formatCurrency } from "@the-rooms/ui";

interface Booking { id: string; bookingNumber: string; status: string; checkIn: string; checkOut: string; totalAmount: string; guest: { name: string; phone: string }; room: { roomNumber: string; type: string; basePriceSingle: number; basePriceDouble: number } }
const PRICING = { STUDIO: { single: 999, double: 1799 }, PREMIUM: { single: 1999, double: 2999 } };

export default function ExtendStayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newCheckOut, setNewCheckOut] = useState("");
  const [guestsCount, setGuestsCount] = useState(1);

  useEffect(() => {
    async function fetchBooking() {
      try { const res = await fetch(`/api/bookings/${id}`); if (!res.ok) throw new Error("Not found"); const data = await res.json(); if (data.status !== "CHECKED_IN") setError("Only checked-in bookings can be extended"); setBooking(data); const t = new Date(data.checkOut); t.setDate(t.getDate() + 1); setNewCheckOut(t.toISOString().split("T")[0]); }
      catch (err) { setError(err instanceof Error ? err.message : "Unknown"); }
      finally { setLoading(false); }
    }
    fetchBooking();
  }, [id]);

  const charges = (() => {
    if (!booking || !newCheckOut) return { nights: 0, additionalAmount: 0, newTotal: 0 };
    const curr = new Date(booking.checkOut); const ext = new Date(newCheckOut);
    if (ext <= curr) return { nights: 0, additionalAmount: 0, newTotal: 0 };
    const additionalNights = Math.ceil((ext.getTime() - curr.getTime()) / 86400000);
    const rt = booking.room.type as keyof typeof PRICING;
    const pricePerNight = guestsCount === 1 ? PRICING[rt]?.single ?? 999 : PRICING[rt]?.double ?? 1799;
    const additionalAmount = additionalNights * pricePerNight;
    return { nights: additionalNights, additionalAmount, newTotal: Number(booking.totalAmount) + additionalAmount };
  })();

  const totalPaid = 0;
  const newBalanceDue = charges.newTotal - totalPaid;

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#E17055]" /></div>;
  if (error || !booking) return <div className="flex h-[60vh] items-center justify-center"><div className="text-center"><AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" /><p className="text-gray-900 font-medium">{error}</p><Link href={`/bookings/${id}`} className="mt-4 text-[#E17055]">Back</Link></div></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4"><Link href={`/bookings/${id}`} className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50"><ArrowLeft className="h-5 w-5" /></Link><div><h2 className="text-2xl font-bold text-gray-900">Extend Stay</h2><p className="text-gray-500">Booking #{booking.bookingNumber} • Room {booking.room.roomNumber}</p></div></div>
      <div className="rounded-xl border bg-white p-6"><h3 className="text-lg font-semibold mb-4">Current Booking</h3><div className="grid grid-cols-2 gap-4"><div><p className="text-sm text-gray-500">Guest</p><p className="font-medium">{booking.guest.name}</p></div><div><p className="text-sm text-gray-500">Current Check-out</p><p className="font-medium">{formatDate(booking.checkOut, "long")}</p></div><div><p className="text-sm text-gray-500">Phone</p><p className="font-medium">{booking.guest.phone}</p></div><div><p className="text-sm text-gray-500">Current Total</p><p className="font-medium">{formatCurrency(Number(booking.totalAmount))}</p></div></div></div>
      <div className="rounded-xl border bg-white p-6 space-y-6"><h3 className="text-lg font-semibold">Extend Options</h3><div><label className="block text-sm font-medium mb-2">New Check-out Date</label><input type="date" value={newCheckOut} onChange={(e) => setNewCheckOut(e.target.value)} className="w-full px-4 py-3 rounded-lg border" /></div><div><label className="block text-sm font-medium mb-2">Number of Guests</label><select value={guestsCount} onChange={(e) => setGuestsCount(parseInt(e.target.value))} className="w-full px-4 py-3 rounded-lg border"><option value={1}>1 Guest</option><option value={2}>2 Guests</option></select></div>{charges.nights > 0 && <div className="rounded-lg bg-blue-50 border border-blue-200 p-4"><h4 className="font-medium text-blue-900">Additional Charges</h4><div className="flex justify-between text-sm text-blue-700"><span>{charges.nights} night{charges.nights > 1 ? "s" : ""}</span><span>+{formatCurrency(charges.additionalAmount)}</span></div></div>}</div>
      <div className="rounded-xl border bg-white p-6"><h3 className="text-lg font-semibold mb-4">Updated Summary</h3><div className="space-y-3"><div className="flex justify-between text-sm"><span className="text-gray-600">Current Total</span><span>{formatCurrency(Number(booking.totalAmount))}</span></div><div className="flex justify-between text-sm text-green-600"><span>Additional</span><span>+{formatCurrency(charges.additionalAmount)}</span></div><div className="flex justify-between font-semibold text-lg border-t pt-3"><span>New Total</span><span className="text-[#E17055]">{formatCurrency(charges.newTotal)}</span></div><div className="flex justify-between font-semibold border-t pt-3"><span>New Balance</span><span className={newBalanceDue > 0 ? "text-orange-600" : "text-green-600"}>{formatCurrency(newBalanceDue)}</span></div></div></div>
      <div className="flex gap-3"><Link href={`/bookings/${id}`} className="flex-1 border border-gray-300 py-3 text-center text-gray-700 hover:bg-gray-50">Cancel</Link><button disabled={charges.nights <= 0} className="flex-1 bg-[#E17055] py-3 text-white hover:bg-[#D35B3F] disabled:opacity-50 flex items-center justify-center gap-2"><CheckCircle className="h-4 w-4" />Extend Stay</button></div>
    </div>
  );
}
