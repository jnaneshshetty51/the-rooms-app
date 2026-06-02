"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Utensils,
  Bath,
  Sunrise,
  Sunset,
  BedDouble,
  Wind,
  ConciergeBell,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from "@the-rooms/ui";
import { formatDate } from "@the-rooms/ui";

type Booking = {
  id: string;
  bookingNumber: string;
  checkIn: string;
  checkOut: string;
  status: string;
  room: { roomNumber: string; type: string };
};

const ADDON_OPTIONS = [
  { id: "laundry", label: "Laundry", icon: ShoppingBag, desc: "Pickup & wash service" },
  { id: "extra_towels", label: "Extra Towels", icon: Bath, desc: "Additional bath towels" },
  { id: "breakfast", label: "Breakfast", icon: Utensils, desc: "Morning breakfast service" },
  { id: "late_checkout", label: "Late Checkout", icon: Sunset, desc: "Extended check-out till 3 PM" },
  { id: "early_checkin", label: "Early Check-in", icon: Sunrise, desc: "Early access from 10 AM" },
  { id: "extra_bed", label: "Extra Bed", icon: BedDouble, desc: "Additional bedding" },
  { id: "iron_board", label: "Wind & Board", icon: Wind, desc: "Pressing service" },
  { id: "room_service", label: "Room Service", icon: ConciergeBell, desc: "In-room dining" },
];

function AddonsPageContent() {
  const searchParams = useSearchParams();
  const preselectedBookingId = searchParams.get("bookingId");

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submittedRequests, setSubmittedRequests] = useState<string[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [bookingsRes, addonsRes] = await Promise.all([
          fetch("/api/bookings"),
          fetch("/api/addons"),
        ]);
        if (bookingsRes.ok) {
          const data = await bookingsRes.json();
          const active = (data.bookings ?? []).filter((b: Booking) =>
            ["CONFIRMED", "CHECKED_IN"].includes(b.status)
          );
          setBookings(active);

          if (preselectedBookingId) {
            const found = active.find((b: Booking) => b.id === preselectedBookingId);
            setSelectedBooking(found ?? null);
          }
        }
        if (addonsRes.ok) {
          const data = await addonsRes.json();
          setSubmittedRequests(
            (data.addons ?? []).map((a: any) => a.metadata?.addonType)
          );
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [preselectedBookingId]);

  function toggleAddon(addonId: string) {
    setSelectedAddons((prev) =>
      prev.includes(addonId)
        ? prev.filter((a) => a !== addonId)
        : [...prev, addonId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBooking || selectedAddons.length === 0) {
      setError("Please select at least one service");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Submit each addon individually
      for (const addonType of selectedAddons) {
        const res = await fetch("/api/addons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId: selectedBooking.id,
            addonType,
            notes,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? `Failed to request ${addonType}`);
        }
      }

      setSuccess(
        "Service requests submitted! Our team will arrange them for you shortly."
      );
      setSubmittedRequests((prev) => [...new Set([...prev, ...selectedAddons])]);
      setSelectedAddons([]);
      setNotes("");
    } catch (err: any) {
      setError(err.message ?? "Failed to submit requests");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#E17055] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2D3436]">Request Services</h1>
        <p className="text-sm text-[#636E72] mt-1">
          Laundry, extra amenities, breakfast & more
        </p>
      </div>

      {bookings.length === 0 ? (
        <Card className="border-dashed border-2 border-[#E5E5E5]">
          <CardContent className="py-12 text-center">
            <ConciergeBell className="w-12 h-12 text-[#B2BEC3] mx-auto mb-3" />
            <p className="text-[#636E72] font-medium">No active bookings</p>
            <p className="text-sm text-[#B2BEC3] mt-1">
              Services can only be requested for active stays
            </p>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Booking selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Select Booking</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                className="w-full px-4 py-3 rounded-lg border border-[#E5E5E5] bg-white text-[#2D3436] text-sm focus:outline-none focus:ring-2 focus:ring-[#E17055]"
                value={selectedBooking?.id ?? ""}
                onChange={(e) => {
                  const found = bookings.find((b) => b.id === e.target.value);
                  setSelectedBooking(found ?? null);
                }}
                required
              >
                <option value="">Choose a booking</option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bookingNumber} — Room {b.room.roomNumber} ·{" "}
                    {formatDate(b.checkIn)} to {formatDate(b.checkOut)}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>

          {/* Service grid */}
          <div>
            <h2 className="text-lg font-semibold text-[#2D3436] mb-3">
              Available Services
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ADDON_OPTIONS.map((addon) => {
                const isSelected = selectedAddons.includes(addon.id);
                const isSubmitted = submittedRequests.includes(addon.id);
                return (
                  <button
                    key={addon.id}
                    type="button"
                    onClick={() => !isSubmitted && toggleAddon(addon.id)}
                    disabled={isSubmitted}
                    className={`
                      relative rounded-xl border-2 p-4 text-left transition-all
                      ${isSelected
                        ? "border-[#E17055] bg-[#E17055]/5"
                        : isSubmitted
                        ? "border-[#E5E5E5] bg-[#F8F8F8] opacity-60 cursor-not-allowed"
                        : "border-[#E5E5E5] bg-white hover:border-[#E17055]/50 cursor-pointer"
                      }
                    `}
                  >
                    {isSubmitted && (
                      <Badge className="absolute top-2 right-2 bg-[#00B894] text-white text-[10px]">
                        Done
                      </Badge>
                    )}
                    <addon.icon
                      className={`w-6 h-6 mb-2 ${
                        isSelected ? "text-[#E17055]" : "text-[#636E72]"
                      }`}
                    />
                    <p
                      className={`text-sm font-semibold ${
                        isSelected ? "text-[#E17055]" : "text-[#2D3436]"
                      }`}
                    >
                      {addon.label}
                    </p>
                    <p className="text-xs text-[#636E72] mt-0.5">{addon.desc}</p>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#E17055] flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-[#2D3436] mb-1.5">
              Notes <span className="text-xs text-[#B2BEC3]">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specific instructions or preferences..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-[#E5E5E5] bg-white text-[#2D3436] text-sm focus:outline-none focus:ring-2 focus:ring-[#E17055] resize-none"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-[#00B894]/10 text-[#00A381] text-sm flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              {success}
            </div>
          )}

          <Button
            type="submit"
            disabled={
              submitting || !selectedBooking || selectedAddons.length === 0
            }
            className="w-full bg-[#E17055] hover:bg-[#D35B3F]"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
            ) : (
              <><Plus className="w-4 h-4 mr-2" /> Request {selectedAddons.length > 0 ? `(${selectedAddons.length})` : ""} Services</>
            )}
          </Button>
        </form>
      )}
    </div>
  );
}

export default function AddonsPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E17055] border-t-transparent" /></div>}>
      <AddonsPageContent />
    </Suspense>
  );
}
