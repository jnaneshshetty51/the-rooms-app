"use client";

// apps/admin/src/app/(dashboard)/bookings/[id]/page.tsx
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarCheck, XCircle, CheckCircle, Clock } from "lucide-react";
import { Button, StatusBadge, Badge } from "@the-rooms/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@the-rooms/ui";
import { PageHeader } from "@the-rooms/ui";
import { formatCurrency, formatDate, formatPhone } from "@the-rooms/ui";

interface Payment { id: string; amount: string; method: string; status: string; createdAt: string }
interface Booking {
  id: string;
  bookingNumber: string;
  status: string;
  paymentStatus: string;
  bookingType: string;
  bookingSource: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  baseAmount: string;
  discountAmount: string;
  extrasAmount: string;
  totalAmount: string;
  specialRequests: string | null;
  discountCode: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  guest: {
    name: string; phone: string; email: string | null; address: string | null;
    companyName: string | null;
  };
  room: {
    id: string; roomNumber: string; type: string;
    photos: { url: string }[];
  };
  payments: Payment[];
  createdBy: { name: string | null } | null;
  invoice: { invoiceNumber: string; pdfUrl: string | null } | null;
}

const STATUS_ACTIONS = {
  CONFIRMED: { label: "Check In", icon: CalendarCheck, next: "CHECKED_IN" },
  CHECKED_IN: { label: "Check Out", icon: CheckCircle, next: "CHECKED_OUT" },
};

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetch(`/api/bookings/${id}`)
      .then((r) => r.json())
      .then((d) => { setBooking(d.booking); setLoading(false); });
  }, [id]);

  async function updateStatus(newStatus: string) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setBooking((b) => b ? { ...b, status: data.booking.status } : b);
      }
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />)}</div>;
  }

  if (!booking) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Booking not found.</p>
        <Button variant="outline" onClick={() => router.push("/bookings")} className="mt-4">Back to Bookings</Button>
      </div>
    );
  }

  const statusAction = STATUS_ACTIONS[booking.status as keyof typeof STATUS_ACTIONS];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/bookings")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-heading text-2xl font-bold font-mono">{booking.bookingNumber}</h1>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={booking.status as "CONFIRMED"} type="booking" />
              <StatusBadge status={booking.paymentStatus as "PAID"} type="payment" />
              <Badge variant="outline">{booking.bookingType.replace("_", " ")}</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {statusAction && (
            <Button
              variant="default"
              onClick={() => updateStatus(statusAction.next)}
              disabled={updating}
            >
              <statusAction.icon className="h-4 w-4 mr-1.5" />
              {statusAction.label}
            </Button>
          )}
          {booking.status === "CONFIRMED" && (
            <Button
              variant="destructive"
              onClick={() => updateStatus("CANCELLED")}
              disabled={updating}
            >
              <XCircle className="h-4 w-4 mr-1.5" />
              Cancel Booking
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Guest Info */}
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">Guest Information</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="font-medium">{booking.guest.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium">{formatPhone(booking.guest.phone)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{booking.guest.email ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Company</p>
                  <p className="font-medium">{booking.guest.companyName ?? "—"}</p>
                </div>
              </div>
              {booking.specialRequests && (
                <div>
                  <p className="text-xs text-muted-foreground">Special Requests</p>
                  <p className="text-sm bg-muted rounded-lg p-3 mt-1">{booking.specialRequests}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stay Details */}
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">Stay Details</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Room</p>
                  <p className="font-bold text-lg">Room {booking.room.roomNumber}</p>
                  <p className="text-xs text-muted-foreground">{booking.room.type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Check-in</p>
                  <p className="font-medium">{formatDate(booking.checkIn, "long")}</p>
                  {booking.checkInTime && <p className="text-xs text-muted-foreground">Actual: {formatDate(booking.checkInTime, "short")}</p>}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Check-out</p>
                  <p className="font-medium">{formatDate(booking.checkOut, "long")}</p>
                  {booking.checkOutTime && <p className="text-xs text-muted-foreground">Actual: {formatDate(booking.checkOutTime, "short")}</p>}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Guests</p>
                  <p className="font-medium">{booking.guestsCount}</p>
                  <p className="text-xs text-muted-foreground">{booking.bookingSource}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payments */}
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">Payments</CardTitle></CardHeader>
            <CardContent>
              {booking.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No payments recorded</p>
              ) : (
                <div className="space-y-3">
                  {booking.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{formatCurrency(Number(p.amount))}</p>
                        <p className="text-xs text-muted-foreground">{p.method} · {formatDate(p.createdAt, "short")}</p>
                      </div>
                      <StatusBadge status={p.status as "PAID"} type="payment" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Room photo */}
          {booking.room.photos[0] && (
            <div className="rounded-xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={booking.room.photos[0].url} alt={booking.room.roomNumber} className="w-full h-48 object-cover" />
            </div>
          )}

          {/* Pricing summary */}
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">Price Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Base Amount</span>
                <span>{formatCurrency(Number(booking.baseAmount))}</span>
              </div>
              {Number(booking.discountAmount) > 0 && (
                <div className="flex justify-between text-sm text-success">
                  <span>Discount {booking.discountCode ? `(${booking.discountCode})` : ""}</span>
                  <span>-{formatCurrency(Number(booking.discountAmount))}</span>
                </div>
              )}
              {Number(booking.extrasAmount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Extras</span>
                  <span>{formatCurrency(Number(booking.extrasAmount))}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t">
                <span>Total</span>
                <span>{formatCurrency(Number(booking.totalAmount))}</span>
              </div>
            </CardContent>
          </Card>

          {/* Booking info */}
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">Booking Info</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created by</span>
                <span>{booking.createdBy?.name ?? "Website"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source</span>
                <span>{booking.bookingSource}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span>{booking.bookingType}</span>
              </div>
              {booking.invoice && (
                <div className="pt-2">
                  <p className="text-muted-foreground">Invoice</p>
                  <p className="font-mono font-medium">{booking.invoice.invoiceNumber}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
