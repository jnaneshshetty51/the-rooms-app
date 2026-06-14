"use client";

import { useEffect, useState, useCallback, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@the-rooms/ui";
import { Search, Loader2, User, Check, Camera, Printer, CheckCircle, Info, Tag, X, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency } from "@the-rooms/ui";

interface Guest { id: string; name: string; phone: string; email?: string; bookings: Array<{ id: string; checkIn: string; checkOut: string; status: string; room: { roomNumber: string; type: string } }> }
interface Room { id: string; roomNumber: string; type: "STUDIO" | "PREMIUM"; floor: number; status: string; basePriceSingle: number; basePriceDouble: number; monthlyPriceSingle?: number; monthlyPriceDouble?: number }
interface GuestDoc { docType: string; frontId?: string; backId?: string; }
interface DiscountValidation { valid: boolean; error?: string; discountAmount?: number; discount?: { code: string; name: string; type: string; value: number } }
interface BookingForm {
  guestId?: string; guestName: string; guestPhone: string; guestEmail: string;
  guestAddress: string; guestCity: string; guestState: string; guestPincode: string;
  roomId: string; checkIn: string; checkOut: string; guestsCount: number;
  bookingType: "DAILY" | "MONTHLY"; paymentMethod: string; paymentAmount: number;
  docs: GuestDoc[]; complimentaryReason?: string; discountCode: string;
}

// ─── Document Types ─────────────────────────────────────────────────────────
const DOC_TYPES: Record<string, { label: string; needsBack: boolean }> = {
  AADHAAR: { label: "Aadhaar Card", needsBack: true },
  PASSPORT: { label: "Passport", needsBack: false },
  VOTER_ID: { label: "Voter ID", needsBack: false },
  DRIVING_LICENSE: { label: "Driving License", needsBack: true },
};

// ─── Pricing Logic ───────────────────────────────────────────────────────────
const GST_RATE = 0.18;
const EXTRA_GUEST_RATE = 500; // fallback; production uses DB value
const MONTHLY_THRESHOLD = 28;

interface PricingBreakdown {
  nights: number;
  isMonthly: boolean;
  autoMonthly: boolean; // true when monthly triggered by nights >= 28
  baseRate: number;     // per-night or flat monthly rate
  roomCharge: number;   // baseRate × nights (or flat for monthly)
  extraGuestCharge: number;
  extraGuests: number;
  subtotal: number;
  cgst: number;
  sgst: number;
  total: number;
  rateLabel: string;
}

function calcPricing(room: Room | undefined, form: BookingForm): PricingBreakdown {
  const zero: PricingBreakdown = {
    nights: 0, isMonthly: false, autoMonthly: false,
    baseRate: 0, roomCharge: 0, extraGuestCharge: 0, extraGuests: 0,
    subtotal: 0, cgst: 0, sgst: 0, total: 0, rateLabel: "",
  };
  if (!room || !form.checkIn || !form.checkOut) return zero;

  const nights = Math.max(1, Math.ceil(
    (new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()) / 86400000
  ));

  // Monthly applies when: user selects MONTHLY type OR STUDIO room with ≥ 28 nights
  const autoMonthly = form.bookingType === "DAILY" && room.type === "STUDIO" && nights >= MONTHLY_THRESHOLD;
  const isMonthly = form.bookingType === "MONTHLY" || autoMonthly;

  let baseRate: number;
  let rateLabel: string;

  if (isMonthly && room.type === "STUDIO") {
    baseRate = form.guestsCount === 1
      ? Number(room.monthlyPriceSingle ?? room.basePriceSingle)
      : Number(room.monthlyPriceDouble ?? room.basePriceDouble);
    rateLabel = form.guestsCount === 1 ? "Monthly (Single)" : "Monthly (Double)";
  } else {
    baseRate = form.guestsCount === 1
      ? Number(room.basePriceSingle)
      : Number(room.basePriceDouble);
    rateLabel = form.guestsCount === 1 ? `₹${baseRate}/night` : `₹${baseRate}/night (double)`;
  }

  const roomCharge = isMonthly ? baseRate : baseRate * nights;

  // Extra guest charge: only for DAILY, only guests > 2
  const extraGuests = Math.max(0, form.guestsCount - 2);
  const extraGuestCharge = (!isMonthly && extraGuests > 0)
    ? EXTRA_GUEST_RATE * extraGuests * nights
    : 0;

  // baseRate is GST-inclusive — back-calculate subtotal and tax
  const total = roomCharge + extraGuestCharge;
  const subtotal = total / (1 + GST_RATE);
  const cgst = subtotal * (GST_RATE / 2);
  const sgst = subtotal * (GST_RATE / 2);

  return {
    nights, isMonthly, autoMonthly, baseRate, roomCharge,
    extraGuestCharge, extraGuests, subtotal, cgst, sgst, total, rateLabel,
  };
}

const STEPS = [
  { id: 1, name: "Details", icon: User },
  { id: 2, name: "Docs", icon: Camera },
  { id: 3, name: "Payment", icon: Check },
  { id: 4, name: "Confirm", icon: Check },
];

// ─── Main Component ──────────────────────────────────────────────────────────
function NewBookingPageContent() {
  const searchParams = useSearchParams();
  const preselectedRoom = searchParams.get("room");
  const [step, setStep] = useState(1);
  const [guestSearch, setGuestSearch] = useState("");
  const [guestResults, setGuestResults] = useState<Guest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<{ idx: number; side: "front" | "back" } | null>(null);
  const [discountValidation, setDiscountValidation] = useState<DiscountValidation | null>(null);
  const [validatingDiscount, setValidatingDiscount] = useState(false);
  const frontInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const backInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const [form, setForm] = useState<BookingForm>({
    guestName: "", guestPhone: "", guestEmail: "",
    guestAddress: "", guestCity: "", guestState: "", guestPincode: "",
    roomId: preselectedRoom ?? "", checkIn: today, checkOut: tomorrow,
    guestsCount: 1, bookingType: "DAILY",
    paymentMethod: "CASH", paymentAmount: 0,
    docs: [{ docType: "AADHAAR" }],
    discountCode: "",
  });

  // Keep docs array in sync with guestsCount
  useEffect(() => {
    setForm((f) => {
      if (f.docs.length === f.guestsCount) return f;
      if (f.guestsCount > f.docs.length) {
        const extra = Array.from({ length: f.guestsCount - f.docs.length }, () => ({ docType: "AADHAAR" }));
        return { ...f, docs: [...f.docs, ...extra] };
      }
      return { ...f, docs: f.docs.slice(0, f.guestsCount) };
    });
  }, [form.guestsCount]);

  const searchGuests = useCallback(async (query: string) => {
    if (query.length < 2) { setGuestResults([]); return; }
    try {
      const res = await fetch(`/api/guests/search?q=${encodeURIComponent(query)}`);
      if (res.ok) { const data = await res.json(); setGuestResults(data.guests ?? []); }
    } catch { /* ignore */ }
  }, []);

  // ─── Discount Code Validation ──────────────────────────────────────────────
  const validateDiscount = useCallback(async (code: string, roomType?: string, subtotal?: number) => {
    if (!code.trim()) {
      setDiscountValidation(null);
      return;
    }
    if (!form.checkIn || !form.checkOut) return;

    setValidatingDiscount(true);
    try {
      const params = new URLSearchParams({
        code,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
      });
      if (roomType) params.set("roomType", roomType);
      if (subtotal !== undefined) params.set("subtotal", String(subtotal));
      const res = await fetch(`/api/discounts/validate?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDiscountValidation(data);
      } else {
        setDiscountValidation({ valid: false, error: "Failed to validate discount" });
      }
    } catch {
      setDiscountValidation({ valid: false, error: "Failed to validate discount" });
    } finally {
      setValidatingDiscount(false);
    }
  }, [form.checkIn, form.checkOut]);

  // Debounced discount validation
  useEffect(() => {
    const t = setTimeout(() => {
      if (form.discountCode) {
        const room = rooms.find((r) => r.id === form.roomId);
        const p = calcPricing(room, form);
        validateDiscount(form.discountCode, room?.type, p.subtotal);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [form.discountCode, form.roomId, form.checkIn, form.checkOut, validateDiscount, rooms, calcPricing]);

  useEffect(() => {
    const t = setTimeout(() => { if (guestSearch) searchGuests(guestSearch); }, 300);
    return () => clearTimeout(t);
  }, [guestSearch, searchGuests]);

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

  const updateDoc = (idx: number, patch: Partial<GuestDoc>) => {
    setForm((f) => ({ ...f, docs: f.docs.map((d, i) => i === idx ? { ...d, ...patch } : d) }));
  };

  // ─── File Upload to MinIO ─────────────────────────────────────────────────
  const handleFileUpload = async (guestIdx: number, side: "front" | "back", file: File) => {
    setUploadingIdx({ idx: guestIdx, side });
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (form.guestId) fd.append("guestId", form.guestId);
      const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? "Upload failed");
        return;
      }
      const { url } = await res.json();
      updateDoc(guestIdx, side === "front" ? { frontId: url } : { backId: url });
    } catch {
      alert("Upload failed. Check your connection.");
    } finally {
      setUploadingIdx(null);
    }
  };

  const selectedRoom = rooms.find((r) => r.id === form.roomId);
  const pricing = calcPricing(selectedRoom, form);
  const canProceedToDocs = !!form.guestName && !!form.guestPhone && !!form.roomId && !!form.checkIn && !!form.checkOut && pricing.nights > 0;
  const canProceedToPayment = form.docs.every((d) => !!d.frontId);
  const canSubmit = !isSubmitting && (form.paymentMethod !== "COMPLIMENTARY" || !!form.complimentaryReason);

  // ─── Booking Submission ───────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (bookingId) {
        if (form.paymentAmount > 0 && form.paymentMethod !== "COMPLIMENTARY") {
          await fetch("/api/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId, amount: form.paymentAmount, method: form.paymentMethod }) });
        }
        setStep(4); return;
      }

      let guestId = form.guestId;
      if (!guestId && form.guestName) {
        const guestRes = await fetch("/api/guests", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.guestName, phone: form.guestPhone, email: form.guestEmail || undefined, address: form.guestAddress || undefined, city: form.guestCity || undefined, state: form.guestState || undefined, pincode: form.guestPincode || undefined }),
        });
        if (!guestRes.ok) throw new Error("Failed to create guest");
        const gd = await guestRes.json(); guestId = gd.id;
      }

      const isComplimentary = form.paymentMethod === "COMPLIMENTARY";
      const effectiveBookingType = pricing.isMonthly ? "MONTHLY" : "DAILY";
      const discountAmount = discountValidation?.valid ? (discountValidation.discountAmount ?? 0) : 0;
      const finalTotal = Math.max(0, pricing.total - discountAmount);

      const bookingRes = await fetch("/api/bookings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId, roomId: form.roomId, checkIn: form.checkIn, checkOut: form.checkOut,
          guestsCount: form.guestsCount, bookingType: effectiveBookingType,
          bookingSource: isComplimentary ? "COMPLIMENTARY" : "WALK_IN",
          baseAmount: pricing.roomCharge,
          discountAmount: discountAmount,
          totalAmount: Math.round(finalTotal),
          discountCode: discountValidation?.valid ? form.discountCode : undefined,
          complimentaryReason: isComplimentary ? form.complimentaryReason : undefined,
          docs: form.docs,
        }),
      });
      if (!bookingRes.ok) throw new Error("Failed to create booking");
      const bookingData = await bookingRes.json();
      setBookingId(bookingData.id);

      if (form.paymentAmount > 0 && !isComplimentary) {
        await fetch("/api/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId: bookingData.id, amount: form.paymentAmount, method: form.paymentMethod }) });
      }

      // Walk-in guests are physically present — check in immediately
      const ciRes = await fetch(`/api/bookings/${bookingData.id}/check-in`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
      });
      setCheckedIn(ciRes.ok);
      setStep(4);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error submitting booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-6 print:m-0 print:p-0 print:max-w-none">
      <div className="print:hidden">
        <h2 className="text-2xl font-bold text-gray-900">Walk-In Booking</h2>
        <p className="text-gray-500">Create a new booking on the spot</p>
      </div>

      {/* Step Indicator */}
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

      {/* ── Step 1: Guest + Stay Details ─────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-6 print:hidden">
          <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Guest Information</h3>

            {/* Guest Search */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Search Existing Guest</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input type="text" value={guestSearch} onChange={(e) => setGuestSearch(e.target.value)} placeholder="Name, phone, email..." className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055]" />
              </div>
            </div>
            {guestResults.length > 0 && (
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-60 overflow-y-auto">
                {guestResults.map((guest) => (
                  <button key={guest.id} onClick={() => handleSelectGuest(guest)} className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 text-left">
                    <div className="w-10 h-10 rounded-full bg-[#E17055]/10 flex items-center justify-center"><span className="font-bold text-[#E17055]">{guest.name.charAt(0)}</span></div>
                    <div><p className="font-medium text-gray-900">{guest.name}</p><p className="text-sm text-gray-500">{guest.phone}</p></div>
                  </button>
                ))}
              </div>
            )}

            {form.guestId && (
              <div className="flex items-center gap-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-green-800">{form.guestName}</p>
                  <p className="text-sm text-green-600">{form.guestPhone}</p>
                </div>
                <button onClick={() => setForm(f => ({ ...f, guestId: undefined, guestName: "", guestPhone: "", guestEmail: "" }))} className="text-sm text-green-600 hover:underline">Change</button>
              </div>
            )}

            <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div><div className="relative flex justify-center"><span className="bg-white px-4 text-sm text-gray-500">{form.guestId ? "or update details" : "or enter new guest"}</span></div></div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Guest Name *</label><input type="text" value={form.guestName} onChange={(e) => setForm((f) => ({ ...f, guestName: e.target.value }))} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055]" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label><input type="tel" value={form.guestPhone} onChange={(e) => setForm((f) => ({ ...f, guestPhone: e.target.value }))} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055]" /></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={form.guestEmail} onChange={(e) => setForm((f) => ({ ...f, guestEmail: e.target.value }))} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055]" /></div>
              <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Address</label><input type="text" placeholder="House / Flat / Street" value={form.guestAddress} onChange={(e) => setForm((f) => ({ ...f, guestAddress: e.target.value }))} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055]" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">City</label><input type="text" value={form.guestCity} onChange={(e) => setForm((f) => ({ ...f, guestCity: e.target.value }))} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055]" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">State</label><input type="text" value={form.guestState} onChange={(e) => setForm((f) => ({ ...f, guestState: e.target.value }))} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055]" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label><input type="text" inputMode="numeric" maxLength={6} value={form.guestPincode} onChange={(e) => setForm((f) => ({ ...f, guestPincode: e.target.value.replace(/\D/g, "") }))} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055]" /></div>
              </div>
            </div>
          </div>

          {/* Stay & Room */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Stay & Room</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Check-in</label><input type="date" value={form.checkIn} min={today} onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))} className="w-full px-4 py-3 rounded-lg border border-gray-300" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Check-out</label><input type="date" value={form.checkOut} min={form.checkIn || today} onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))} className="w-full px-4 py-3 rounded-lg border border-gray-300" /></div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Guests</label>
                <select value={form.guestsCount} onChange={(e) => setForm((f) => ({ ...f, guestsCount: parseInt(e.target.value) }))} className="w-full px-4 py-3 rounded-lg border border-gray-300">
                  <option value={1}>1 Guest</option>
                  <option value={2}>2 Guests</option>
                  <option value={3}>3 Guests</option>
                  <option value={4}>4 Guests</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <select value={form.bookingType} onChange={(e) => setForm((f) => ({ ...f, bookingType: e.target.value as "DAILY" | "MONTHLY" }))} className="w-full px-4 py-3 rounded-lg border border-gray-300">
                  <option value="DAILY">Daily</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>
            </div>

            {/* Auto-monthly notice */}
            {pricing.autoMonthly && (
              <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-800">
                  Monthly rate applied automatically — {pricing.nights} nights on a STUDIO room qualifies.
                </p>
              </div>
            )}

            {/* Room Grid */}
            {loadingRooms ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#E17055]" /></div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {rooms.map((room) => {
                  const isSelected = form.roomId === room.id;
                  const p = calcPricing(room, form);
                  return (
                    <button key={room.id} onClick={() => setForm((f) => ({ ...f, roomId: room.id }))}
                      className={cn("rounded-xl border-2 p-4 text-left transition-all", isSelected ? "border-[#E17055] bg-[#E17055]/5 ring-2 ring-[#E17055]" : "border-gray-200 hover:border-gray-300")}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xl font-bold text-gray-900">{room.roomNumber}</span>
                        <span className="text-xs font-medium text-gray-400">{room.type}</span>
                      </div>
                      <p className="text-base font-bold text-[#E17055]">{formatCurrency(p.baseRate)}</p>
                      <p className="text-xs text-gray-500">{p.isMonthly ? "/ month" : "/ night"}</p>
                    </button>
                  );
                })}
                {rooms.length === 0 && <p className="col-span-4 text-center text-gray-500 py-8">No vacant rooms available</p>}
              </div>
            )}

            {/* Discount Code Input */}
            <div className="rounded-lg border border-gray-200 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Discount Code</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={form.discountCode}
                    onChange={(e) => setForm((f) => ({ ...f, discountCode: e.target.value.toUpperCase() }))}
                    placeholder="Enter code (e.g., SUMMER20)"
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] font-mono"
                  />
                </div>
                {form.discountCode && (
                  <button
                    type="button"
                    onClick={() => { setForm((f) => ({ ...f, discountCode: "" })); setDiscountValidation(null); }}
                    className="px-3 py-3 rounded-lg border border-gray-300 hover:bg-gray-50"
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                )}
              </div>
              {validatingDiscount && (
                <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Validating...
                </p>
              )}
              {discountValidation && !discountValidation.valid && (
                <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                  <X className="h-3 w-3" /> {discountValidation.error}
                </p>
              )}
              {discountValidation && discountValidation.valid && (
                <div className="mt-2 p-3 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-sm text-green-700 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    {discountValidation.discount?.name} applied!
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    {discountValidation.discount?.type === "PERCENTAGE"
                      ? `${discountValidation.discount.value}% off`
                      : `₹${discountValidation.discount?.value} off`}
                    {" "}— Save {formatCurrency(discountValidation.discountAmount ?? 0)}
                  </p>
                </div>
              )}
            </div>

            {/* Pricing Preview */}
            {selectedRoom && pricing.nights > 0 && (
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-2">
                <p className="font-semibold text-gray-800 text-sm mb-2">Price Breakdown</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {pricing.isMonthly
                      ? pricing.rateLabel
                      : `${formatCurrency(pricing.baseRate)} × ${pricing.nights} night${pricing.nights !== 1 ? "s" : ""}`}
                  </span>
                  <span>{formatCurrency(pricing.roomCharge)}</span>
                </div>
                {pricing.extraGuestCharge > 0 && (
                  <div className="flex justify-between text-sm text-orange-700">
                    <span>Extra guest charge (₹{EXTRA_GUEST_RATE} × {pricing.extraGuests} guest{pricing.extraGuests > 1 ? "s" : ""} × {pricing.nights} nights)</span>
                    <span>+{formatCurrency(pricing.extraGuestCharge)}</span>
                  </div>
                )}
                {discountValidation?.valid && (discountValidation.discountAmount ?? 0) > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount ({discountValidation.discount?.code})</span>
                    <span>-{formatCurrency(discountValidation.discountAmount ?? 0)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-500 border-t border-gray-200 pt-2">
                  <span>Subtotal (excl. GST)</span>
                  <span>{formatCurrency(pricing.subtotal - (discountValidation?.valid ? (discountValidation.discountAmount ?? 0) : 0))}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>CGST 9%</span>
                  <span>{formatCurrency(pricing.cgst)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>SGST 9%</span>
                  <span>{formatCurrency(pricing.sgst)}</span>
                </div>
                <div className="flex justify-between font-bold text-[#E17055] text-base border-t border-gray-200 pt-2">
                  <span>Total (incl. GST)</span>
                  <span>{formatCurrency(pricing.total - (discountValidation?.valid ? (discountValidation.discountAmount ?? 0) : 0))}</span>
                </div>
              </div>
            )}

            <button onClick={() => setStep(2)} disabled={!canProceedToDocs}
              className="w-full rounded-lg bg-[#E17055] py-3 text-sm font-medium text-white hover:bg-[#D35B3F] disabled:opacity-50">
              Continue to Documents
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Document Capture (one section per guest) ─────────────── */}
      {step === 2 && (
        <div className="space-y-6 print:hidden">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">Document Capture</h3>
            <p className="text-sm text-gray-500 mt-1">
              {form.guestsCount === 1 ? "Upload ID proof for the guest." : `Upload ID proof for each of the ${form.guestsCount} guests.`}
            </p>
          </div>

          {form.docs.map((doc, idx) => {
            const needsBack = DOC_TYPES[doc.docType]?.needsBack ?? false;
            const isUploadingFront = uploadingIdx?.idx === idx && uploadingIdx.side === "front";
            const isUploadingBack = uploadingIdx?.idx === idx && uploadingIdx.side === "back";
            const guestLabel = form.guestsCount === 1 ? "Guest" : `Guest ${idx + 1}`;
            return (
              <div key={idx} className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
                <h4 className="font-semibold text-gray-900">{guestLabel}</h4>

                <div>
                  <label className="block text-sm font-medium mb-2">Document Type</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(DOC_TYPES).map(([val, { label }]) => (
                      <button key={val} onClick={() => updateDoc(idx, { docType: val, backId: undefined })}
                        className={cn("rounded-lg border-2 py-3 text-sm font-medium", doc.docType === val ? "border-[#E17055] bg-[#E17055]/5 text-[#E17055]" : "border-gray-200 text-gray-600")}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Front Side *</label>
                    <input ref={(el) => { frontInputRefs.current[idx] = el; }} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(idx, "front", f); }} />
                    <div onClick={() => !isUploadingFront && frontInputRefs.current[idx]?.click()}
                      className={cn("rounded-lg border-2 border-dashed p-4 text-center cursor-pointer hover:border-[#E17055] transition-colors min-h-[140px] flex flex-col items-center justify-center gap-2",
                        doc.frontId ? "border-green-400 bg-green-50" : "border-gray-300 bg-gray-50")}>
                      {isUploadingFront ? <><Loader2 className="h-8 w-8 animate-spin text-[#E17055]" /><p className="text-sm text-gray-500">Uploading...</p></>
                        : doc.frontId ? <><img src={doc.frontId} alt="Front" className="max-h-28 rounded object-contain" /><button onClick={(e) => { e.stopPropagation(); updateDoc(idx, { frontId: undefined }); }} className="text-xs text-red-600 hover:underline">Remove</button></>
                          : <><Camera className="h-10 w-10 text-gray-400" /><p className="text-sm text-gray-600">Tap to capture or upload</p><p className="text-xs text-gray-400">JPEG, PNG, PDF · max 5MB</p></>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Back Side {!needsBack && <span className="text-xs font-normal text-gray-400">(optional for {DOC_TYPES[doc.docType]?.label})</span>}
                    </label>
                    <input ref={(el) => { backInputRefs.current[idx] = el; }} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(idx, "back", f); }} />
                    <div onClick={() => !isUploadingBack && backInputRefs.current[idx]?.click()}
                      className={cn("rounded-lg border-2 border-dashed p-4 text-center cursor-pointer hover:border-[#E17055] transition-colors min-h-[140px] flex flex-col items-center justify-center gap-2",
                        doc.backId ? "border-green-400 bg-green-50" : "border-gray-300 bg-gray-50")}>
                      {isUploadingBack ? <><Loader2 className="h-8 w-8 animate-spin text-[#E17055]" /><p className="text-sm text-gray-500">Uploading...</p></>
                        : doc.backId ? <><img src={doc.backId} alt="Back" className="max-h-28 rounded object-contain" /><button onClick={(e) => { e.stopPropagation(); updateDoc(idx, { backId: undefined }); }} className="text-xs text-red-600 hover:underline">Remove</button></>
                          : <><Camera className="h-10 w-10 text-gray-400" /><p className="text-sm text-gray-600">Tap to capture or upload</p><p className="text-xs text-gray-400">JPEG, PNG, PDF · max 5MB</p></>}
                    </div>
                  </div>
                </div>

                {!doc.frontId && (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                    Front side required for {guestLabel.toLowerCase()}.
                  </p>
                )}
              </div>
            );
          })}

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 rounded-lg border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">Back</button>
            <button onClick={() => {
              const discountAmt = discountValidation?.valid ? (discountValidation.discountAmount ?? 0) : 0;
              const finalTotal = Math.max(0, pricing.total - discountAmt);
              setForm((f) => ({ ...f, paymentAmount: Math.round(finalTotal) }));
              setStep(3);
            }}
              disabled={!canProceedToPayment || uploadingIdx !== null}
              className="flex-1 rounded-lg bg-[#E17055] py-3 text-sm font-medium text-white hover:bg-[#D35B3F] disabled:opacity-50">
              Continue to Payment
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Payment ───────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-6 print:hidden">
          <h3 className="text-lg font-semibold text-gray-900">Payment</h3>

          {/* Price Breakdown Summary */}
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-2">
            <p className="font-semibold text-gray-800 text-sm mb-2">Price Breakdown</p>
            <div className="flex justify-between text-sm text-gray-600">
              <span>
                {pricing.isMonthly
                  ? pricing.rateLabel
                  : `Room charge (${pricing.nights} night${pricing.nights !== 1 ? "s" : ""} × ${formatCurrency(pricing.baseRate)})`}
              </span>
              <span className="text-gray-900">{formatCurrency(pricing.roomCharge)}</span>
            </div>
            {pricing.extraGuestCharge > 0 && (
              <div className="flex justify-between text-sm text-orange-700">
                <span>Extra guest ({pricing.extraGuests} guest{pricing.extraGuests > 1 ? "s" : ""} × ₹{EXTRA_GUEST_RATE}/night × {pricing.nights} nights)</span>
                <span>+{formatCurrency(pricing.extraGuestCharge)}</span>
              </div>
            )}
            {discountValidation?.valid && (discountValidation.discountAmount ?? 0) > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount ({discountValidation.discount?.code})</span>
                <span>-{formatCurrency(discountValidation.discountAmount ?? 0)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-500 border-t pt-2">
              <span>Subtotal</span>
              <span>{formatCurrency(pricing.subtotal - (discountValidation?.valid ? (discountValidation.discountAmount ?? 0) : 0))}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>CGST 9%</span><span>{formatCurrency(pricing.cgst)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>SGST 9%</span><span>{formatCurrency(pricing.sgst)}</span>
            </div>
            <div className="flex justify-between font-bold text-[#E17055] text-lg border-t pt-2">
              <span>Total (incl. GST)</span>
              <span>{formatCurrency(pricing.total - (discountValidation?.valid ? (discountValidation.discountAmount ?? 0) : 0))}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {["CASH", "UPI", "CARD", "COMPLIMENTARY"].map((method) => (
                <button key={method} onClick={() => setForm((f) => ({ ...f, paymentMethod: method }))}
                  className={cn("rounded-lg border-2 py-3 text-sm font-medium transition-all", form.paymentMethod === method ? "border-[#E17055] bg-[#E17055]/5 text-[#E17055]" : "border-gray-200 text-gray-600 hover:border-gray-300")}>
                  {method === "COMPLIMENTARY" ? "Complimentary" : method}
                </button>
              ))}
            </div>
          </div>

          {form.paymentMethod !== "COMPLIMENTARY" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount Collected ({form.paymentMethod})
              </label>
              <input type="number" value={form.paymentAmount}
                onChange={(e) => setForm((f) => ({ ...f, paymentAmount: parseFloat(e.target.value) || 0 }))}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 text-lg font-semibold" />
              {form.paymentAmount > 0 && form.paymentAmount < pricing.total && (
                <p className="mt-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                  Partial payment — balance due: {formatCurrency(pricing.total - form.paymentAmount)}
                </p>
              )}
              {form.paymentAmount > pricing.total && (
                <p className="mt-2 text-sm text-green-700 font-medium">
                  Change to return: {formatCurrency(form.paymentAmount - pricing.total)}
                </p>
              )}
            </div>
          )}

          {form.paymentMethod === "COMPLIMENTARY" && (
            <div className="p-4 border border-purple-200 bg-purple-50 rounded-lg space-y-3">
              <p className="text-sm font-medium text-purple-800">Complimentary Stay — No payment required</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                <select required value={form.complimentaryReason || ""} onChange={(e) => setForm((f) => ({ ...f, complimentaryReason: e.target.value }))} className="w-full px-4 py-3 rounded-lg border border-gray-300">
                  <option value="">Select reason...</option>
                  <option value="STAFF">Staff</option>
                  <option value="RELATIVE">Relative</option>
                  <option value="BUSINESS_PARTNER">Business Partner</option>
                  <option value="VIP_GUEST">VIP Guest</option>
                  <option value="COMPENSATION">Compensation</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep(2)} className="flex-1 rounded-lg border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">Back</button>
            <button onClick={handleSubmit} disabled={!canSubmit}
              className="flex-1 rounded-lg bg-[#E17055] py-3 text-sm font-medium text-white hover:bg-[#D35B3F] disabled:opacity-50 flex items-center justify-center gap-2">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {isSubmitting ? "Processing..." : "Complete Booking"}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Confirmation ──────────────────────────────────────────── */}
      {step === 4 && (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center space-y-6 print:hidden">
            <div className={cn("w-20 h-20 rounded-full flex items-center justify-center mx-auto", checkedIn ? "bg-green-100" : "bg-yellow-100")}>
              <CheckCircle className={cn("h-10 w-10", checkedIn ? "text-green-600" : "text-yellow-600")} />
            </div>
            <div>
              <h3 className="text-2xl font-bold">{checkedIn ? "Checked In!" : "Booking Created"}</h3>
              <p className="text-gray-500 mt-2">{form.guestName} — Room {selectedRoom?.roomNumber}</p>
              {checkedIn
                ? <p className="mt-2 inline-block rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">Room is now OCCUPIED</p>
                : <p className="mt-2 text-sm text-yellow-700">Auto check-in failed — check in manually from the booking page.</p>
              }
            </div>
            {/* Summary */}
            <div className="rounded-lg bg-gray-50 p-4 text-left space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Check-in</span><span className="font-medium">{formatDate(form.checkIn, "long")}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Check-out</span><span className="font-medium">{formatDate(form.checkOut, "long")}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Nights</span><span className="font-medium">{pricing.nights}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Plan</span><span className="font-medium">{pricing.isMonthly ? "Monthly" : "Daily"}</span></div>
              <div className="flex justify-between border-t pt-1 mt-1"><span className="text-gray-500">Total (incl. GST)</span><span className="font-bold text-[#E17055]">{formatCurrency(pricing.total)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Collected</span><span className="font-medium">{formatCurrency(form.paymentAmount)} via {form.paymentMethod}</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 border border-gray-300 py-3 text-gray-700 hover:bg-gray-50 font-medium rounded-lg">
                <Printer className="w-5 h-5" /> Print Receipt
              </button>
              <Link href={bookingId ? `/bookings/${bookingId}` : "/rooms/board"} className="flex-1 flex justify-center bg-[#E17055] py-3 text-white hover:bg-[#D35B3F] font-medium rounded-lg items-center">
                View Booking
              </Link>
            </div>
          </div>

          {/* Thermal Receipt */}
          <div className="hidden print:block w-[80mm] mx-auto text-black bg-white p-4 font-mono text-sm">
            <div className="text-center border-b-2 border-black pb-4 mb-4">
              <h2 className="text-xl font-bold uppercase">The Rooms</h2>
              <p>{checkedIn ? "Check-In Receipt" : "Booking Receipt"}</p>
              <p className="text-xs mt-1">{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
            </div>
            <div className="space-y-1 mb-4">
              <div className="flex justify-between"><span>Room:</span><span className="font-bold">{selectedRoom?.roomNumber}</span></div>
              <div className="flex justify-between"><span>Guest:</span><span className="font-bold">{form.guestName}</span></div>
              <div className="flex justify-between"><span>Check-In:</span><span>{formatDate(form.checkIn, "short")}</span></div>
              <div className="flex justify-between"><span>Check-Out:</span><span>{formatDate(form.checkOut, "short")}</span></div>
              <div className="flex justify-between"><span>Nights:</span><span>{pricing.nights}</span></div>
              <div className="flex justify-between"><span>Guests:</span><span>{form.guestsCount}</span></div>
              <div className="flex justify-between"><span>Plan:</span><span>{pricing.isMonthly ? "Monthly" : "Daily"}</span></div>
            </div>
            <div className="border-t border-black pt-2 mb-4 space-y-1 text-xs">
              <div className="flex justify-between"><span>Room Charge:</span><span>{formatCurrency(pricing.roomCharge)}</span></div>
              {pricing.extraGuestCharge > 0 && <div className="flex justify-between"><span>Extra Guest:</span><span>{formatCurrency(pricing.extraGuestCharge)}</span></div>}
              <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(pricing.subtotal)}</span></div>
              <div className="flex justify-between"><span>CGST 9%:</span><span>{formatCurrency(pricing.cgst)}</span></div>
              <div className="flex justify-between"><span>SGST 9%:</span><span>{formatCurrency(pricing.sgst)}</span></div>
              <div className="flex justify-between font-bold text-base border-t border-black pt-1 mt-1"><span>Total:</span><span>{formatCurrency(pricing.total)}</span></div>
              <div className="flex justify-between"><span>Paid:</span><span>{formatCurrency(form.paymentAmount)}</span></div>
              <div className="flex justify-between"><span>Mode:</span><span>{form.paymentMethod}</span></div>
            </div>
            <div className="text-center text-xs border-t-2 border-black pt-4 pb-12">
              <p>Thank you for choosing The Rooms!</p>
              <p className="mt-1">WiFi: TheRooms_Guest | Pass: enjoyyourstay</p>
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
