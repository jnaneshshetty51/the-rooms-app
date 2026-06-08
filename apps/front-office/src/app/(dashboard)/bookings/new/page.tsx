"use client";

import { useEffect, useState, useCallback, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@the-rooms/ui";
import { Search, Loader2, User, Check, Camera, Printer, Link as LinkIcon, CheckCircle } from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency } from "@the-rooms/ui";

interface Guest { id: string; name: string; phone: string; email?: string; bookings: Array<{ id: string; checkIn: string; checkOut: string; status: string; room: { roomNumber: string; type: string } }> }
interface Room { id: string; roomNumber: string; type: "STUDIO" | "PREMIUM"; floor: number; status: string; basePriceSingle: number; basePriceDouble: number }
interface BookingForm { guestId?: string; guestName: string; guestPhone: string; guestEmail: string; roomId: string; checkIn: string; checkOut: string; guestsCount: number; bookingType: "DAILY" | "MONTHLY"; paymentMethod: string; paymentAmount: number; frontId?: string; backId?: string; docType?: string }

const STEPS = [
  { id: 1, name: "Details", icon: User },
  { id: 2, name: "Docs", icon: Camera },
  { id: 3, name: "Payment", icon: Check },
  { id: 4, name: "Confirm", icon: Check }
];

const PRICING = { STUDIO: { single: 999, double: 1799 }, PREMIUM: { single: 1999, double: 2999 } };

function NewBookingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedRoom = searchParams.get("room");
  const [step, setStep] = useState(1);
  const [guestSearch, setGuestSearch] = useState("");
  const [guestResults, setGuestResults] = useState<Guest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentLinkSent, setPaymentLinkSent] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<BookingForm>({
    guestName: "", guestPhone: "", guestEmail: "",
    roomId: preselectedRoom ?? "", checkIn: new Date().toISOString().split("T")[0], checkOut: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    guestsCount: 1, bookingType: "DAILY",
    paymentMethod: "CASH", paymentAmount: 0,
    docType: "AADHAAR"
  });

  const searchGuests = useCallback(async (query: string) => {
    if (query.length < 2) { setGuestResults([]); return; }
    try { const res = await fetch(`/api/guests/search?q=${encodeURIComponent(query)}`); if (res.ok) { const data = await res.json(); setGuestResults(data.guests ?? []); } } catch { }
  }, []);

  const handleFileChange = (side: "front" | "back", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setForm((f) => ({ ...f, [side === "front" ? "frontId" : "backId"]: url }));
  };

  useEffect(() => { const timer = setTimeout(() => { if (guestSearch) searchGuests(guestSearch); }, 300); return () => clearTimeout(timer); }, [guestSearch, searchGuests]);

  useEffect(() => {
    async function fetchRooms() {
      setLoadingRooms(true);
      try {
        const res = await fetch("/api/rooms/board");
        if (res.ok) {
          const data = await res.json();
          setRooms(data.rooms.filter((r: Room) => r.status === "VACANT"));
        }
      } finally { setLoadingRooms(false); }
    }
    fetchRooms();
  }, []);

  const handleSelectGuest = (guest: Guest) => {
    setForm((f) => ({ ...f, guestId: guest.id, guestName: guest.name, guestPhone: guest.phone, guestEmail: guest.email ?? "" }));
    setGuestSearch(""); setGuestResults([]);
  };

  const pricing = (() => {
    const room = rooms.find((r) => r.id === form.roomId);
    if (!room) return { basePrice: 0, nights: 0, total: 0 };
    const nights = Math.ceil((new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()) / 86400000);
    const pricePerNight = form.guestsCount === 1 ? Number(room.basePriceSingle) : Number(room.basePriceDouble);
    return { basePrice: pricePerNight, nights: nights > 0 ? nights : 1, total: pricePerNight * (nights > 0 ? nights : 1) };
  })();

  const generatePaymentLink = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      // Create guest if needed
      let guestId = form.guestId;
      if (!guestId && form.guestName) {
        const guestRes = await fetch("/api/guests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.guestName, phone: form.guestPhone, email: form.guestEmail || undefined })
        });
        if (!guestRes.ok) throw new Error("Failed to create guest");
        const guestData = await guestRes.json();
        guestId = guestData.id;
      }

      // Create booking first to get bookingId
      const bookingRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId,
          roomId: form.roomId,
          checkIn: form.checkIn,
          checkOut: form.checkOut,
          guestsCount: form.guestsCount,
          bookingType: form.bookingType,
          bookingSource: "WALK_IN",
          baseAmount: pricing.basePrice,
          totalAmount: pricing.total
        })
      });
      if (!bookingRes.ok) throw new Error("Failed to create booking");
      const bookingData = await bookingRes.json();
      setBookingId(bookingData.id);

      // Generate real payment link via Razorpay
      const linkRes = await fetch(`/api/payments/${bookingData.id}/payment-link`, { method: "POST" });
      if (!linkRes.ok) throw new Error("Failed to generate payment link");
      const linkData = await linkRes.json();

      // Copy payment link to clipboard
      if (linkData.shortUrl) {
        await navigator.clipboard.writeText(linkData.shortUrl);
        alert(`Payment link generated and copied to clipboard!\nAmount: ₹${linkData.amount}\n\nShare this link with the guest via WhatsApp or email.`);
      } else {
        alert("Payment link generated successfully!");
      }

      setPaymentLinkSent(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error generating payment link");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      // If booking already exists (from payment link generation), skip creation
      if (bookingId) {
        // Create Payment if collected and not already paid via link
        if (form.paymentAmount > 0 && form.paymentMethod === "CASH") {
          await fetch("/api/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId, amount: form.paymentAmount, method: form.paymentMethod }) });
        }
        setStep(4);
        return;
      }

      let guestId = form.guestId;
      if (!guestId && form.guestName) {
        const guestRes = await fetch("/api/guests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.guestName, phone: form.guestPhone, email: form.guestEmail || undefined }) });
        if (!guestRes.ok) throw new Error("Failed to create guest");
        const guestData = await guestRes.json(); guestId = guestData.id;
      }

      // Create Booking
      const bookingRes = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ guestId, roomId: form.roomId, checkIn: form.checkIn, checkOut: form.checkOut, guestsCount: form.guestsCount, bookingType: form.bookingType, bookingSource: "WALK_IN", baseAmount: pricing.basePrice, totalAmount: pricing.total }) });
      if (!bookingRes.ok) throw new Error("Failed to create booking");
      const bookingData = await bookingRes.json();
      setBookingId(bookingData.id);

      // Create Payment if collected
      if (form.paymentAmount > 0) {
        await fetch("/api/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId: bookingData.id, amount: form.paymentAmount, method: form.paymentMethod }) });
      }

      // Step 4 Confirmation
      setStep(4);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error submitting booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  const printReceipt = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 print:m-0 print:p-0 print:max-w-none">
      <div className="print:hidden">
        <h2 className="text-2xl font-bold text-gray-900">Walk-In Booking</h2>
        <p className="text-gray-500">Create a new booking on the spot</p>
      </div>

      <div className="flex items-center justify-between print:hidden">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <button onClick={() => step > s.id && setStep(s.id)} disabled={step < s.id} className={cn("flex items-center gap-3 rounded-full px-4 py-2 transition-all", step === s.id ? "bg-[#E17055] text-white" : step > s.id ? "bg-green-100 text-green-700 cursor-pointer" : "bg-gray-100 text-gray-400 cursor-not-allowed")}>
              <s.icon className="h-5 w-5" /><span className="hidden sm:inline font-medium">{s.name}</span>
            </button>
            {i < STEPS.length - 1 && <div className={cn("h-0.5 w-8 sm:w-16 mx-2", step > s.id ? "bg-green-400" : "bg-gray-200")} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-6 print:hidden">
          <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Guest Information</h3>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Search Existing Guest</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input type="text" value={guestSearch} onChange={(e) => setGuestSearch(e.target.value)} placeholder="Search..." className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055]" />
              </div>
            </div>
            {guestResults.length > 0 && <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-60 overflow-y-auto">{guestResults.map((guest) => <button key={guest.id} onClick={() => handleSelectGuest(guest)} className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 text-left"><div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center"><User className="h-5 w-5 text-gray-500" /></div><div className="flex-1"><p className="font-medium text-gray-900">{guest.name}</p><p className="text-sm text-gray-500">{guest.phone}</p></div></button>)}</div>}

            <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div><div className="relative flex justify-center"><span className="bg-white px-4 text-sm text-gray-500">or enter details</span></div></div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Guest Name *</label><input type="text" value={form.guestName} onChange={(e) => setForm((f) => ({ ...f, guestName: e.target.value }))} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055]" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label><input type="tel" value={form.guestPhone} onChange={(e) => setForm((f) => ({ ...f, guestPhone: e.target.value }))} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055]" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={form.guestEmail} onChange={(e) => setForm((f) => ({ ...f, guestEmail: e.target.value }))} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055]" /></div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Stay & Room</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Check-in</label><input type="date" value={form.checkIn} onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))} className="w-full px-4 py-3 rounded-lg border border-gray-300" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Check-out</label><input type="date" value={form.checkOut} onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))} className="w-full px-4 py-3 rounded-lg border border-gray-300" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Guests</label><select value={form.guestsCount} onChange={(e) => setForm((f) => ({ ...f, guestsCount: parseInt(e.target.value) }))} className="w-full px-4 py-3 rounded-lg border border-gray-300"><option value={1}>1 Guest</option><option value={2}>2 Guests</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Type</label><select value={form.bookingType} onChange={(e) => setForm((f) => ({ ...f, bookingType: e.target.value as "DAILY" | "MONTHLY" }))} className="w-full px-4 py-3 rounded-lg border border-gray-300"><option value="DAILY">Daily</option><option value="MONTHLY">Monthly</option></select></div>
            </div>

            {loadingRooms ? <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#E17055]" /></div> : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {rooms.map((room) => {
                  const price = form.guestsCount === 1 ? Number(room.basePriceSingle) : Number(room.basePriceDouble);
                  const isSelected = form.roomId === room.id;
                  return (
                    <button key={room.id} onClick={() => setForm((f) => ({ ...f, roomId: room.id }))} className={cn("rounded-xl border-2 p-4 text-left transition-all", isSelected ? "border-[#E17055] bg-[#E17055]/5 ring-2 ring-[#E17055]" : "border-gray-200 hover:border-gray-300")}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xl font-bold text-gray-900">{room.roomNumber}</span>
                        <span className="text-xs font-medium text-gray-500">{room.type}</span>
                      </div>
                      <p className="text-lg font-bold text-[#E17055]">{formatCurrency(price)}</p>
                      <p className="text-xs text-gray-500">per night</p>
                    </button>
                  );
                })}
              </div>
            )}

            <button onClick={() => setStep(2)} disabled={!form.guestName || !form.guestPhone || !form.roomId} className="w-full rounded-lg bg-[#E17055] py-3 text-sm font-medium text-white hover:bg-[#D35B3F] disabled:opacity-50 mt-4">
              Continue to Documents
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-6 print:hidden">
          <h3 className="text-lg font-semibold text-gray-900">Document Collection</h3>
          <div>
            <label className="block text-sm font-medium mb-2">Document Type</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {["AADHAAR", "PASSPORT", "VOTER_ID", "DRIVING_LICENSE"].map((type) => (
                <button key={type} onClick={() => setForm(f => ({ ...f, docType: type }))} className={cn("rounded-lg border-2 py-3 text-sm font-medium", form.docType === type ? "border-[#E17055] bg-[#E17055]/5 text-[#E17055]" : "border-gray-200 text-gray-600")}>
                  {type.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Front ID *</label>
              <input ref={frontInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileChange("front", e)} />
              <div
                onClick={() => frontInputRef.current?.click()}
                className={cn("relative rounded-lg border-2 border-dashed p-6 text-center cursor-pointer hover:border-[#E17055] transition-colors", form.frontId ? "border-green-400 bg-green-50" : "border-gray-300")}
              >
                {form.frontId ? (
                  <><img src={form.frontId} alt="Front" className="mx-auto max-h-40 rounded" /><button onClick={(e) => { e.stopPropagation(); setForm(f => ({ ...f, frontId: undefined })); }} className="mt-2 text-sm text-red-600">Remove</button></>
                ) : (
                  <><Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" /><p className="text-sm text-gray-600">Tap to capture or upload</p></>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Back ID *</label>
              <input ref={backInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileChange("back", e)} />
              <div
                onClick={() => backInputRef.current?.click()}
                className={cn("relative rounded-lg border-2 border-dashed p-6 text-center cursor-pointer hover:border-[#E17055] transition-colors", form.backId ? "border-green-400 bg-green-50" : "border-gray-300")}
              >
                {form.backId ? (
                  <><img src={form.backId} alt="Back" className="mx-auto max-h-40 rounded" /><button onClick={(e) => { e.stopPropagation(); setForm(f => ({ ...f, backId: undefined })); }} className="mt-2 text-sm text-red-600">Remove</button></>
                ) : (
                  <><Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" /><p className="text-sm text-gray-600">Tap to capture or upload</p></>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 rounded-lg border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">Back</button>
            <button onClick={() => { setForm((f) => ({ ...f, paymentAmount: pricing.total })); setStep(3); }} disabled={!form.frontId || !form.backId} className="flex-1 rounded-lg bg-[#E17055] py-3 text-sm font-medium text-white hover:bg-[#D35B3F] disabled:opacity-50">Continue to Payment</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-6 print:hidden">
          <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>
          <div className="rounded-lg bg-gray-50 p-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-600">{pricing.nights} night{pricing.nights > 1 ? "s" : ""} × {formatCurrency(pricing.basePrice)}</span><span className="text-gray-900">{formatCurrency(pricing.total)}</span></div>
            <div className="flex justify-between font-semibold text-lg border-t border-gray-200 pt-2"><span>Total</span><span className="text-[#E17055]">{formatCurrency(pricing.total)}</span></div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {["CASH", "UPI", "CARD"].map((method) => (
                <button key={method} onClick={() => setForm((f) => ({ ...f, paymentMethod: method }))} className={cn("rounded-lg border-2 py-3 text-sm font-medium transition-all", form.paymentMethod === method ? "border-[#E17055] bg-[#E17055]/5 text-[#E17055]" : "border-gray-200 text-gray-600 hover:border-gray-300")}>
                  {method}
                </button>
              ))}
            </div>
          </div>

          {(form.paymentMethod === "UPI" || form.paymentMethod === "CARD") && (
            <div className="flex flex-col items-center justify-center p-6 border border-blue-200 bg-blue-50 rounded-lg space-y-4">
              <p className="text-blue-800 text-sm font-medium">Send a payment link via WhatsApp</p>
              <button
                onClick={generatePaymentLink}
                disabled={isSubmitting || paymentLinkSent}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting && !paymentLinkSent ? <Loader2 className="w-5 h-5 animate-spin" /> : <LinkIcon className="w-5 h-5" />}
                {paymentLinkSent ? "Link Sent ✓" : "Generate & Send Payment Link"}
              </button>
            </div>
          )}

          {form.paymentMethod === "CASH" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cash Collected</label>
              <input type="number" value={form.paymentAmount} onChange={(e) => setForm((f) => ({ ...f, paymentAmount: parseInt(e.target.value) || 0 }))} className="w-full px-4 py-3 rounded-lg border border-gray-300 text-lg font-semibold" />
              {form.paymentAmount > pricing.total && (
                <p className="mt-2 text-sm text-green-700 font-medium">Change to return: {formatCurrency(form.paymentAmount - pricing.total)}</p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button onClick={() => setStep(2)} className="flex-1 rounded-lg border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">Back</button>
            <button onClick={handleSubmit} disabled={isSubmitting || (form.paymentMethod !== "CASH" && !paymentLinkSent)} className="flex-1 rounded-lg bg-[#E17055] py-3 text-sm font-medium text-white hover:bg-[#D35B3F] disabled:opacity-50 flex items-center justify-center gap-2">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null} Complete Booking
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center space-y-6 print:hidden">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">Booking Complete!</h3>
              <p className="text-gray-500 mt-2">{form.guestName} booked Room {rooms.find((r) => r.id === form.roomId)?.roomNumber}</p>
            </div>

            <div className="flex gap-3">
              <button onClick={printReceipt} className="flex-1 flex items-center justify-center gap-2 border border-gray-300 py-3 text-gray-700 hover:bg-gray-50 font-medium rounded-lg">
                <Printer className="w-5 h-5" /> Print Receipt
              </button>
              <Link href={bookingId ? `/bookings/${bookingId}` : "/rooms/board"} className="flex-1 flex justify-center bg-[#E17055] py-3 text-white hover:bg-[#D35B3F] font-medium rounded-lg items-center">
                View Booking
              </Link>
            </div>
          </div>

          {/* Thermal Receipt Print View */}
          <div className="hidden print:block w-[80mm] mx-auto text-black bg-white p-4 font-mono text-sm">
            <div className="text-center border-b-2 border-black pb-4 mb-4">
              <h2 className="text-xl font-bold uppercase">The Rooms</h2>
              <p>Walk-In Booking Receipt</p>
              <p className="mt-2 text-xs">Date: {new Date().toLocaleDateString()}</p>
            </div>

            <div className="space-y-2 mb-6 text-sm">
              <div className="flex justify-between"><span>Room:</span><span className="font-bold text-lg">{rooms.find((r) => r.id === form.roomId)?.roomNumber}</span></div>
              <div className="flex justify-between"><span>Guest:</span><span className="font-bold">{form.guestName}</span></div>
              <div className="flex justify-between"><span>Check-In:</span><span>{formatDate(form.checkIn, "short")}</span></div>
              <div className="flex justify-between"><span>Check-Out:</span><span>{formatDate(form.checkOut, "short")}</span></div>
            </div>

            <div className="border-t border-black pt-2 mb-4 space-y-1">
              <div className="flex justify-between"><span>Room Charge:</span><span>{formatCurrency(pricing.total)}</span></div>
              <div className="flex justify-between font-bold"><span>Total Paid:</span><span>{formatCurrency(form.paymentAmount)}</span></div>
              <div className="flex justify-between"><span>Payment Mode:</span><span>{form.paymentMethod}</span></div>
            </div>

            <div className="border-t-2 border-black pt-4 pb-12 text-center text-xs">
              <p>Thank you for choosing</p>
              <p>The Rooms!</p>
              <p>Wifi: TheRooms_Guest</p>
              <p>Pass: enjoyyourstay</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function NewBookingPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E17055] border-t-transparent" /></div>}>
      <NewBookingPageContent />
    </Suspense>
  );
}
