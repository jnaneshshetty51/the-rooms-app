"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@the-rooms/ui";
import { Search, Loader2, User, Check } from "lucide-react";
import { formatDate, formatCurrency } from "@the-rooms/ui";

interface Guest { id: string; name: string; phone: string; email?: string; bookings: Array<{ id: string; checkIn: string; checkOut: string; status: string; room: { roomNumber: string; type: string } }> }
interface Room { id: string; roomNumber: string; type: "STUDIO" | "PREMIUM"; floor: number; status: string; basePriceSingle: number; basePriceDouble: number }
interface BookingForm { guestId?: string; guestName: string; guestPhone: string; guestEmail: string; roomId: string; checkIn: string; checkOut: string; guestsCount: number; bookingType: "DAILY" | "MONTHLY"; paymentMethod: string; paymentAmount: number }
const STEPS = [{ id: 1, name: "Guest", icon: User }, { id: 2, name: "Room", icon: User }, { id: 3, name: "Payment", icon: User }, { id: 4, name: "Confirm", icon: Check }];
const PRICING = { STUDIO: { single: 999, double: 1799 }, PREMIUM: { single: 1999, double: 2999 } };

export default function NewBookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedRoom = searchParams.get("room");
  const [step, setStep] = useState(1);
  const [guestSearch, setGuestSearch] = useState("");
  const [guestResults, setGuestResults] = useState<Guest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [form, setForm] = useState<BookingForm>({ guestName: "", guestPhone: "", guestEmail: "", roomId: preselectedRoom ?? "", checkIn: new Date().toISOString().split("T")[0], checkOut: new Date(Date.now() + 86400000).toISOString().split("T")[0], guestsCount: 1, bookingType: "DAILY", paymentMethod: "CASH", paymentAmount: 0 });

  const searchGuests = useCallback(async (query: string) => {
    if (query.length < 2) { setGuestResults([]); return; }
    try { const res = await fetch(`/api/guests/search?q=${encodeURIComponent(query)}`); if (res.ok) { const data = await res.json(); setGuestResults(data.guests ?? []); } } catch {}
  }, []);

  useEffect(() => { const timer = setTimeout(() => { if (guestSearch) searchGuests(guestSearch); }, 300); return () => clearTimeout(timer); }, [guestSearch, searchGuests]);

  useEffect(() => {
    async function fetchRooms() {
      setLoadingRooms(true);
      try { const res = await fetch("/api/rooms/board"); if (res.ok) { const data = await res.json(); setRooms(data.rooms.filter((r: Room) => r.status === "VACANT").map((r: Room & { basePriceSingle?: number; basePriceDouble?: number }) => ({ ...r, basePriceSingle: PRICING[r.type as keyof typeof PRICING]?.single ?? 999, basePriceDouble: PRICING[r.type as keyof typeof PRICING]?.double ?? 1799 }))); } } finally { setLoadingRooms(false); }
    }
    fetchRooms();
  }, []);

  const handleSelectGuest = (guest: Guest) => { setForm((f) => ({ ...f, guestId: guest.id, guestName: guest.name, guestPhone: guest.phone, guestEmail: guest.email ?? "" })); setGuestSearch(""); setGuestResults([]); setStep(2); };

  const pricing = (() => { const room = rooms.find((r) => r.id === form.roomId); if (!room) return { basePrice: 0, nights: 0, total: 0 }; const nights = Math.ceil((new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()) / 86400000); const pricePerNight = form.guestsCount === 1 ? Number(room.basePriceSingle) : Number(room.basePriceDouble); return { basePrice: pricePerNight, nights, total: pricePerNight * nights }; })();

  const handleSubmit = async () => {
    let guestId = form.guestId;
    if (!guestId && form.guestName) {
      const guestRes = await fetch("/api/guests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.guestName, phone: form.guestPhone, email: form.guestEmail || undefined }) });
      if (!guestRes.ok) return; const guestData = await guestRes.json(); guestId = guestData.id;
    }
    const bookingRes = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ guestId, roomId: form.roomId, checkIn: form.checkIn, checkOut: form.checkOut, guestsCount: form.guestsCount, bookingType: form.bookingType, bookingSource: "WALK_IN", baseAmount: pricing.basePrice, totalAmount: pricing.total }) });
    if (!bookingRes.ok) return; const bookingData = await bookingRes.json();
    if (form.paymentAmount > 0) await fetch("/api/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId: bookingData.id, amount: form.paymentAmount, method: form.paymentMethod }) });
    router.push(`/bookings/${bookingData.id}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div><h2 className="text-2xl font-bold text-gray-900">Walk-In Booking</h2><p className="text-gray-500">Create a new booking</p></div>
      <div className="flex items-center justify-between">{STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center"><button onClick={() => step > s.id && setStep(s.id)} disabled={step < s.id} className={cn("flex items-center gap-3 rounded-full px-4 py-2 transition-all", step === s.id ? "bg-[#E17055] text-white" : step > s.id ? "bg-green-100 text-green-700 cursor-pointer" : "bg-gray-100 text-gray-400 cursor-not-allowed")}><s.icon className="h-5 w-5" /><span className="hidden sm:inline font-medium">{s.name}</span></button>{i < STEPS.length - 1 && <div className={cn("h-0.5 w-8 sm:w-16 mx-2", step > s.id ? "bg-green-400" : "bg-gray-200")} />}</div>
      ))}</div>

      {step === 1 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Guest Information</h3>
          <div className="space-y-2"><label className="block text-sm font-medium text-gray-700">Search Existing Guest</label><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><input type="text" value={guestSearch} onChange={(e) => setGuestSearch(e.target.value)} placeholder="Search..." className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055]" /></div></div>
          {guestResults.length > 0 && <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-60 overflow-y-auto">{guestResults.map((guest) => <button key={guest.id} onClick={() => handleSelectGuest(guest)} className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 text-left"><div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center"><User className="h-5 w-5 text-gray-500" /></div><div className="flex-1"><p className="font-medium text-gray-900">{guest.name}</p><p className="text-sm text-gray-500">{guest.phone}</p></div></button>)}</div>}
          <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div><div className="relative flex justify-center"><span className="bg-white px-4 text-sm text-gray-500">or add new guest</span></div></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">Guest Name *</label><input type="text" value={form.guestName} onChange={(e) => setForm((f) => ({ ...f, guestName: e.target.value }))} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055]" /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label><input type="tel" value={form.guestPhone} onChange={(e) => setForm((f) => ({ ...f, guestPhone: e.target.value }))} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055]" /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={form.guestEmail} onChange={(e) => setForm((f) => ({ ...f, guestEmail: e.target.value }))} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055]" /></div></div>
          <button onClick={() => form.guestName && form.guestPhone && setStep(2)} disabled={!form.guestName || !form.guestPhone} className="w-full rounded-lg bg-[#E17055] py-3 text-sm font-medium text-white hover:bg-[#D35B3F] disabled:opacity-50">Continue to Room Selection</button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6"><h3 className="text-lg font-semibold text-gray-900 mb-4">Stay Details</h3><div className="grid grid-cols-1 md:grid-cols-4 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">Check-in</label><input type="date" value={form.checkIn} onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))} className="w-full px-4 py-3 rounded-lg border border-gray-300" /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Check-out</label><input type="date" value={form.checkOut} onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))} className="w-full px-4 py-3 rounded-lg border border-gray-300" /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Guests</label><select value={form.guestsCount} onChange={(e) => setForm((f) => ({ ...f, guestsCount: parseInt(e.target.value) }))} className="w-full px-4 py-3 rounded-lg border border-gray-300"><option value={1}>1 Guest</option><option value={2}>2 Guests</option></select></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Type</label><select value={form.bookingType} onChange={(e) => setForm((f) => ({ ...f, bookingType: e.target.value as "DAILY" | "MONTHLY" }))} className="w-full px-4 py-3 rounded-lg border border-gray-300"><option value="DAILY">Daily</option><option value="MONTHLY">Monthly</option></select></div></div></div>
          <div className="rounded-xl border border-gray-200 bg-white p-6"><h3 className="text-lg font-semibold text-gray-900 mb-4">Select Room</h3>{loadingRooms ? <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#E17055]" /></div> : <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{rooms.map((room) => { const price = form.guestsCount === 1 ? Number(room.basePriceSingle) : Number(room.basePriceDouble); const isSelected = form.roomId === room.id; return <button key={room.id} onClick={() => setForm((f) => ({ ...f, roomId: room.id }))} className={cn("rounded-xl border-2 p-4 text-left transition-all", isSelected ? "border-[#E17055] bg-[#E17055]/5 ring-2 ring-[#E17055]" : "border-gray-200 hover:border-gray-300")}><div className="flex items-center justify-between mb-2"><span className="text-xl font-bold text-gray-900">{room.roomNumber}</span><span className="text-xs font-medium text-gray-500">{room.type}</span></div><p className="text-lg font-bold text-[#E17055]">{formatCurrency(price)}</p><p className="text-xs text-gray-500">per night</p></button>; })}</div>}</div>
          <div className="flex gap-3"><button onClick={() => setStep(1)} className="flex-1 rounded-lg border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">Back</button><button onClick={() => { setForm((f) => ({ ...f, paymentAmount: pricing.total })); setStep(3); }} disabled={!form.roomId} className="flex-1 rounded-lg bg-[#E17055] py-3 text-sm font-medium text-white hover:bg-[#D35B3F] disabled:opacity-50">Continue to Payment</button></div>
        </div>
      )}

      {step === 3 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>
          <div className="rounded-lg bg-gray-50 p-4 space-y-2"><div className="flex justify-between text-sm"><span className="text-gray-600">{pricing.nights} night{pricing.nights > 1 ? "s" : ""} × {formatCurrency(pricing.basePrice)}</span><span className="text-gray-900">{formatCurrency(pricing.total)}</span></div><div className="flex justify-between font-semibold text-lg border-t border-gray-200 pt-2"><span>Total</span><span className="text-[#E17055]">{formatCurrency(pricing.total)}</span></div></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{["CASH", "UPI", "CARD", "BANK_TRANSFER"].map((method) => <button key={method} onClick={() => setForm((f) => ({ ...f, paymentMethod: method }))} className={cn("rounded-lg border-2 py-3 text-sm font-medium transition-all", form.paymentMethod === method ? "border-[#E17055] bg-[#E17055]/5 text-[#E17055]" : "border-gray-200 text-gray-600 hover:border-gray-300")}>{method.replace("_", " ")}</button>)}</div></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Amount Collected</label><input type="number" value={form.paymentAmount} onChange={(e) => setForm((f) => ({ ...f, paymentAmount: parseInt(e.target.value) || 0 }))} className="w-full px-4 py-3 rounded-lg border border-gray-300 text-lg font-semibold" /></div>
          <div className="flex gap-3"><button onClick={() => setStep(2)} className="flex-1 rounded-lg border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">Back</button><button onClick={() => setStep(4)} className="flex-1 rounded-lg bg-[#E17055] py-3 text-sm font-medium text-white hover:bg-[#D35B3F]">Review Booking</button></div>
        </div>
      )}

      {step === 4 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Confirm Booking</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4"><h4 className="font-medium text-gray-900">Guest Details</h4><div className="space-y-2 text-sm"><div className="flex items-center gap-2"><User className="h-4 w-4 text-gray-400" /><span>{form.guestName}</span></div><div><span className="text-gray-500">Phone: </span><span>{form.guestPhone}</span></div></div></div>
            <div className="space-y-4"><h4 className="font-medium text-gray-900">Booking Details</h4><div className="space-y-2 text-sm"><div><span className="text-gray-500">Dates: </span><span>{formatDate(form.checkIn, "short")} - {formatDate(form.checkOut, "short")}</span></div><div><span className="text-gray-500">Room: </span><span className="font-medium">{rooms.find((r) => r.id === form.roomId)?.roomNumber}</span></div></div></div>
          </div>
          <div className="rounded-lg bg-gray-50 p-4 space-y-2"><div className="flex justify-between text-sm"><span className="text-gray-600">Room Charges</span><span className="text-gray-900">{formatCurrency(pricing.total)}</span></div><div className="flex justify-between text-sm"><span className="text-gray-600">Amount Paid</span><span className="text-green-600">{formatCurrency(form.paymentAmount)}</span></div><div className="flex justify-between font-semibold text-lg border-t border-gray-200 pt-2"><span>Balance Due</span><span className="text-[#E17055]">{formatCurrency(pricing.total - form.paymentAmount)}</span></div></div>
          <div className="flex gap-3"><button onClick={() => setStep(3)} className="flex-1 rounded-lg border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">Back</button><button onClick={handleSubmit} className="flex-1 rounded-lg bg-[#E17055] py-3 text-sm font-medium text-white hover:bg-[#D35B3F] flex items-center justify-center gap-2"><Check className="h-4 w-4" />Confirm Booking</button></div>
        </div>
      )}
    </div>
  );
}
