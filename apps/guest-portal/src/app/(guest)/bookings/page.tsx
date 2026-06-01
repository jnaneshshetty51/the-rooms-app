"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Download, Eye, Loader2, ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  EmptyState,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@the-rooms/ui";
import { formatCurrency, formatDate } from "@the-rooms/ui";

type Booking = {
  id: string;
  bookingNumber: string;
  checkIn: string;
  checkOut: string;
  status: string;
  paymentStatus: string;
  totalAmount: string;
  bookingType: string;
  room: {
    roomNumber: string;
    type: string;
    photos: { url: string }[];
  };
  guest: {
    name: string;
    phone: string;
  };
  payments: {
    id: string;
    amount: string;
    method: string;
    status: string;
  }[];
};

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-[#00B894]/10 text-[#00B894] border-[#00B894]/20",
  CHECKED_IN: "bg-[#0984E3]/10 text-[#0984E3] border-[#0984E3]/20",
  CHECKED_OUT: "bg-[#636E72]/10 text-[#636E72] border-[#636E72]/20",
  CANCELLED: "bg-[#FF7675]/10 text-[#D63031] border-[#FF7675]/20",
  NO_SHOW: "bg-[#FDCB6E]/10 text-[#D63031] border-[#FDCB6E]/20",
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    async function fetchBookings() {
      try {
        const res = await fetch("/api/bookings");
        if (res.ok) {
          const data = await res.json();
          setBookings(data.bookings ?? []);
        }
      } catch (error) {
        console.error("Error fetching bookings:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchBookings();
  }, []);

  const now = new Date();
  const upcoming = bookings.filter(
    (b) => new Date(b.checkIn) >= now && ["CONFIRMED", "CHECKED_IN"].includes(b.status)
  );
  const past = bookings.filter(
    (b) => new Date(b.checkOut) < now || b.status === "CHECKED_OUT"
  );
  const all = bookings;

  const filtered =
    activeTab === "upcoming"
      ? upcoming
      : activeTab === "past"
      ? past
      : all;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#E17055] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2D3436]">My Bookings</h1>
        <p className="text-sm text-[#636E72] mt-1">
          View and manage all your reservations
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-[#2D3436]">{all.length}</p>
            <p className="text-xs text-[#636E72] mt-1">Total Bookings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-[#00B894]">{upcoming.length}</p>
            <p className="text-xs text-[#636E72] mt-1">Upcoming</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-[#636E72]">{past.length}</p>
            <p className="text-xs text-[#636E72] mt-1">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({all.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filtered.length === 0 ? (
            <Card className="border-dashed border-2 border-[#E5E5E5]">
              <CardContent className="py-12 text-center">
                <CalendarDays className="w-12 h-12 text-[#B2BEC3] mx-auto mb-3" />
                <p className="text-[#636E72] font-medium">
                  {activeTab === "upcoming"
                    ? "No upcoming bookings"
                    : activeTab === "past"
                    ? "No past bookings"
                    : "No bookings found"}
                </p>
                {activeTab === "all" && (
                  <Button asChild className="mt-4 bg-[#E17055] hover:bg-[#D35B3F]">
                    <a href="https://therooms.in">Book a Room</a>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filtered.map((booking) => (
                <Card key={booking.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge className={STATUS_COLORS[booking.status] ?? ""}>
                            {booking.status.replace("_", " ")}
                          </Badge>
                          <Badge variant="outline">{booking.bookingNumber}</Badge>
                          <Badge variant="outline">{booking.bookingType}</Badge>
                        </div>
                        <h3 className="font-semibold text-[#2D3436] text-lg">
                          Room {booking.room.roomNumber}
                        </h3>
                        <p className="text-sm text-[#636E72]">
                          {booking.room.type} Room
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1">
                          <div>
                            <p className="text-xs text-[#B2BEC3]">Check-in</p>
                            <p className="text-sm font-medium text-[#2D3436]">
                              {formatDate(booking.checkIn, "long")}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[#B2BEC3]">Check-out</p>
                            <p className="text-sm font-medium text-[#2D3436]">
                              {formatDate(booking.checkOut, "long")}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 space-y-2">
                        <p className="text-lg font-bold text-[#2D3436]">
                          {formatCurrency(Number(booking.totalAmount))}
                        </p>
                        <p className="text-xs text-[#636E72]">
                          {booking.paymentStatus}
                        </p>
                        <div className="flex flex-col gap-1 pt-1">
                          <Button asChild size="sm" className="bg-[#E17055] hover:bg-[#D35B3F]">
                            <a href={`/stay-details?bookingId=${booking.id}`}>
                              <Eye className="w-4 h-4 mr-1" />
                              Details
                            </a>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <a href={`/invoices?bookingId=${booking.id}`}>
                              <Download className="w-4 h-4 mr-1" />
                              Invoice
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
