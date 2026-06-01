"use client";

import { useEffect, useState } from "react";
import { CalendarDays, FileText, HeadphonesIcon, Star, ArrowRight, MapPin, Clock } from "lucide-react";
import { StatCard, Card, CardContent, CardHeader, CardTitle, Button, Badge } from "@the-rooms/ui";
import { formatCurrency, formatDate } from "@the-rooms/ui";

type Booking = {
  id: string;
  bookingNumber: string;
  checkIn: string;
  checkOut: string;
  status: string;
  totalAmount: string;
  room: {
    roomNumber: string;
    type: string;
  };
  guest: {
    name: string;
  };
};

type Stats = {
  totalStays: number;
  upcomingStays: number;
  pastStays: number;
  pendingDocuments: number;
  openComplaints: number;
};

export default function GuestDashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [bookingsRes, statsRes] = await Promise.all([
          fetch("/api/bookings"),
          fetch("/api/stats"),
        ]);

        if (bookingsRes.ok) {
          const data = await bookingsRes.json();
          setBookings(data.bookings ?? []);
        }

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const now = new Date();
  const upcomingBookings = bookings.filter(
    (b) => new Date(b.checkIn) >= now && ["CONFIRMED", "CHECKED_IN"].includes(b.status)
  );
  const nextBooking = upcomingBookings[0];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
                <div className="h-8 bg-gray-200 rounded w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[#2D3436]">Welcome back!</h1>
        <p className="text-sm text-[#636E72] mt-1">
          Manage your bookings, documents, and services
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Stays"
          value={String(stats?.totalStays ?? bookings.length)}
          icon={CalendarDays}
          className="border-l-4 border-l-[#E17055]"
        />
        <StatCard
          title="Upcoming"
          value={String(upcomingBookings.length)}
          icon={Clock}
          className="border-l-4 border-l-[#00B894]"
        />
        <StatCard
          title="Documents"
          value={String(stats?.pendingDocuments ?? 0)}
          icon={FileText}
          className="border-l-4 border-l-[#FDCB6E]"
        />
        <StatCard
          title="Reviews"
          value={String(stats?.pastStays ?? 0)}
          icon={Star}
          className="border-l-4 border-l-[#74B9FF]"
        />
      </div>

      {/* Next Stay Card */}
      {nextBooking ? (
        <Card className="border-[#E17055]/30 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-[#E17055] to-[#FDCB6E]" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-[#2D3436]">
                Your Upcoming Stay
              </CardTitle>
              <Badge variant={nextBooking.status === "CHECKED_IN" ? "default" : "secondary"}>
                {nextBooking.status === "CHECKED_IN" ? "Checked In" : nextBooking.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-[#636E72] mb-1">Room</p>
                <p className="font-semibold text-[#2D3436]">
                  {nextBooking.room.roomNumber}
                  <span className="text-xs text-[#636E72] ml-2">
                    ({nextBooking.room.type})
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs text-[#636E72] mb-1">Check-in</p>
                <p className="font-semibold text-[#2D3436]">
                  {formatDate(nextBooking.checkIn, "long")}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#636E72] mb-1">Check-out</p>
                <p className="font-semibold text-[#2D3436]">
                  {formatDate(nextBooking.checkOut, "long")}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button asChild size="sm" className="bg-[#E17055] hover:bg-[#D35B3F]">
                <a href={`/stay-details?bookingId=${nextBooking.id}`}>
                  View Details
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={`/documents?bookingId=${nextBooking.id}`}>Upload Documents</a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={`/addons?bookingId=${nextBooking.id}`}>Request Services</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-2 border-[#E5E5E5]">
          <CardContent className="py-12 text-center">
            <CalendarDays className="w-12 h-12 text-[#B2BEC3] mx-auto mb-3" />
            <p className="text-[#636E72] font-medium">No upcoming stays</p>
            <p className="text-sm text-[#B2BEC3] mt-1">
              Your upcoming bookings will appear here
            </p>
            <Button asChild className="mt-4 bg-[#E17055] hover:bg-[#D35B3F]">
              <a href="https://therooms.in">Book a Room</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            href: "/documents",
            label: "Upload ID",
            desc: "Upload your ID proof",
            icon: FileText,
            color: "bg-[#FDCB6E]/10 text-[#E17055]",
          },
          {
            href: "/addons",
            label: "Request Services",
            desc: "Laundry, towels & more",
            icon: HeadphonesIcon,
            color: "bg-[#74B9FF]/10 text-[#0984E3]",
          },
          {
            href: "/complaints",
            label: "Raise Issue",
            desc: "Report a problem",
            icon: HeadphonesIcon,
            color: "bg-[#FF7675]/10 text-[#D63031]",
          },
          {
            href: "/feedback",
            label: "Share Feedback",
            desc: "Review your stay",
            icon: Star,
            color: "bg-[#00B894]/10 text-[#00A381]",
          },
        ].map((action) => (
          <a
            key={action.href}
            href={action.href}
            className="group block"
          >
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <action.icon className="w-5 h-5" />
                </div>
                <p className="font-semibold text-sm text-[#2D3436]">{action.label}</p>
                <p className="text-xs text-[#636E72] mt-0.5">{action.desc}</p>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>

      {/* Past Bookings */}
      {bookings.filter((b) => b.status === "CHECKED_OUT").length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-[#2D3436]">Past Stays</h2>
            <a href="/bookings" className="text-sm text-[#E17055] hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          <div className="space-y-3">
            {bookings
              .filter((b) => b.status === "CHECKED_OUT")
              .slice(0, 3)
              .map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#2D3436]">
                        Room {booking.room.roomNumber}
                        <span className="text-xs text-[#636E72] ml-2">
                          ({booking.room.type})
                        </span>
                      </p>
                      <p className="text-sm text-[#636E72]">
                        {formatDate(booking.checkIn)} — {formatDate(booking.checkOut)}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{booking.bookingNumber}</Badge>
                      <p className="text-sm font-medium text-[#2D3436] mt-1">
                        {formatCurrency(Number(booking.totalAmount))}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
