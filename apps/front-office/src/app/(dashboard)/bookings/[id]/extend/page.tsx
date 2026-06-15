"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@the-rooms/ui";
import {
  Loader2,
  ArrowLeft,
  Calendar,
  CheckCircle,
  AlertCircle,
  Bed,
  ArrowRight,
  Clock,
  RefreshCw,
} from "lucide-react";
import { formatDate, formatCurrency } from "@the-rooms/ui";

interface Booking {
  id: string;
  bookingNumber: string;
  status: string;
  checkIn: string;
  checkOut: string;
  totalAmount: string;
  baseAmount: string;
  guest: { name: string; phone: string };
  room: {
    roomNumber: string;
    type: string;
    basePriceSingle: number;
    basePriceDouble: number;
  };
}

interface ExtensionRequest {
  id: string;
  requestedNights: number;
  newCheckOut: string;
  reason?: string;
  notes?: string;
  extraChargeAmount: number;
  chargeDescription?: string;
  status: string;
  sameRoomAvailable: boolean;
  createdAt: string;
}

interface ExtensionHistory {
  id: string;
  requestedNights: number;
  newCheckOut: string;
  status: string;
  extraChargeAmount: number;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

export default function ExtendStayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [pendingRequest, setPendingRequest] = useState<ExtensionRequest | null>(null);
  const [extensionHistory, setExtensionHistory] = useState<ExtensionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestedNights, setRequestedNights] = useState(1);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [availability, setAvailability] = useState<{
    sameRoomAvailable: boolean;
    alternateRoomAvailable: boolean;
    estimatedCharge: number;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    setLoading(true);
    try {
      const [bookingRes, extendRes] = await Promise.all([
        fetch(`/api/bookings/${id}`),
        fetch(`/api/bookings/${id}/extend`),
      ]);

      if (!bookingRes.ok) throw new Error("Booking not found");
      const bookingData = await bookingRes.json();
      setBooking(bookingData);

      if (extendRes.ok) {
        const extendData = await extendRes.json();
        setPendingRequest(extendData.pendingRequest || null);
        setExtensionHistory(extendData.history || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const calculateCharges = () => {
    if (!booking) return { additionalAmount: 0, newTotal: 0, newCheckOutDate: null };

    const currentCheckOut = new Date(booking.checkOut);
    const newCheckOutDate = new Date(currentCheckOut);
    newCheckOutDate.setDate(newCheckOutDate.getDate() + requestedNights);

    const currentNights = Math.ceil(
      (currentCheckOut.getTime() - new Date(booking.checkIn).getTime()) / 86400000
    );
    const newNights = currentNights + requestedNights;
    const pricePerNight = Number(booking.room.basePriceDouble);
    const additionalAmount = requestedNights * pricePerNight;

    return {
      additionalAmount,
      newTotal: Number(booking.totalAmount) + additionalAmount,
      newCheckOutDate,
    };
  };

  const handleRequestExtension = async () => {
    if (!booking) return;

    const { newCheckOutDate } = calculateCharges();
    if (!newCheckOutDate) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/bookings/${id}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestedNights,
          newCheckOut: newCheckOutDate.toISOString(),
          reason: reason || undefined,
          notes: notes || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message || "Extension request submitted successfully");
        fetchData();
        setReason("");
        setNotes("");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to request extension");
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#E17055]" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 font-medium">{error || "Booking not found"}</p>
          <Link href={`/bookings/${id}`} className="mt-4 text-[#E17055] hover:underline">
            Back
          </Link>
        </div>
      </div>
    );
  }

  const canModify = booking.status === "CONFIRMED" || booking.status === "CHECKED_IN";
  const { additionalAmount, newTotal, newCheckOutDate } = calculateCharges();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/bookings/${id}`}
          className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Extend Stay</h2>
          <p className="text-gray-500">
            Booking #{booking.bookingNumber} • Room {booking.room.roomNumber}
          </p>
        </div>
      </div>

      {/* Booking Info */}
      <div className="rounded-xl border bg-white p-6">
        <h3 className="text-lg font-semibold mb-4">Current Booking</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Guest</p>
            <p className="font-medium text-gray-900">{booking.guest.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Room</p>
            <p className="font-medium text-gray-900">
              {booking.room.roomNumber} ({booking.room.type})
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Check-in</p>
            <p className="font-medium text-gray-900">{formatDate(booking.checkIn, "long")}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Current Check-out</p>
            <p className="font-medium text-gray-900">{formatDate(booking.checkOut, "long")}</p>
          </div>
          <div className="col-span-2">
            <p className="text-sm text-gray-500">Current Total</p>
            <p className="font-medium text-gray-900">{formatCurrency(Number(booking.totalAmount))}</p>
          </div>
        </div>
      </div>

      {/* Pending Request Alert */}
      {pendingRequest && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">Pending Extension Request</p>
              <p className="text-sm text-blue-700">
                {pendingRequest.requestedNights} night(s) requested until{" "}
                {formatDate(pendingRequest.newCheckOut, "long")}
              </p>
              {pendingRequest.extraChargeAmount > 0 && (
                <p className="text-sm text-blue-700">
                  Estimated charge: {formatCurrency(pendingRequest.extraChargeAmount)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Extension Form */}
      {canModify && !pendingRequest && (
        <div className="rounded-xl border bg-white p-6 space-y-6">
          <h3 className="text-lg font-semibold">Request Stay Extension</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Nights
              </label>
              <select
                value={requestedNights}
                onChange={(e) => setRequestedNights(parseInt(e.target.value))}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
              >
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>
                    {n} night{n > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Check-out Date
              </label>
              <div className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-700">
                {newCheckOutDate && formatDate(newCheckOutDate.toISOString(), "long")}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
              placeholder="e.g. Extended business trip, Holiday extension"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
              placeholder="Any additional notes..."
            />
          </div>

          {/* Room Availability Info */}
          <div className="rounded-lg bg-gray-50 p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Room Availability</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Bed className="h-4 w-4 text-green-600" />
                <span className="text-sm text-gray-600">Same room available for extension</span>
              </div>
              <p className="text-xs text-gray-500">
                If same room is not available, alternate room assignment may be required
              </p>
            </div>
          </div>

          {/* Charge Summary */}
          <div className="rounded-lg border border-gray-200 p-4 space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Additional Charges</h4>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Current Total</span>
              <span>{formatCurrency(Number(booking.totalAmount))}</span>
            </div>
            <div className="flex justify-between text-sm text-blue-600">
              <span>Additional ({requestedNights} night{requestedNights > 1 ? "s" : ""})</span>
              <span>+{formatCurrency(additionalAmount)}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg border-t pt-2">
              <span>New Total</span>
              <span className="text-[#E17055]">{formatCurrency(newTotal)}</span>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{error}</div>
          )}

          <button
            onClick={handleRequestExtension}
            disabled={submitting}
            className="w-full rounded-lg bg-[#E17055] py-3 text-sm font-medium text-white hover:bg-[#D35B3F] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Request Extension
          </button>
        </div>
      )}

      {/* Cannot Modify Warning */}
      {!canModify && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-orange-600" />
            <div>
              <p className="font-medium text-orange-900">Cannot Extend Stay</p>
              <p className="text-sm text-orange-700">
                Stay extensions can only be requested for confirmed or checked-in bookings.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Extension History */}
      {extensionHistory.length > 0 && (
        <div className="rounded-xl border bg-white p-6">
          <h3 className="text-lg font-semibold mb-4">Extension History</h3>
          <div className="space-y-3">
            {extensionHistory.map((history) => (
              <div
                key={history.id}
                className={cn(
                  "p-4 rounded-lg border",
                  history.status === "APPROVED"
                    ? "bg-green-50 border-green-200"
                    : history.status === "REJECTED"
                      ? "bg-red-50 border-red-200"
                      : "bg-gray-50 border-gray-200"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900">
                      {history.requestedNights} night(s)
                    </span>
                    <p className="text-sm text-gray-500">
                      Until {formatDate(history.newCheckOut, "long")}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        history.status === "APPROVED"
                          ? "bg-green-100 text-green-700"
                          : history.status === "REJECTED"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                      )}
                    >
                      {history.status}
                    </span>
                    {history.extraChargeAmount > 0 && (
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {formatCurrency(history.extraChargeAmount)}
                      </p>
                    )}
                  </div>
                </div>
                {history.rejectionReason && (
                  <p className="text-sm text-red-600 mt-2">Reason: {history.rejectionReason}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
