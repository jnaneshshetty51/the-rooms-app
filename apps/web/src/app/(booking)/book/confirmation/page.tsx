"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Calendar, MapPin, Phone, Download, Loader2 } from "lucide-react";
import { useBookingStore } from "@/stores/bookingStore";

function BookingConfirmationContent() {
  const searchParams = useSearchParams();
  const urlBookingId = searchParams.get("booking_id");

  const {
    bookingNumber: storeBookingNumber,
    checkIn: storeCheckIn,
    checkOut: storeCheckOut,
    selectedRoomNumber: storeRoomNumber,
    selectedRoomPrice,
    guestDetails,
    reset,
  } = useBookingStore();

  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  // Use URL param booking_id (INDUSIND redirect) or fall back to store
  const bookingId = urlBookingId ?? null;

  // Fetch invoice URL once we have a booking ID
  useEffect(() => {
    if (!bookingId) return;
    setInvoiceLoading(true);
    fetch(`/api/bookings/${bookingId}/invoice`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.data?.pdfUrl) setInvoiceUrl(d.data.pdfUrl);
      })
      .finally(() => setInvoiceLoading(false));
  }, [bookingId]);

  // Dummy confirmation — real data would come from API using bookingId
  const bookingNumber = storeBookingNumber || "BKN-2026-0001";
  const checkIn = storeCheckIn;
  const checkOut = storeCheckOut;
  const selectedRoomNumber = storeRoomNumber;

  // Clear booking store when the user leaves this page so stale data
  // doesn't leak back into a new booking flow.
  useEffect(() => {
    return () => { reset(); };
  }, [reset]);

  const nights = checkIn && checkOut
    ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
    : 1;

  const totalAmount = (selectedRoomPrice || 0) * nights;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Success Header */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="bg-vacant/10 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-vacant text-white flex items-center justify-center">
            <Check className="w-8 h-8" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-primary mb-2">
            Booking Confirmed!
          </h1>
          <p className="text-muted text-sm">
            Your reservation has been received. A confirmation email has been sent to{" "}
            <strong>{guestDetails?.email}</strong>
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Booking Number */}
          <div className="bg-accent/30 rounded-xl p-4 text-center">
            <p className="text-xs text-muted uppercase tracking-wider mb-1">Booking Reference</p>
            <p className="font-heading text-2xl font-bold text-secondary tracking-wider">
              {bookingNumber || "BKN-2026-0001"}
            </p>
          </div>

          {/* Details */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-muted">Your Stay</p>
                <p className="font-semibold text-primary text-sm">
                  {checkIn} → {checkOut} ({nights} night{nights > 1 ? "s" : ""})
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-muted">Room</p>
                <p className="font-semibold text-primary text-sm">
                  Room {selectedRoomNumber}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-muted">Address</p>
                <p className="font-semibold text-primary text-sm">
                  The Rooms Hotel, 42 MG Road, Bangalore 560001
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-muted">Contact</p>
                <p className="font-semibold text-primary text-sm">+91 98765 43210</p>
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="border-t pt-4 flex justify-between items-center">
            <span className="text-muted text-sm">Amount Paid</span>
            <span className="font-heading text-2xl font-bold text-secondary">
              ₹{totalAmount.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-heading font-bold text-primary mb-3">Check-In Instructions</h3>
        <ol className="space-y-2 text-sm text-muted">
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-secondary/10 text-secondary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
            Present your booking reference at reception
          </li>
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-secondary/10 text-secondary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
            Carry a valid government-issued photo ID (Aadhaar, Passport, or Driving License)
          </li>
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-secondary/10 text-secondary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
            Standard check-in from 2:00 PM. Early check-in subject to availability.
          </li>
          <li className="flex gap-2">
            <span className="w-5 h-5 rounded-full bg-secondary/10 text-secondary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
            Pay ₹1,000 security deposit (refundable at check-out)
          </li>
        </ol>
      </div>

      {/* Actions */}
      <div className="grid sm:grid-cols-2 gap-3">
        {invoiceLoading ? (
          <div className="flex items-center justify-center gap-2 py-3 border border-primary/30 text-primary/50 rounded-xl">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading receipt…
          </div>
        ) : invoiceUrl ? (
          <a
            href={invoiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 border border-primary text-primary font-semibold rounded-xl hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Receipt
          </a>
        ) : (
          <p className="flex items-center justify-center gap-2 py-3 text-sm text-muted rounded-xl border border-dashed border-muted">
            Receipt will be emailed shortly
          </p>
        )}
        <Link
          href="/contact"
          className="flex items-center justify-center gap-2 py-3 bg-secondary text-white font-semibold rounded-xl hover:bg-secondary/90 transition-colors"
        >
          <Phone className="w-4 h-4" />
          Contact Us
        </Link>
      </div>

      <div className="text-center">
        <Link
          href="/home"
          onClick={reset}
          className="text-sm text-secondary hover:underline"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}

export default function BookingConfirmationPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-secondary" /></div>}>
      <BookingConfirmationContent />
    </Suspense>
  );
}
