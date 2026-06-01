"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarPlus, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
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

export default function ExtendStayPage() {
  const searchParams = useSearchParams();
  const preselectedBookingId = searchParams.get("bookingId");

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [newCheckOut, setNewCheckOut] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBookings() {
      try {
        const res = await fetch("/api/bookings");
        if (res.ok) {
          const data = await res.json();
          const activeBookings = (data.bookings ?? []).filter((b: Booking) =>
            ["CONFIRMED", "CHECKED_IN"].includes(b.status)
          );
          setBookings(activeBookings);

          if (preselectedBookingId) {
            const found = activeBookings.find(
              (b: Booking) => b.id === preselectedBookingId
            );
            setSelectedBooking(found ?? null);
          }
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBookings();
  }, [preselectedBookingId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBooking || !newCheckOut) {
      setError("Please select a booking and new check-out date");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/extend-stay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          newCheckOut,
          reason,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Request failed");
      }

      setSuccess(
        "Extension request submitted! Our front office team will review and confirm shortly."
      );
      setNewCheckOut("");
      setReason("");
    } catch (err: any) {
      setError(err.message ?? "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  }

  // Set min date to day after current check-out
  const minDate = selectedBooking
    ? new Date(
        new Date(selectedBooking.checkOut).getTime() + 24 * 60 * 60 * 1000
      )
        .toISOString()
        .split("T")[0]
    : "";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#E17055] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[#2D3436]">Extend Your Stay</h1>
        <p className="text-sm text-[#636E72] mt-1">
          Request to extend your check-out date
        </p>
      </div>

      {/* Info card */}
      <Card className="border-[#FDCB6E]/40 bg-[#FDCB6E]/5">
        <CardContent className="p-4 flex items-start gap-3">
          <CalendarPlus className="w-5 h-5 text-[#E17055] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[#2D3436]">How it works</p>
            <p className="text-xs text-[#636E72] mt-1">
              Submit your extension request and our front office team will review
              it. You&apos;ll be notified once approved. Additional charges may apply
              based on the new duration.
            </p>
          </div>
        </CardContent>
      </Card>

      {bookings.length === 0 ? (
        <Card className="border-dashed border-2 border-[#E5E5E5]">
          <CardContent className="py-12 text-center">
            <CalendarPlus className="w-12 h-12 text-[#B2BEC3] mx-auto mb-3" />
            <p className="text-[#636E72] font-medium">No active bookings</p>
            <p className="text-sm text-[#B2BEC3] mt-1">
              You can only extend stays for confirmed or checked-in bookings
            </p>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Booking selector */}
          <div>
            <label className="block text-sm font-medium text-[#2D3436] mb-1.5">
              Select Booking
            </label>
            <select
              className="w-full px-4 py-3 rounded-lg border border-[#E5E5E5] bg-white text-[#2D3436] text-sm focus:outline-none focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
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
                  {b.bookingNumber} — Room {b.room.roomNumber} ({b.status}) ·{" "}
                  Check-out {formatDate(b.checkOut)}
                </option>
              ))}
            </select>
          </div>

          {/* Current check-out */}
          {selectedBooking && (
            <Card className="border-[#E5E5E5]">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#B2BEC3]">Current Check-out</p>
                  <p className="font-semibold text-[#2D3436]">
                    {formatDate(selectedBooking.checkOut, "long")}
                  </p>
                </div>
                <Badge>{selectedBooking.room.roomNumber}</Badge>
              </CardContent>
            </Card>
          )}

          {/* New check-out date */}
          <div>
            <label className="block text-sm font-medium text-[#2D3436] mb-1.5">
              New Check-out Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={newCheckOut}
              min={minDate}
              onChange={(e) => setNewCheckOut(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-[#E5E5E5] bg-white text-[#2D3436] text-sm focus:outline-none focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
              required
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-[#2D3436] mb-1.5">
              Reason <span className="text-xs text-[#B2BEC3]">(optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Extra day for work, holiday extension..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-[#E5E5E5] bg-white text-[#2D3436] text-sm focus:outline-none focus:ring-2 focus:ring-[#E17055] focus:border-transparent resize-none"
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
            disabled={submitting || !selectedBooking || !newCheckOut}
            className="w-full bg-[#E17055] hover:bg-[#D35B3F]"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
            ) : (
              <><CalendarPlus className="w-4 h-4 mr-2" /> Request Extension</>
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
