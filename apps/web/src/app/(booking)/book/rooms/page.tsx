"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Check, ArrowRight } from "lucide-react";
import { cn } from "@the-rooms/ui";
import { useBookingStore } from "@/stores/bookingStore";

interface RoomType {
  type: "STUDIO" | "PREMIUM";
  title: string;
  description: string;
  features: string[];
  availableCount: number;
  basePriceSingle: number;
  basePriceDouble: number;
  monthlyPriceSingle: number;
  monthlyPriceDouble: number;
  photos: string[];
}

function BookingRoomsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { checkIn, checkOut, guestsCount, roomType, selectRoom, setStep } = useBookingStore();
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);

  const checkInDate = searchParams.get("checkIn") || checkIn;
  const checkOutDate = searchParams.get("checkOut") || checkOut;
  const guests = Number(searchParams.get("guests") || guestsCount || 2);
  const filterType = searchParams.get("type") || roomType;

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!checkInDate || !checkOutDate) {
      setRoomTypes([]);
      setLoading(false);
      return;
    }
    async function fetchAvailability() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("checkIn", checkInDate!);
        params.set("checkOut", checkOutDate!);
        if (guests) params.set("guestsCount", String(guests));
        if (filterType && filterType !== "MONTHLY") params.set("type", filterType);

        const res = await fetch(`/api/availability?${params.toString()}`);
        const data = await res.json();

        if (res.ok && data.data) {
          setRoomTypes(data.data);
        } else {
          console.error("Failed to fetch rooms:", data.error);
          setRoomTypes([]);
        }
      } catch (err) {
        console.error("Error fetching availability:", err);
        setRoomTypes([]);
      } finally {
        setLoading(false);
      }
    }
    fetchAvailability();
  }, [checkInDate, checkOutDate, guests, filterType]);

  const handleSelect = (roomType: RoomType) => {
    setSelectedRoomType(roomType);
  };

  const handleContinue = () => {
    if (!selectedRoomType) return;
    // Store the room type info - we'll auto-assign a room at booking time
    // Use type as the "room number" for display purposes
    const price = guests > 1 ? selectedRoomType.basePriceDouble : selectedRoomType.basePriceSingle;
    selectRoom(selectedRoomType.type, selectedRoomType.title, price);
    setStep(3);
    router.push("/book/details");
  };

  const nights = checkInDate && checkOutDate
    ? Math.ceil((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / 86400000)
    : 1;

  return (
    <div>
      {/* Search summary */}
      <div className="bg-white rounded-xl border px-4 py-3 mb-6 flex flex-wrap gap-4 text-sm">
        <span><strong>Check-in:</strong> {checkInDate || "—"}</span>
        <span><strong>Check-out:</strong> {checkOutDate || "—"}</span>
        <span><strong>{nights} night{nights > 1 ? "s" : ""}</strong></span>
        <span><strong>{guests} guest{guests > 1 ? "s" : ""}</strong></span>
        {filterType && <span><strong>Type:</strong> {filterType}</span>}
      </div>

      {/* Room type list */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-muted">
            <svg className="w-8 h-8 animate-spin mx-auto mb-4 text-secondary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-lg">Finding available rooms...</p>
          </div>
        ) : !checkInDate || !checkOutDate ? (
          <div className="text-center py-12 text-muted">
            <p className="text-lg font-medium text-gray-700">Select your dates to see available rooms</p>
            <p className="text-sm mt-2">Go back to step 1 and choose check-in and check-out dates.</p>
          </div>
        ) : roomTypes.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <p className="text-lg">No rooms found for the selected criteria.</p>
            <p className="text-sm mt-2">Try adjusting your dates or room type.</p>
          </div>
        ) : (
          roomTypes.map((roomType) => {
            const price = guests > 1 ? roomType.basePriceDouble : roomType.basePriceSingle;
            const isSelected = selectedRoomType?.type === roomType.type;
            return (
              <div
                key={roomType.type}
                onClick={() => handleSelect(roomType)}
                className={cn(
                  "bg-white rounded-xl border overflow-hidden cursor-pointer transition-all",
                  isSelected
                    ? "ring-2 ring-secondary shadow-md"
                    : "hover:shadow-sm"
                )}
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Room image */}
                  <div className="relative h-48 sm:h-auto sm:w-64 flex-shrink-0">
                    <Image
                      src={roomType.photos[0] || "/room-placeholder.svg"}
                      alt={roomType.title}
                      fill
                      className="object-cover"
                    />
                    {isSelected && (
                      <div className="absolute top-3 right-3 bg-secondary text-white rounded-full p-1">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  {/* Room info */}
                  <div className="flex-1 p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{roomType.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{roomType.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-secondary">₹{price.toLocaleString("en-IN")}</p>
                        <p className="text-xs text-gray-500">per night</p>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {roomType.features.map((feature) => (
                        <span key={feature} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          <Check className="w-3 h-3" /> {feature}
                        </span>
                      ))}
                    </div>

                    {/* Availability */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <span className="text-sm text-gray-500">
                        {roomType.availableCount} room{roomType.availableCount > 1 ? "s" : ""} available
                      </span>
                      <span className="text-sm font-medium text-secondary">
                        {guests > 1 ? "Double Occupancy" : "Single Occupancy"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Continue button */}
      {selectedRoomType && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
          <div className="max-w-2xl mx-auto flex gap-4">
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{selectedRoomType.title}</p>
              <p className="text-sm text-gray-500">
                {nights} night{nights > 1 ? "s" : ""} × ₹{(guests > 1 ? selectedRoomType.basePriceDouble : selectedRoomType.basePriceSingle).toLocaleString("en-IN")}
              </p>
            </div>
            <button
              onClick={handleContinue}
              className="flex items-center gap-2 bg-secondary text-white px-6 py-3 rounded-xl font-medium hover:bg-secondary/90 transition-colors"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BookingRoomsPage() {
  return (
    <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
      <BookingRoomsPageContent />
    </Suspense>
  );
}
