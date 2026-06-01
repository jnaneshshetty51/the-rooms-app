"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@the-rooms/ui";
import { useBookingStore } from "@/stores/bookingStore";

const EXTRAS = [
  { id: "breakfast", label: "Breakfast", price: 250, per: "night", desc: "Continental breakfast buffet" },
  { id: "airport", label: "Airport Transfer", price: 1200, per: "trip", desc: "One-way pick-up or drop" },
  { id: "late_checkout", label: "Late Check-out", price: 500, per: "stay", desc: "Check-out by 3 PM" },
  { id: "early_checkin", label: "Early Check-in", price: 300, per: "stay", desc: "Check-in from 10 AM" },
];

export default function BookingDetailsPage() {
  const router = useRouter();
  const {
    selectedRoomId, selectedRoomNumber, selectedRoomPrice,
    checkIn, checkOut, guestsCount,
    extras, setExtras, guestDetails, setGuestDetails,
    discountCode, setDiscountCode, setStep
  } = useBookingStore();

  const [name, setName] = useState(guestDetails?.name || "");
  const [phone, setPhone] = useState(guestDetails?.phone || "");
  const [email, setEmail] = useState(guestDetails?.email || "");
  const [requests, setRequests] = useState(guestDetails?.specialRequests || "");
  const [selectedExtras, setSelectedExtras] = useState<string[]>(extras || []);
  const [code, setCode] = useState(discountCode || "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const nights = checkIn && checkOut
    ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
    : 1;

  const extrasTotal = selectedExtras.reduce((sum, id) => {
    const extra = EXTRAS.find((e) => e.id === id);
    if (!extra) return sum;
    if (id === "breakfast") return sum + extra.price * nights;
    if (id === "airport") return sum + extra.price;
    return sum + extra.price;
  }, 0);

  const baseTotal = selectedRoomPrice * nights;
  const total = baseTotal + extrasTotal;

  const toggleExtra = (id: string) => {
    setSelectedExtras((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!phone.trim() || !/^\d{10}$/.test(phone.replace(/\D/g, ""))) errs.phone = "Valid phone required";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Valid email required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleContinue = () => {
    if (!validate()) return;
    setExtras(selectedExtras);
    setGuestDetails({ name, phone, email, specialRequests: requests });
    setDiscountCode(code);
    setStep(4);
    router.push("/book/payment");
  };

  return (
    <div className="space-y-6">
      {/* Stay Summary */}
      <div className="bg-white rounded-xl border p-4 text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-muted">Room</span>
          <span className="font-semibold">Room {selectedRoomNumber} (₹{selectedRoomPrice.toLocaleString("en-IN")}/night)</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Check-in</span>
          <span>{checkIn}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Check-out</span>
          <span>{checkOut}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Duration</span>
          <span>{nights} night{nights > 1 ? "s" : ""}</span>
        </div>
        <div className="flex justify-between border-t pt-1">
          <span className="text-muted">Guests</span>
          <span>{guestsCount || 1}</span>
        </div>
      </div>

      {/* Extras */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-heading font-bold text-primary mb-4">Add Extras (Optional)</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {EXTRAS.map((extra) => {
            const isSelected = selectedExtras.includes(extra.id);
            return (
              <button
                key={extra.id}
                type="button"
                onClick={() => toggleExtra(extra.id)}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border text-left transition-all",
                  isSelected
                    ? "border-secondary bg-secondary/5 ring-1 ring-secondary"
                    : "border-accent hover:border-secondary/30"
                )}
              >
                <div className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                  isSelected ? "border-secondary bg-secondary" : "border-muted"
                )}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-primary text-sm">{extra.label}</div>
                  <div className="text-xs text-muted">{extra.desc}</div>
                </div>
                <div className="text-xs font-bold text-secondary">+₹{extra.price}/{extra.per}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Guest Details */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-heading font-bold text-primary mb-4">Guest Details</h3>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-primary">Full Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="As on government ID"
              className={cn(
                "w-full px-4 py-3 border rounded-xl text-sm outline-none",
                errors.name ? "border-destructive" : "focus:border-secondary"
              )}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-primary">Phone *</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 XXXXXXXXXX"
                className={cn(
                  "w-full px-4 py-3 border rounded-xl text-sm outline-none",
                  errors.phone ? "border-destructive" : "focus:border-secondary"
                )}
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-primary">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className={cn(
                  "w-full px-4 py-3 border rounded-xl text-sm outline-none",
                  errors.email ? "border-destructive" : "focus:border-secondary"
                )}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-primary">Special Requests</label>
            <textarea
              value={requests}
              onChange={(e) => setRequests(e.target.value)}
              placeholder="Any special requests? (e.g., high floor, quiet room, late check-in)"
              rows={3}
              className="w-full px-4 py-3 border rounded-xl text-sm outline-none focus:border-secondary resize-none"
            />
          </div>
        </div>
      </div>

      {/* Discount Code */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-heading font-bold text-primary mb-4">Discount Code</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter code (e.g. STUDENT15)"
            className="flex-1 px-4 py-3 border rounded-xl text-sm outline-none focus:border-secondary uppercase"
          />
          <button className="px-4 py-3 border border-primary text-primary text-sm font-semibold rounded-xl hover:bg-primary hover:text-primary-foreground transition-colors">
            Apply
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border p-6 space-y-2">
        <h3 className="font-heading font-bold text-primary mb-3">Price Summary</h3>
        <div className="flex justify-between text-sm">
          <span className="text-muted">Room ({nights} nights × ₹{selectedRoomPrice.toLocaleString("en-IN")})</span>
          <span>₹{baseTotal.toLocaleString("en-IN")}</span>
        </div>
        {extrasTotal > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted">Extras</span>
            <span>₹{extrasTotal.toLocaleString("en-IN")}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted">GST (18%)</span>
          <span>Included</span>
        </div>
        <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
          <span>Total</span>
          <span className="text-secondary">₹{total.toLocaleString("en-IN")}</span>
        </div>
      </div>

      <button
        onClick={handleContinue}
        className="w-full py-4 bg-secondary text-white font-bold rounded-xl hover:bg-secondary/90 transition-colors flex items-center justify-center gap-2"
      >
        Proceed to Payment
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}
