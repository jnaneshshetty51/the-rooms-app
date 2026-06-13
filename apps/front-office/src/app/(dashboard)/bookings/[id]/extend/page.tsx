"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@the-rooms/ui";
import { Loader2, ArrowLeft, Calendar, CheckCircle, AlertCircle, IndianRupee } from "lucide-react";
import { formatDate, formatCurrency } from "@the-rooms/ui";

interface Booking { id: string; bookingNumber: string; status: string; checkIn: string; checkOut: string; totalAmount: string; guest: { name: string; phone: string }; room: { roomNumber: string; type: string; basePriceSingle: number; basePriceDouble: number } }

export default function ModifyStayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCheckOut, setNewCheckOut] = useState("");
  const [guestsCount, setGuestsCount] = useState(1);

  useEffect(() => {
    async function fetchBooking() {
      try { const res = await fetch(`/api/bookings/${id}`); if (!res.ok) throw new Error("Not found"); const data = await res.json(); if (data.status !== "CHECKED_IN" && data.status !== "CONFIRMED") setError("Only active bookings can be modified"); setBooking(data); const t = new Date(data.checkOut); setNewCheckOut(t.toISOString().split("T")[0]); }
      catch (err) { setError(err instanceof Error ? err.message : "Unknown"); }
      finally { setLoading(false); }
    }
    fetchBooking();
  }, [id]);

  const charges = (() => {
    if (!booking || !newCheckOut) return { nightsDifference: 0, additionalAmount: 0, newTotal: Number(booking?.totalAmount || 0), isInvalidDate: true };
    
    const origCheckOut = new Date(booking.checkOut); 
    const ext = new Date(newCheckOut);
    const checkIn = new Date(booking.checkIn);

    if (ext <= checkIn) return { nightsDifference: 0, additionalAmount: 0, newTotal: Number(booking.totalAmount), isInvalidDate: true };
    
    const origNights = Math.ceil((origCheckOut.getTime() - checkIn.getTime()) / 86400000);
    const newNights = Math.ceil((ext.getTime() - checkIn.getTime()) / 86400000);
    const nightsDifference = newNights - origNights;
    
    const pricePerNight = guestsCount === 1
      ? Number(booking.room.basePriceSingle)
      : Number(booking.room.basePriceDouble);
    
    const newTotal = newNights * pricePerNight;
    const additionalAmount = newTotal - Number(booking.totalAmount);
    
    return { nightsDifference, additionalAmount, newTotal, isInvalidDate: false };
  })();

  const handleModify = async () => {
    if (charges.isInvalidDate || !booking) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/modify-stay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newCheckOut, guestsCount })
      });
      if (res.ok) {
        router.push(`/bookings/${booking.id}`);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to modify stay");
      }
    } catch (e) {
      setError("An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#E17055]" /></div>;
  if (!booking) return <div className="flex h-[60vh] items-center justify-center"><div className="text-center"><AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" /><p className="text-gray-900 font-medium">{error || "Not found"}</p><Link href={`/bookings/${id}`} className="mt-4 text-[#E17055]">Back</Link></div></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4"><Link href={`/bookings/${id}`} className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50"><ArrowLeft className="h-5 w-5" /></Link><div><h2 className="text-2xl font-bold text-gray-900">Modify Stay Dates</h2><p className="text-gray-500">Booking #{booking.bookingNumber} • Room {booking.room.roomNumber}</p></div></div>
      <div className="rounded-xl border bg-white p-6"><h3 className="text-lg font-semibold mb-4">Current Booking</h3><div className="grid grid-cols-2 gap-4"><div><p className="text-sm text-gray-500">Guest</p><p className="font-medium">{booking.guest.name}</p></div><div><p className="text-sm text-gray-500">Current Check-out</p><p className="font-medium">{formatDate(booking.checkOut, "long")}</p></div><div><p className="text-sm text-gray-500">Check-in</p><p className="font-medium">{formatDate(booking.checkIn, "long")}</p></div><div><p className="text-sm text-gray-500">Current Total</p><p className="font-medium">{formatCurrency(Number(booking.totalAmount))}</p></div></div></div>
      <div className="rounded-xl border bg-white p-6 space-y-6"><h3 className="text-lg font-semibold">Modify Options</h3><div><label className="block text-sm font-medium mb-2">New Check-out Date</label><input type="date" value={newCheckOut} onChange={(e) => setNewCheckOut(e.target.value)} className="w-full px-4 py-3 rounded-lg border" /></div><div><label className="block text-sm font-medium mb-2">Number of Guests</label><select value={guestsCount} onChange={(e) => setGuestsCount(parseInt(e.target.value))} className="w-full px-4 py-3 rounded-lg border"><option value={1}>1 Guest</option><option value={2}>2 Guests</option></select></div>
      {charges.nightsDifference !== 0 && !charges.isInvalidDate && (
        <div className={cn("rounded-lg border p-4", charges.nightsDifference > 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200")}>
          <h4 className={cn("font-medium", charges.nightsDifference > 0 ? "text-blue-900" : "text-orange-900")}>
            {charges.nightsDifference > 0 ? "Additional Charges" : "Refund Amount"}
          </h4>
          <div className={cn("flex justify-between text-sm", charges.nightsDifference > 0 ? "text-blue-700" : "text-orange-700")}>
            <span>{Math.abs(charges.nightsDifference)} night{Math.abs(charges.nightsDifference) > 1 ? "s" : ""} {charges.nightsDifference > 0 ? "more" : "less"}</span>
            <span>{charges.additionalAmount > 0 ? "+" : ""}{formatCurrency(charges.additionalAmount)}</span>
          </div>
        </div>
      )}
      {error && <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{error}</div>}
      </div>
      <div className="rounded-xl border bg-white p-6"><h3 className="text-lg font-semibold mb-4">Updated Summary</h3><div className="space-y-3"><div className="flex justify-between text-sm"><span className="text-gray-600">Current Total</span><span>{formatCurrency(Number(booking.totalAmount))}</span></div><div className="flex justify-between text-sm text-gray-600"><span>Difference</span><span className={charges.additionalAmount > 0 ? "text-blue-600" : charges.additionalAmount < 0 ? "text-orange-600" : ""}>{charges.additionalAmount > 0 ? "+" : ""}{formatCurrency(charges.additionalAmount)}</span></div><div className="flex justify-between font-semibold text-lg border-t pt-3"><span>New Total</span><span className="text-[#E17055]">{formatCurrency(charges.newTotal)}</span></div></div></div>
      <div className="flex gap-3"><Link href={`/bookings/${id}`} className="flex-1 border border-gray-300 py-3 text-center text-gray-700 hover:bg-gray-50 rounded-lg">Cancel</Link><button onClick={handleModify} disabled={charges.isInvalidDate || submitting} className="flex-1 rounded-lg bg-[#E17055] py-3 text-white hover:bg-[#D35B3F] disabled:opacity-50 flex items-center justify-center gap-2">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}Modify Stay</button></div>
    </div>
  );
}
