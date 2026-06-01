"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Check, ArrowRight } from "lucide-react";
import { cn } from "@the-rooms/ui";
import { useBookingStore } from "@/stores/bookingStore";

interface Room {
  id: string;
  roomNumber: string;
  type: "STUDIO" | "PREMIUM";
  basePriceSingle: number;
  basePriceDouble: number;
  features: string[];
  photos: string[];
}

const MOCK_ROOMS: Room[] = [
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `studio-${i + 1}`,
    roomNumber: `S${String(i + 101).padStart(3, "0")}`,
    type: "STUDIO" as const,
    basePriceSingle: 999,
    basePriceDouble: 1799,
    features: ["Queen Bed", "Work Desk", "WiFi", "AC", "Hot Water"],
    photos: [`https://picsum.photos/seed/sroom${i}/400/300`],
  })),
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `premium-${i + 1}`,
    roomNumber: `P${String(i + 101).padStart(3, "0")}`,
    type: "PREMIUM" as const,
    basePriceSingle: 1999,
    basePriceDouble: 2999,
    features: ["King Bed", "Mini Bar", "City View", "Room Service", "Work Desk"],
    photos: [`https://picsum.photos/seed/proom${i}/400/300`],
  })),
];

export default function BookingRoomsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { checkIn, checkOut, guestsCount, roomType, selectRoom, setStep } = useBookingStore();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);

  const checkInDate = searchParams.get("checkIn") || checkIn;
  const checkOutDate = searchParams.get("checkOut") || checkOut;
  const guests = Number(searchParams.get("guests") || guestsCount || 2);
  const filterType = searchParams.get("type") || roomType;

  useEffect(() => {
    // Simulate API call for room availability
    const filtered = filterType
      ? MOCK_ROOMS.filter((r) => r.type === filterType)
      : MOCK_ROOMS;
    setRooms(filtered);
  }, [filterType]);

  const handleSelect = (room: Room) => {
    setSelectedRoom(room);
  };

  const handleContinue = () => {
    if (!selectedRoom) return;
    const price = guests > 1 ? selectedRoom.basePriceDouble : selectedRoom.basePriceSingle;
    selectRoom(selectedRoom.id, selectedRoom.roomNumber, price);
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

      {/* Room list */}
      <div className="space-y-4">
        {rooms.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <p className="text-lg">No rooms found for the selected criteria.</p>
            <p className="text-sm mt-2">Try adjusting your dates or room type.</p>
          </div>
        ) : (
          rooms.map((room) => {
            const price = guests > 1 ? room.basePriceDouble : room.basePriceSingle;
            const isSelected = selectedRoom?.id === room.id;
            return (
              <div
                key={room.id}
                onClick={() => handleSelect(room)}
                className={cn(
                  "bg-white rounded-xl border overflow-hidden cursor-pointer transition-all",
                  isSelected
                    ? "ring-2 ring-secondary shadow-md"
                    : "hover:shadow-sm"
                )}
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Photo */}
                  <div className="sm:w-48 h-32 sm:h-auto relative shrink-0">
                    <Image
                      src={room.photos[0]}
                      alt={`Room ${room.roomNumber}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                  {/* Content */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-heading font-bold text-lg text-primary">
                            Room {room.roomNumber}
                          </span>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-bold",
                            room.type === "STUDIO" ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"
                          )}>
                            {room.type}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {room.features.map((f) => (
                            <span key={f} className="px-2 py-0.5 bg-accent/60 rounded text-[10px] text-muted">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xl font-bold text-secondary">
                          ₹{price.toLocaleString("en-IN")}
                        </div>
                        <div className="text-xs text-muted">per night</div>
                        <div className="text-xs text-muted mt-0.5">
                          ₹{(price * nights).toLocaleString("en-IN")} total
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-vacant">
                        <Check className="w-4 h-4" />
                        Room selected
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Continue */}
      {selectedRoom && (
        <div className="mt-6 bg-white rounded-xl border p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-primary">
              {selectedRoom.roomNumber} — {selectedRoom.type}
            </p>
            <p className="text-sm text-muted">
              ₹{selectedRoom.basePriceDouble.toLocaleString("en-IN")} × {nights} nights
              = <strong className="text-secondary">₹{(selectedRoom.basePriceDouble * nights).toLocaleString("en-IN")}</strong>
            </p>
          </div>
          <button
            onClick={handleContinue}
            className="flex items-center gap-2 px-6 py-3 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary/90 transition-colors shrink-0"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
