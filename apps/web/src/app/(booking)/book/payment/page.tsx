"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Building2, Smartphone } from "lucide-react";
import { cn } from "@the-rooms/ui";
import { useBookingStore } from "@/stores/bookingStore";

const PAYMENT_METHODS = [
  { id: "upi", label: "UPI", icon: Smartphone, desc: "Pay via any UPI app (GPay, PhonePe, Paytm)" },
  { id: "card", label: "Credit/Debit Card", icon: CreditCard, desc: "Visa, Mastercard, RuPay accepted" },
  { id: "netbanking", label: "Net Banking", icon: Building2, desc: "All major Indian banks" },
];

export default function BookingPaymentPage() {
  const router = useRouter();
  const {
    selectedRoomNumber, selectedRoomPrice, selectedRoomId,
    checkIn, checkOut, guestsCount,
    extras, guestDetails, discountCode, setStep, setPaymentInfo
  } = useBookingStore();

  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [processing, setProcessing] = useState(false);

  const nights = checkIn && checkOut
    ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
    : 1;

  const total = selectedRoomPrice * nights;

  const handlePay = async () => {
    if (!guestDetails || !selectedRoomId) {
      alert("Missing booking information. Please start again.");
      router.push("/book");
      return;
    }

    setProcessing(true);
    try {
      // Create booking via API
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: selectedRoomId,
          checkIn,
          checkOut,
          guestsCount: guestsCount || 1,
          guestName: guestDetails.name,
          guestPhone: guestDetails.phone,
          guestEmail: guestDetails.email,
          specialRequests: guestDetails.specialRequests,
          extras,
          discountCode,
        }),
      });

      const data = await res.json();
      if (data.error) {
        alert(data.error);
        setProcessing(false);
        return;
      }

      // In a real flow, redirect to IDFC payment
      // For now, simulate payment success
      setPaymentInfo(data.paymentId || "pay_mock", data.bookingId || "bk_mock", data.bookingNumber || "BKN-000");
      setStep(5);
      router.push("/book/confirmation");
    } catch {
      alert("Something went wrong. Please try again.");
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Booking Summary */}
      <div className="bg-white rounded-xl border p-4 text-sm space-y-2">
        <div className="font-heading font-bold text-primary mb-2">Booking Summary</div>
        <div className="flex justify-between">
          <span className="text-muted">Room</span>
          <span className="font-semibold">Room {selectedRoomNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Check-in</span>
          <span>{checkIn || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Check-out</span>
          <span>{checkOut || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Guest</span>
          <span>{guestDetails?.name}</span>
        </div>
        <div className="flex justify-between border-t pt-2 font-bold text-lg">
          <span>Total Payable</span>
          <span className="text-secondary">₹{total.toLocaleString("en-IN")}</span>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-heading font-bold text-primary mb-4">Select Payment Method</h3>
        <div className="space-y-3">
          {PAYMENT_METHODS.map((method) => {
            const Icon = method.icon;
            return (
              <button
                key={method.id}
                onClick={() => setPaymentMethod(method.id)}
                className={cn(
                  "flex items-center gap-4 w-full p-4 rounded-xl border text-left transition-all",
                  paymentMethod === method.id
                    ? "border-secondary bg-secondary/5 ring-1 ring-secondary"
                    : "border-accent hover:border-secondary/30"
                )}
              >
                <Icon className={cn(
                  "w-6 h-6 shrink-0",
                  paymentMethod === method.id ? "text-secondary" : "text-muted"
                )} />
                <div>
                  <div className="font-semibold text-primary text-sm">{method.label}</div>
                  <div className="text-xs text-muted">{method.desc}</div>
                </div>
                <div className={cn(
                  "ml-auto w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center",
                  paymentMethod === method.id ? "border-secondary bg-secondary" : "border-muted"
                )}>
                  {paymentMethod === method.id && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Security note */}
      <div className="bg-accent/30 rounded-xl p-4 text-xs text-muted text-center">
        <strong>Secure Payment:</strong> Your payment is processed by IDFC Bank Payment Gateway. We never store your card details.
      </div>

      {/* Pay Button */}
      <button
        onClick={handlePay}
        disabled={processing}
        className="w-full py-4 bg-secondary text-white font-bold rounded-xl hover:bg-secondary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {processing ? (
          <>
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            Pay ₹{total.toLocaleString("en-IN")}
          </>
        )}
      </button>

      <p className="text-xs text-muted text-center">
        By completing this payment, you agree to our{" "}
        <a href="/terms" className="text-secondary underline">Terms & Conditions</a> and{" "}
        <a href="/cancellation" className="text-secondary underline">Cancellation Policy</a>.
      </p>
    </div>
  );
}
