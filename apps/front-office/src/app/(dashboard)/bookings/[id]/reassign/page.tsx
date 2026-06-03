"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@the-rooms/ui";
import { Loader2, ArrowLeft, Bed, CheckCircle, AlertCircle } from "lucide-react";
import { formatCurrency } from "@the-rooms/ui";

interface Room { id: string; roomNumber: string; type: string; basePriceSingle: number; basePriceDouble: number; status: string; }
interface Booking { id: string; bookingNumber: string; status: string; checkIn: string; checkOut: string; totalAmount: string; guestsCount: number; guest: { name: string; phone: string }; room: { id: string; roomNumber: string; type: string; basePriceSingle: number; basePriceDouble: number } }

const PRICING = { STUDIO: { single: 999, double: 1799 }, PREMIUM: { single: 1999, double: 2999 } };

export default function ReassignRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");

  useEffect(() => {
    async function fetchData() {
      try {
        const [bookingRes, roomsRes] = await Promise.all([
          fetch(`/api/bookings/${id}`),
          fetch("/api/rooms/board")
        ]);
        if (!bookingRes.ok) throw new Error("Booking not found");
        const b = await bookingRes.json();
        if (b.status !== "CHECKED_IN" && b.status !== "CONFIRMED") {
          throw new Error("Only active bookings can be reassigned");
        }
        setBooking(b);
        
        if (roomsRes.ok) {
          const data = await roomsRes.json();
          setRooms(
            data.rooms
              .filter((r: Room) => r.status === "VACANT")
              .map((r: Room) => ({
                ...r,
                basePriceSingle: PRICING[r.type as keyof typeof PRICING]?.single ?? 999,
                basePriceDouble: PRICING[r.type as keyof typeof PRICING]?.double ?? 1799
              }))
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const newRoom = rooms.find(r => r.id === selectedRoomId);
  
  const charges = (() => {
    if (!booking || !newRoom) return { difference: 0, newTotal: Number(booking?.totalAmount || 0) };
    
    const checkIn = new Date(booking.checkIn);
    const checkOut = new Date(booking.checkOut);
    const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86400000));
    
    const pricePerNight = booking.guestsCount === 1 ? newRoom.basePriceSingle : newRoom.basePriceDouble;
    const newTotal = nights * pricePerNight;
    const difference = newTotal - Number(booking.totalAmount);
    
    return { difference, newTotal };
  })();

  const handleReassign = async () => {
    if (!selectedRoomId || !booking) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/reassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newRoomId: selectedRoomId })
      });
      if (res.ok) {
        router.push(`/bookings/${booking.id}`);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to reassign room");
      }
    } catch (e) {
      setError("An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#E17055]" /></div>;
  if (!booking) return <div className="flex h-[60vh] items-center justify-center"><div className="text-center"><AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" /><p className="text-gray-900 font-medium">{error || "Not found"}</p><Link href={`/bookings/${id}`} className="mt-4 text-[#E17055]">Back</Link></div></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/bookings/${id}`} className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50"><ArrowLeft className="h-5 w-5" /></Link>
        <div><h2 className="text-2xl font-bold text-gray-900">Reassign Room</h2><p className="text-gray-500">Booking #{booking.bookingNumber}</p></div>
      </div>
      
      <div className="rounded-xl border bg-white p-6">
        <h3 className="text-lg font-semibold mb-4">Current Booking</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><p className="text-sm text-gray-500">Guest</p><p className="font-medium">{booking.guest.name}</p></div>
          <div><p className="text-sm text-gray-500">Current Room</p><p className="font-medium">{booking.room.roomNumber} ({booking.room.type})</p></div>
          <div><p className="text-sm text-gray-500">Guests</p><p className="font-medium">{booking.guestsCount}</p></div>
          <div><p className="text-sm text-gray-500">Current Total</p><p className="font-medium">{formatCurrency(Number(booking.totalAmount))}</p></div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 space-y-6">
        <h3 className="text-lg font-semibold">Select New Room</h3>
        {rooms.length === 0 ? (
          <div className="text-center py-8">
            <Bed className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No vacant rooms available</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {rooms.map((room) => {
              const price = booking.guestsCount === 1 ? room.basePriceSingle : room.basePriceDouble;
              const isSelected = selectedRoomId === room.id;
              const isCurrent = room.id === booking.room.id;
              
              if (isCurrent) return null; // Don't show current room as option

              return (
                <button 
                  key={room.id} 
                  onClick={() => setSelectedRoomId(room.id)} 
                  className={cn("rounded-xl border-2 p-4 text-left transition-all", isSelected ? "border-[#E17055] bg-[#E17055]/5 ring-2 ring-[#E17055]" : "border-gray-200 hover:border-gray-300")}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl font-bold text-gray-900">{room.roomNumber}</span>
                    <span className="text-xs font-medium text-gray-500">{room.type}</span>
                  </div>
                  <p className="text-lg font-bold text-[#E17055]">{formatCurrency(price)}</p>
                  <p className="text-xs text-gray-500">per night</p>
                </button>
              );
            })}
          </div>
        )}
        
        {newRoom && charges.difference !== 0 && (
          <div className={cn("rounded-lg border p-4", charges.difference > 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200")}>
            <h4 className={cn("font-medium", charges.difference > 0 ? "text-blue-900" : "text-orange-900")}>
              {charges.difference > 0 ? "Upgrade Charge" : "Downgrade Refund"}
            </h4>
            <div className={cn("flex justify-between text-sm mt-1", charges.difference > 0 ? "text-blue-700" : "text-orange-700")}>
              <span>Price Difference</span>
              <span>{charges.difference > 0 ? "+" : ""}{formatCurrency(charges.difference)}</span>
            </div>
          </div>
        )}
        {error && <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{error}</div>}
      </div>

      <div className="rounded-xl border bg-white p-6">
        <h3 className="text-lg font-semibold mb-4">Updated Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm"><span className="text-gray-600">Current Total</span><span>{formatCurrency(Number(booking.totalAmount))}</span></div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Difference</span>
            <span className={charges.difference > 0 ? "text-blue-600" : charges.difference < 0 ? "text-orange-600" : ""}>{charges.difference > 0 ? "+" : ""}{formatCurrency(charges.difference)}</span>
          </div>
          <div className="flex justify-between font-semibold text-lg border-t pt-3">
            <span>New Total</span>
            <span className="text-[#E17055]">{formatCurrency(charges.newTotal)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Link href={`/bookings/${id}`} className="flex-1 border border-gray-300 py-3 text-center text-gray-700 hover:bg-gray-50 rounded-lg">Cancel</Link>
        <button onClick={handleReassign} disabled={!selectedRoomId || submitting} className="flex-1 rounded-lg bg-[#E17055] py-3 text-white hover:bg-[#D35B3F] disabled:opacity-50 flex items-center justify-center gap-2">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
          Confirm Reassignment
        </button>
      </div>
    </div>
  );
}
