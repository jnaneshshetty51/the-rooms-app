"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Users } from "lucide-react";
import { cn } from "@the-rooms/ui";
import { useBookingStore } from "@/stores/bookingStore";

const ROOM_TYPES = [
  {
    value: "STUDIO",
    label: "Studio Room",
    desc: "Perfect for solo or couple",
    price: "₹999 – ₹1,799",
    icon: "🛏️",
  },
  {
    value: "PREMIUM",
    label: "Premium Room",
    desc: "Spacious with city views",
    price: "₹1,999 – ₹2,999",
    icon: "🏙️",
  },
  {
    value: "MONTHLY",
    label: "Monthly Stay",
    desc: "28+ nights, Studio only",
    price: "₹29,999/month",
    icon: "📅",
  },
];

export default function BookingDatePage() {
  const router = useRouter();
  const { checkIn, checkOut, guestsCount, roomType, setDates, setRoomType, setGuestsCount, setStep } =
    useBookingStore();

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const [localCheckIn, setLocalCheckIn] = useState(checkIn || today);
  const [localCheckOut, setLocalCheckOut] = useState(checkOut || tomorrow);
  const [localGuests, setLocalGuests] = useState(guestsCount || 1);
  const [localRoomType, setLocalRoomType] = useState<string>(roomType || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localCheckIn || !localCheckOut) return;
    if (new Date(localCheckOut) <= new Date(localCheckIn)) {
      alert("Check-out must be after check-in");
      return;
    }
    setDates(localCheckIn, localCheckOut);
    setGuestsCount(localGuests);
    setRoomType((localRoomType as "STUDIO" | "PREMIUM" | "MONTHLY") || null);
    setStep(2);
    const params = new URLSearchParams({
      checkIn: localCheckIn,
      checkOut: localCheckOut,
      guests: String(localGuests),
    });
    if (localRoomType) params.set("type", localRoomType);
    router.push(`/book/rooms?${params.toString()}`);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border p-6 sm:p-8">
        <h2 className="font-heading text-xl font-bold text-primary mb-6">
          Step 1: Select Dates & Room Type
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dates */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-primary flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-secondary" />
                Check-in Date
              </label>
              <input
                type="date"
                value={localCheckIn}
                min={today}
                onChange={(e) => setLocalCheckIn(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-primary flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-secondary" />
                Check-out Date
              </label>
              <input
                type="date"
                value={localCheckOut}
                min={localCheckIn || today}
                onChange={(e) => setLocalCheckOut(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none"
                required
              />
            </div>
          </div>

          {/* Guests */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-primary flex items-center gap-1.5">
              <Users className="w-4 h-4 text-secondary" />
              Number of Guests
            </label>
            <div className="flex items-center gap-3">
              {[1, 2].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setLocalGuests(n)}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-sm font-semibold border transition-all",
                    localGuests === n
                      ? "border-secondary bg-secondary/5 text-secondary"
                      : "border-accent text-muted hover:border-secondary/30"
                  )}
                >
                  {n} Guest{n > 1 ? "s" : ""}
                </button>
              ))}
            </div>
          </div>

          {/* Room Type */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-primary">Room Type (Optional)</label>
            <div className="grid gap-3">
              {ROOM_TYPES.map((rt) => (
                <button
                  key={rt.value}
                  type="button"
                  onClick={() => setLocalRoomType(rt.value)}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border text-left transition-all",
                    localRoomType === rt.value
                      ? "border-secondary bg-secondary/5 ring-1 ring-secondary"
                      : "border-accent hover:border-secondary/30"
                  )}
                >
                  <span className="text-2xl">{rt.icon}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-primary text-sm">{rt.label}</div>
                    <div className="text-xs text-muted">{rt.desc}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-secondary">{rt.price}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-secondary text-white font-bold rounded-xl hover:bg-secondary/90 transition-colors"
          >
            Check Room Availability →
          </button>
        </form>
      </div>
    </div>
  );
}
