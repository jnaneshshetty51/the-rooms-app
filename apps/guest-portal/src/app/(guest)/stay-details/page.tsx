"use client";

import Image from "next/image";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  Clock,
  MapPin,
  Wifi,
  Wind,
  Tv,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Utensils,
  Bath,
  ChevronRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from "@the-rooms/ui";
import { formatDate, formatCurrency } from "@the-rooms/ui";

type Booking = {
  id: string;
  bookingNumber: string;
  checkIn: string;
  checkOut: string;
  status: string;
  paymentStatus: string;
  totalAmount: string;
  specialRequests?: string;
  room: {
    id: string;
    roomNumber: string;
    type: string;
    description?: string;
    photos: { url: string; caption?: string }[];
    amenities: { amenity: { name: string; icon: string; category: string } }[];
  };
  guest: {
    name: string;
    phone: string;
    email?: string;
  };
  payments: {
    id: string;
    amount: string;
    method: string;
    status: string;
  }[];
  invoice?: {
    id: string;
    invoiceNumber: string;
    pdfUrl?: string;
  };
};

const HOTEL_ADDRESS = "The Rooms, 103/2, Uniworld, Neeladri Road, Behind Karnataka Bank, Electronic City Phase 1, Bangalore, Karnataka 560100";
const MAP_IMAGE_URL = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/77.5946,12.9716,14,0/600x300?access_token=placeholder`;

function StayDetailsPageContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [res, settingsRes] = await Promise.all([
          fetch("/api/bookings"),
          fetch("/api/settings")
        ]);
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setSettings(data.settings);
        }
        if (res.ok) {
          const data = await res.json();
          const bookings: Booking[] = data.bookings ?? [];

          if (bookingId) {
            const found = bookings.find((b) => b.id === bookingId);
            setBooking(found ?? null);
          } else {
            // Get the most recent upcoming or current booking
            const upcoming = bookings
              .filter((b) => ["CONFIRMED", "CHECKED_IN"].includes(b.status))
              .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime());
            setBooking(upcoming[0] ?? bookings[0] ?? null);
          }
          setAllBookings(bookings);
        }
      } catch (error) {
        console.error("Error fetching stay details:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [bookingId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#E17055] animate-spin" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 text-[#B2BEC3] mx-auto mb-3" />
        <p className="text-[#636E72] font-medium">Booking not found</p>
        <Button asChild className="mt-4 bg-[#E17055] hover:bg-[#D35B3F]">
          <a href="/bookings">Back to Bookings</a>
        </Button>
      </div>
    );
  }

  const nights = Math.ceil(
    (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const isUpcoming = new Date(booking.checkIn) > new Date();
  const isCurrent = booking.status === "CHECKED_IN";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2D3436]">Stay Details</h1>
        <p className="text-sm text-[#636E72] mt-1">
          Booking {booking.bookingNumber}
        </p>
      </div>

      {/* Room photo */}
      {booking.room.photos?.[0] && (
        <div className="relative h-48 sm:h-64 rounded-xl overflow-hidden">
          <Image
            src={booking.room.photos[0].url}
            alt={`Room ${booking.room.roomNumber}`}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Room {booking.room.roomNumber}
              </h2>
              <p className="text-white/80 text-sm">{booking.room.type} Room</p>
            </div>
            <Badge
              className={
                booking.status === "CHECKED_IN"
                  ? "bg-[#00B894] text-white"
                  : "bg-white/20 text-white backdrop-blur-sm"
              }
            >
              {booking.status.replace("_", " ")}
            </Badge>
          </div>
        </div>
      )}

      {/* Booking info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FDCB6E]/20 flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-[#E17055]" />
              </div>
              <div>
                <p className="text-xs text-[#636E72]">Check-in</p>
                <p className="font-semibold text-[#2D3436]">
                  {formatDate(booking.checkIn, "long")}
                </p>
                <p className="text-xs text-[#B2BEC3]">From 2:00 PM</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#74B9FF]/20 flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-[#0984E3]" />
              </div>
              <div>
                <p className="text-xs text-[#636E72]">Check-out</p>
                <p className="font-semibold text-[#2D3436]">
                  {formatDate(booking.checkOut, "long")}
                </p>
                <p className="text-xs text-[#B2BEC3]">By 11:00 AM</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00B894]/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#00A381]" />
              </div>
              <div>
                <p className="text-xs text-[#636E72]">Duration</p>
                <p className="font-semibold text-[#2D3436]">
                  {nights} {nights === 1 ? "night" : "nights"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#E17055]/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-[#E17055]" />
              </div>
              <div>
                <p className="text-xs text-[#636E72]">Total Paid</p>
                <p className="font-bold text-[#2D3436]">
                  {formatCurrency(Number(booking.totalAmount))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Amenities */}
          {booking.room.amenities?.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Included Amenities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {booking.room.amenities.map((ra, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#00B894] shrink-0" />
                      <span className="text-sm text-[#636E72]">{ra.amenity.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Special requests */}
          {booking.specialRequests && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Special Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#636E72]">{booking.specialRequests}</p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" className="bg-[#E17055] hover:bg-[#D35B3F]">
                  <a href={`/extend-stay?bookingId=${booking.id}`}>
                    Extend Stay
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={`/addons?bookingId=${booking.id}`}>
                    Request Services
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={`/documents?bookingId=${booking.id}`}>
                    Upload Documents
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href={`/invoices?bookingId=${booking.id}`}>
                    Download Invoice
                  </a>
                </Button>
                {booking.status === "CONFIRMED" && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-red-500 border-red-200 hover:bg-red-50"
                    onClick={async () => {
                      if (confirm("Are you sure you want to cancel this booking? This action cannot be undone.")) {
                        try {
                          const res = await fetch(`/api/bookings/${booking.id}/cancel`, { method: "POST" });
                          if (res.ok) {
                            window.location.reload();
                          } else {
                            alert("Failed to cancel booking. Please contact support.");
                          }
                        } catch (error) {
                          alert("An error occurred.");
                        }
                      }
                    }}
                  >
                    Cancel Booking
                  </Button>
                )}
              </div>
              {booking.status === "CHECKED_OUT" && (
                <Button asChild size="sm" className="mt-2">
                  <a href={`/feedback?bookingId=${booking.id}`}>
                    Share Feedback
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Guest info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Guest Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-xs text-[#B2BEC3]">Name</p>
                <p className="text-sm font-medium text-[#2D3436]">{booking.guest.name}</p>
              </div>
              <div>
                <p className="text-xs text-[#B2BEC3]">Phone</p>
                <p className="text-sm font-medium text-[#2D3436]">{booking.guest.phone}</p>
              </div>
              {booking.guest.email && (
                <div>
                  <p className="text-xs text-[#B2BEC3]">Email</p>
                  <p className="text-sm font-medium text-[#2D3436]">{booking.guest.email}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#E17055]" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40 bg-[#F0F0F0] rounded-lg mb-3 overflow-hidden relative">
                <Image
                  src={`https://placehold.co/600x300/2D3436/white?text=The+Rooms+Bangalore`}
                  alt="Hotel location"
                  fill
                  className="object-cover"
                />
              </div>
              <p className="text-sm text-[#636E72]">{settings?.address || HOTEL_ADDRESS}</p>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="w-full mt-3"
              >
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings?.address || HOTEL_ADDRESS)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open in Maps
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Hotel contact */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Hotel Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-[#636E72]">
                <span className="font-medium text-[#2D3436]">Phone:</span>{" "}
                {settings?.phone || "+91 73490 47799"}
              </p>
              <p className="text-[#636E72]">
                <span className="font-medium text-[#2D3436]">WhatsApp:</span>{" "}
                {settings?.whatsapp || "+91 72046 19899"}
              </p>
              <p className="text-[#636E72]">
                <span className="font-medium text-[#2D3436]">Email:</span>{" "}
                {settings?.email || "stay@therooms.in"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function StayDetailsPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E17055] border-t-transparent" /></div>}>
      <StayDetailsPageContent />
    </Suspense>
  );
}
