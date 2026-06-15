"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@the-rooms/ui";
import { Loader2, Search, User, Calendar, CreditCard, Check, X, Clock, AlertCircle, Smartphone, Building2 } from "lucide-react";
import { formatDate, formatCurrency } from "@the-rooms/ui";
import Link from "next/link";

interface Room {
    id: string;
    roomNumber: string;
    type: "STUDIO" | "PREMIUM";
    floor: number;
    status: string;
    basePriceSingle: number;
    basePriceDouble: number;
    monthlyPriceSingle?: number;
    monthlyPriceDouble?: number;
}

interface Guest {
    id: string;
    name: string;
    phone: string;
    email?: string;
}

interface PricingBreakdown {
    nights: number;
    isMonthly: boolean;
    autoMonthly: boolean;
    baseRate: number;
    roomCharge: number;
    extraGuestCharge: number;
    extraGuests: number;
    subtotal: number;
    cgst: number;
    sgst: number;
    total: number;
    rateLabel: string;
}

const GST_RATE = 0.18;
const EXTRA_GUEST_RATE = 500;
const MONTHLY_THRESHOLD = 28;

function calcPricing(room: Room | undefined, checkIn: string, checkOut: string, guestsCount: number, bookingType: "DAILY" | "MONTHLY"): PricingBreakdown {
    const zero: PricingBreakdown = {
        nights: 0, isMonthly: false, autoMonthly: false,
        baseRate: 0, roomCharge: 0, extraGuestCharge: 0, extraGuests: 0,
        subtotal: 0, cgst: 0, sgst: 0, total: 0, rateLabel: "",
    };
    if (!room || !checkIn || !checkOut) return zero;

    const nights = Math.max(1, Math.ceil(
        (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
    ));

    const autoMonthly = bookingType === "DAILY" && room.type === "STUDIO" && nights >= MONTHLY_THRESHOLD;
    const isMonthly = bookingType === "MONTHLY" || autoMonthly;

    let baseRate: number;
    let rateLabel: string;

    if (isMonthly && room.type === "STUDIO") {
        baseRate = guestsCount === 1
            ? Number(room.monthlyPriceSingle ?? room.basePriceSingle)
            : Number(room.monthlyPriceDouble ?? room.basePriceDouble);
        rateLabel = guestsCount === 1 ? "Monthly (Single)" : "Monthly (Double)";
    } else {
        baseRate = guestsCount === 1
            ? Number(room.basePriceSingle)
            : Number(room.basePriceDouble);
        rateLabel = guestsCount === 1 ? `₹${baseRate}/night` : `₹${baseRate}/night (double)`;
    }

    const roomCharge = isMonthly ? baseRate : baseRate * nights;
    const extraGuests = Math.max(0, guestsCount - 2);
    const extraGuestCharge = (!isMonthly && extraGuests > 0)
        ? EXTRA_GUEST_RATE * extraGuests * nights
        : 0;

    const total = roomCharge + extraGuestCharge;
    const subtotal = total / (1 + GST_RATE);
    const cgst = subtotal * (GST_RATE / 2);
    const sgst = subtotal * (GST_RATE / 2);

    return {
        nights, isMonthly, autoMonthly, baseRate, roomCharge,
        extraGuestCharge, extraGuests, subtotal, cgst, sgst, total, rateLabel,
    };
}

type BookingSource = "WALK_IN" | "OTA" | "PHONE" | "WEBSITE";
type BookingStatus = "CONFIRMED" | "TENTATIVE" | "WAITLISTED";

interface ReservationForm {
    // Search & Availability
    checkIn: string;
    checkOut: string;
    guestsCount: number;
    roomType: "STUDIO" | "PREMIUM" | "ALL";
    // Guest Details
    guestId?: string;
    guestName: string;
    guestPhone: string;
    guestEmail: string;
    // Booking Details
    bookingSource: BookingSource;
    bookingStatus: BookingStatus;
    bookingType: "DAILY" | "MONTHLY";
    specialRequests: string;
    expectedArrival: string;
    // Room
    roomId: string;
    // Payment
    paymentMethod: "CASH" | "UPI" | "CARD" | "ONLINE";
    advancePayment: number;
}

export default function ReservationPage() {
    const [form, setForm] = useState<ReservationForm>({
        checkIn: new Date().toISOString().split("T")[0],
        checkOut: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        guestsCount: 1,
        roomType: "ALL",
        guestName: "",
        guestPhone: "",
        guestEmail: "",
        bookingSource: "WALK_IN",
        bookingStatus: "CONFIRMED",
        bookingType: "DAILY",
        specialRequests: "",
        expectedArrival: "",
        roomId: "",
        paymentMethod: "CASH",
        advancePayment: 0,
    });

    const [rooms, setRooms] = useState<Room[]>([]);
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [guestSearch, setGuestSearch] = useState("");
    const [guestResults, setGuestResults] = useState<Guest[]>([]);
    const [searchingGuest, setSearchingGuest] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bookingId, setBookingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const today = new Date().toISOString().split("T")[0];

    const selectedRoom = rooms.find(r => r.id === form.roomId);
    const pricing = calcPricing(selectedRoom, form.checkIn, form.checkOut, form.guestsCount, form.bookingType);

    // ─── Fetch Available Rooms ─────────────────────────────────────────────────
    const fetchRooms = useCallback(async () => {
        setLoadingRooms(true);
        try {
            const res = await fetch("/api/rooms/board");
            if (res.ok) {
                const data = await res.json();
                let filtered = data.rooms.filter((r: Room) => r.status === "VACANT");
                if (form.roomType !== "ALL") {
                    filtered = filtered.filter((r: Room) => r.type === form.roomType);
                }
                setRooms(filtered);
            }
        } finally {
            setLoadingRooms(false);
        }
    }, [form.roomType]);

    useEffect(() => {
        fetchRooms();
    }, [fetchRooms]);

    // ─── Guest Search ──────────────────────────────────────────────────────────
    useEffect(() => {
        const t = setTimeout(async () => {
            if (guestSearch.length < 2) { setGuestResults([]); return; }
            setSearchingGuest(true);
            try {
                const res = await fetch(`/api/guests/search?q=${encodeURIComponent(guestSearch)}`);
                if (res.ok) { const data = await res.json(); setGuestResults(data.guests ?? []); }
            } finally { setSearchingGuest(false); }
        }, 300);
        return () => clearTimeout(t);
    }, [guestSearch]);

    const handleSelectGuest = (guest: Guest) => {
        setForm(f => ({ ...f, guestId: guest.id, guestName: guest.name, guestPhone: guest.phone, guestEmail: guest.email ?? "" }));
        setGuestSearch("");
        setGuestResults([]);
    };

    // ─── Calculate Nights ──────────────────────────────────────────────────────
    const nights = pricing.nights;

    // ─── Submit Reservation ───────────────────────────────────────────────────
    const handleSubmit = async (action: "reserve" | "checkin") => {
        if (isSubmitting) return;
        if (!form.guestName || !form.guestPhone || !form.roomId) {
            setError("Please fill in guest details and select a room");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            let guestId = form.guestId;

            // Create guest if new
            if (!guestId) {
                const guestRes = await fetch("/api/guests", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: form.guestName,
                        phone: form.guestPhone,
                        email: form.guestEmail || undefined,
                    }),
                });
                if (!guestRes.ok) throw new Error("Failed to create guest");
                const gd = await guestRes.json();
                guestId = gd.id;
            }

            // Create booking
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
                    bookingSource: form.bookingSource,
                    status: action === "checkin" ? "CHECKED_IN" : form.bookingStatus,
                    baseAmount: pricing.roomCharge,
                    discountAmount: 0,
                    totalAmount: Math.round(pricing.total),
                    specialRequests: form.specialRequests || undefined,
                }),
            });

            if (!bookingRes.ok) throw new Error("Failed to create booking");
            const bookingData = await bookingRes.json();
            setBookingId(bookingData.id);

            // Process payment if advance payment collected
            if (form.advancePayment > 0) {
                await fetch("/api/payments", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        bookingId: bookingData.id,
                        amount: form.advancePayment,
                        method: form.paymentMethod,
                    }),
                });
            }

            // If check-in action, call check-in API
            if (action === "checkin") {
                await fetch(`/api/bookings/${bookingData.id}/check-in`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({}),
                });
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Error creating reservation");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── Render ────────────────────────────────────────────────────────────────
    if (bookingId) {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                        <Check className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-green-800">Reservation Complete!</h3>
                    <p className="text-green-700">Room {selectedRoom?.roomNumber} assigned to {form.guestName}</p>
                    <div className="flex gap-3 justify-center">
                        <Link href={`/bookings/${bookingId}`} className="px-6 py-3 bg-[#E17055] text-white rounded-lg font-medium hover:bg-[#D35B3F]">
                            View Booking
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Reservation</h2>
                <p className="text-gray-500">Create a new booking</p>
            </div>

            {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto"><X className="h-4 w-4" /></button>
                </div>
            )}

            {/* ── 3-Zone Layout ───────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* ── Zone A: Search & Availability Panel (Left) ────────────────── */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-[#E17055]" />
                            Stay Details
                        </h3>

                        {/* Date Inputs */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Check-in</label>
                                <input
                                    type="date"
                                    value={form.checkIn}
                                    min={today}
                                    onChange={(e) => setForm(f => ({ ...f, checkIn: e.target.value, roomId: "" }))}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Check-out</label>
                                <input
                                    type="date"
                                    value={form.checkOut}
                                    min={form.checkIn || today}
                                    onChange={(e) => setForm(f => ({ ...f, checkOut: e.target.value, roomId: "" }))}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055]"
                                />
                            </div>
                        </div>

                        {/* Nights Display */}
                        {nights > 0 && (
                            <div className="flex items-center justify-center rounded-lg bg-[#E17055]/10 px-4 py-2">
                                <span className="text-sm font-medium text-[#E17055]">
                                    {nights} night{nights !== 1 ? "s" : ""} · {form.bookingType === "MONTHLY" ? "Monthly" : "Daily"} rate
                                </span>
                            </div>
                        )}

                        {/* Guests & Room Type */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Guests</label>
                                <select
                                    value={form.guestsCount}
                                    onChange={(e) => setForm(f => ({ ...f, guestsCount: parseInt(e.target.value), roomId: "" }))}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300"
                                >
                                    {[1, 2, 3, 4].map(n => (
                                        <option key={n} value={n}>{n} Guest{n > 1 ? "s" : ""}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
                                <select
                                    value={form.roomType}
                                    onChange={(e) => setForm(f => ({ ...f, roomType: e.target.value as any, roomId: "" }))}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300"
                                >
                                    <option value="ALL">All Types</option>
                                    <option value="STUDIO">Studio</option>
                                    <option value="PREMIUM">Premium</option>
                                </select>
                            </div>
                        </div>

                        {/* Plan Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setForm(f => ({ ...f, bookingType: "DAILY", roomId: "" }))}
                                    className={cn(
                                        "py-3 rounded-lg border-2 text-sm font-medium transition-all",
                                        form.bookingType === "DAILY"
                                            ? "border-[#E17055] bg-[#E17055]/5 text-[#E17055]"
                                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                                    )}
                                >
                                    Daily
                                </button>
                                <button
                                    onClick={() => setForm(f => ({ ...f, bookingType: "MONTHLY", roomId: "" }))}
                                    className={cn(
                                        "py-3 rounded-lg border-2 text-sm font-medium transition-all",
                                        form.bookingType === "MONTHLY"
                                            ? "border-[#E17055] bg-[#E17055]/5 text-[#E17055]"
                                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                                    )}
                                >
                                    Monthly
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Available Rooms */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">Available Rooms</h3>
                            <button onClick={fetchRooms} className="text-sm text-[#E17055] hover:underline">
                                Refresh
                            </button>
                        </div>

                        {loadingRooms ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-[#E17055]" />
                            </div>
                        ) : rooms.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <p>No rooms available for selected criteria</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {rooms.map((room) => {
                                    const isSelected = form.roomId === room.id;
                                    const p = calcPricing(room, form.checkIn, form.checkOut, form.guestsCount, form.bookingType);
                                    return (
                                        <button
                                            key={room.id}
                                            onClick={() => setForm(f => ({ ...f, roomId: room.id }))}
                                            className={cn(
                                                "w-full p-4 rounded-lg border-2 text-left transition-all",
                                                isSelected
                                                    ? "border-[#E17055] bg-[#E17055]/5 ring-2 ring-[#E17055]"
                                                    : "border-gray-200 hover:border-gray-300"
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xl font-bold text-gray-900">{room.roomNumber}</span>
                                                    <span className="text-xs font-medium text-gray-400">{room.type}</span>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-[#E17055]">{formatCurrency(p.baseRate)}</p>
                                                    <p className="text-xs text-gray-500">{p.isMonthly ? "/month" : "/night"}</p>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Zone B: Guest & Booking Details (Center) ──────────────────── */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <User className="h-5 w-5 text-[#E17055]" />
                            Guest Details
                        </h3>

                        {/* Guest Search */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Search Existing Guest</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={guestSearch}
                                    onChange={(e) => setGuestSearch(e.target.value)}
                                    placeholder="Name or phone..."
                                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055]"
                                />
                                {searchingGuest && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />}
                            </div>
                        </div>

                        {guestResults.length > 0 && (
                            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                                {guestResults.map((guest) => (
                                    <button
                                        key={guest.id}
                                        onClick={() => handleSelectGuest(guest)}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-[#E17055]/10 flex items-center justify-center">
                                            <span className="font-bold text-[#E17055] text-sm">{guest.name.charAt(0)}</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900 text-sm">{guest.name}</p>
                                            <p className="text-xs text-gray-500">{guest.phone}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {form.guestId && (
                            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
                                <Check className="h-4 w-4 text-green-600 shrink-0" />
                                <span className="text-sm text-green-700">{form.guestName} ({form.guestPhone})</span>
                                <button onClick={() => setForm(f => ({ ...f, guestId: undefined }))} className="ml-auto text-xs text-green-600 hover:underline">
                                    Change
                                </button>
                            </div>
                        )}

                        {/* Guest Form */}
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                <input
                                    type="text"
                                    value={form.guestName}
                                    onChange={(e) => setForm(f => ({ ...f, guestName: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                                <input
                                    type="tel"
                                    value={form.guestPhone}
                                    onChange={(e) => setForm(f => ({ ...f, guestPhone: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={form.guestEmail}
                                    onChange={(e) => setForm(f => ({ ...f, guestEmail: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Booking Details */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
                        <h3 className="font-semibold text-gray-900">Booking Details</h3>

                        {/* Source */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { val: "WALK_IN", label: "Walk-in", icon: Building2 },
                                    { val: "OTA", label: "OTA", icon: Smartphone },
                                ].map(({ val, label, icon: Icon }) => (
                                    <button
                                        key={val}
                                        onClick={() => setForm(f => ({ ...f, bookingSource: val as BookingSource }))}
                                        className={cn(
                                            "flex items-center gap-2 py-3 rounded-lg border-2 text-sm font-medium transition-all",
                                            form.bookingSource === val
                                                ? "border-[#E17055] bg-[#E17055]/5 text-[#E17055]"
                                                : "border-gray-200 text-gray-600 hover:border-gray-300"
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { val: "CONFIRMED", label: "Confirmed", color: "green" },
                                    { val: "TENTATIVE", label: "Tentative", color: "yellow" },
                                    { val: "WAITLISTED", label: "Waitlisted", color: "gray" },
                                ].map(({ val, label, color }) => (
                                    <button
                                        key={val}
                                        onClick={() => setForm(f => ({ ...f, bookingStatus: val as BookingStatus }))}
                                        className={cn(
                                            "py-2 rounded-lg border-2 text-xs font-medium transition-all",
                                            form.bookingStatus === val
                                                ? `border-${color}-500 bg-${color}-50 text-${color}-700 bg-${color}-100`
                                                : "border-gray-200 text-gray-600 hover:border-gray-300"
                                        )}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Expected Arrival */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Expected Arrival</label>
                            <input
                                type="time"
                                value={form.expectedArrival}
                                onChange={(e) => setForm(f => ({ ...f, expectedArrival: e.target.value }))}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055]"
                            />
                        </div>

                        {/* Special Requests */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Special Requests</label>
                            <textarea
                                value={form.specialRequests}
                                onChange={(e) => setForm(f => ({ ...f, specialRequests: e.target.value }))}
                                rows={2}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055]"
                            />
                        </div>
                    </div>
                </div>

                {/* ── Zone C: Pricing & Summary (Right - Sticky) ────────────────── */}
                <div className="lg:col-span-3">
                    <div className="sticky top-6 space-y-6">
                        {/* Pricing Summary */}
                        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-[#E17055]" />
                                Summary
                            </h3>

                            {selectedRoom ? (
                                <>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Room</span>
                                        <span className="font-bold">{selectedRoom.roomNumber}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Rate</span>
                                        <span>{pricing.rateLabel}</span>
                                    </div>
                                    {pricing.nights > 1 && !pricing.isMonthly && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600">{pricing.nights} nights</span>
                                            <span>{formatCurrency(pricing.roomCharge)}</span>
                                        </div>
                                    )}
                                    {pricing.extraGuestCharge > 0 && (
                                        <div className="flex items-center justify-between text-sm text-orange-700">
                                            <span>Extra guests</span>
                                            <span>+{formatCurrency(pricing.extraGuestCharge)}</span>
                                        </div>
                                    )}
                                    <div className="border-t border-gray-200 pt-3 space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500">Subtotal</span>
                                            <span>{formatCurrency(pricing.subtotal)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500">CGST 9%</span>
                                            <span>{formatCurrency(pricing.cgst)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500">SGST 9%</span>
                                            <span>{formatCurrency(pricing.sgst)}</span>
                                        </div>
                                        <div className="flex items-center justify-between font-bold text-[#E17055] text-lg border-t border-gray-200 pt-2">
                                            <span>Total</span>
                                            <span>{formatCurrency(pricing.total)}</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-4 text-gray-500 text-sm">
                                    Select a room to see pricing
                                </div>
                            )}
                        </div>

                        {/* Payment */}
                        {selectedRoom && (
                            <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
                                <h3 className="font-semibold text-gray-900">Payment</h3>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Method</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {["CASH", "UPI", "CARD", "ONLINE"].map((method) => (
                                            <button
                                                key={method}
                                                onClick={() => setForm(f => ({ ...f, paymentMethod: method as any }))}
                                                className={cn(
                                                    "py-2 rounded-lg border-2 text-sm font-medium transition-all",
                                                    form.paymentMethod === method
                                                        ? "border-[#E17055] bg-[#E17055]/5 text-[#E17055]"
                                                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                                                )}
                                            >
                                                {method}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Advance Payment</label>
                                    <input
                                        type="number"
                                        value={form.advancePayment}
                                        onChange={(e) => setForm(f => ({ ...f, advancePayment: parseFloat(e.target.value) || 0 }))}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 text-lg font-semibold"
                                    />
                                    {form.advancePayment > 0 && form.advancePayment < pricing.total && (
                                        <p className="mt-1 text-xs text-orange-600">
                                            Balance: {formatCurrency(pricing.total - form.advancePayment)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        {selectedRoom && (
                            <div className="space-y-3">
                                <button
                                    onClick={() => handleSubmit("reserve")}
                                    disabled={isSubmitting || !form.guestName || !form.guestPhone}
                                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#E17055] py-4 text-sm font-medium text-white hover:bg-[#D35B3F] disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                    Create Reservation
                                </button>
                                <button
                                    onClick={() => handleSubmit("checkin")}
                                    disabled={isSubmitting || !form.guestName || !form.guestPhone}
                                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-600 py-4 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                                    Create + Check-in
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
