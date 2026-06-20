"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, CalendarDays, Loader2, CheckCircle2, ArrowLeft, Shield } from "lucide-react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Button,
    Badge,
    Dialog,
    DialogContent,
    DialogTrigger,
} from "@the-rooms/ui";
import { formatDate, formatCurrency } from "@the-rooms/ui";

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
        phone: string;
        email?: string;
    };
};

export default function CancelBookingPage() {
    const params = useParams();
    const router = useRouter();
    const bookingId = params.id as string;

    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchBooking() {
            try {
                const res = await fetch("/api/bookings");
                if (res.ok) {
                    const data = await res.json();
                    const found = (data.bookings ?? []).find((b: Booking) => b.id === bookingId);
                    setBooking(found ?? null);
                }
            } catch (err) {
                console.error("Error fetching booking:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchBooking();
    }, [bookingId]);

    async function handleCancel() {
        setCancelling(true);
        setError(null);

        try {
            const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error ?? "Cancellation failed");
            }

            setSuccess(true);
            setShowConfirmDialog(false);
        } catch (err: any) {
            setError(err.message ?? "Failed to cancel booking");
        } finally {
            setCancelling(false);
        }
    }

    const canCancel = booking?.status === "CONFIRMED";
    const hoursUntilCheckIn = booking
        ? (new Date(booking.checkIn).getTime() - new Date().getTime()) / (1000 * 60 * 60)
        : Infinity;
    const canCancelWithin24Hours = hoursUntilCheckIn >= 24;

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
                <AlertTriangle className="w-12 h-12 text-[#B2BEC3] mx-auto mb-3" />
                <p className="text-[#636E72] font-medium">Booking not found</p>
                <Button asChild className="mt-4 bg-[#E17055] hover:bg-[#D35B3F]">
                    <a href="/bookings">Back to Bookings</a>
                </Button>
            </div>
        );
    }

    if (success) {
        return (
            <div className="space-y-6 max-w-2xl mx-auto text-center py-10">
                <div className="w-20 h-20 rounded-full bg-[#00B894]/10 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10 text-[#00B894]" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-[#2D3436]">Booking Cancelled</h1>
                    <p className="text-[#636E72] mt-2">
                        Your booking {booking.bookingNumber} has been successfully cancelled.
                    </p>
                    <p className="text-sm text-[#B2BEC3] mt-2">
                        Refund will be processed within 5-7 business days.
                    </p>
                </div>
                <Button asChild className="bg-[#E17055] hover:bg-[#D35B3F]">
                    <a href="/bookings">View All Bookings</a>
                </Button>
            </div>
        );
    }

    if (!canCancel) {
        return (
            <div className="space-y-6 max-w-2xl">
                <Button variant="ghost" onClick={() => router.back()} className="mb-2">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>

                <Card className="border-red-200 bg-red-50/50">
                    <CardContent className="p-6 text-center">
                        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                        <h2 className="text-lg font-semibold text-red-700">Cannot Cancel Booking</h2>
                        <p className="text-sm text-red-600 mt-2">
                            Only confirmed bookings can be cancelled. Your current booking status is{" "}
                            <strong>{booking.status}</strong>.
                        </p>
                        <Button asChild className="mt-4 bg-[#E17055] hover:bg-[#D35B3F]">
                            <a href="/bookings">Back to Bookings</a>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <Button variant="ghost" onClick={() => router.back()} className="mb-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
            </Button>

            <div>
                <h1 className="text-2xl font-bold text-[#2D3436]">Cancel Booking</h1>
                <p className="text-sm text-[#636E72] mt-1">
                    Review the details before cancelling your reservation
                </p>
            </div>

            {/* Booking Details */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-[#E17055]" />
                        Booking Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-[#636E72]">Booking Number</span>
                        <Badge variant="outline">{booking.bookingNumber}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-[#636E72]">Room</span>
                        <span className="text-sm font-medium text-[#2D3436]">
                            {booking.room.roomNumber} — {booking.room.type}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-[#636E72]">Check-in</span>
                        <span className="text-sm font-medium text-[#2D3436]">
                            {formatDate(booking.checkIn, "long")}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-[#636E72]">Check-out</span>
                        <span className="text-sm font-medium text-[#2D3436]">
                            {formatDate(booking.checkOut, "long")}
                        </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-sm text-[#636E72]">Total Amount</span>
                        <span className="text-lg font-bold text-[#2D3436]">
                            {formatCurrency(Number(booking.totalAmount))}
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Cancellation Policy */}
            <Card className="border-[#FDCB6E]/40 bg-[#FDCB6E]/5">
                <CardContent className="p-4 flex items-start gap-3">
                    <Shield className="w-5 h-5 text-[#E17055] shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-[#2D3436]">Cancellation Policy</p>
                        <ul className="text-xs text-[#636E72] mt-2 space-y-1">
                            <li>• Free cancellation up to 24 hours before check-in</li>
                            <li>• No refund for cancellations within 24 hours of check-in</li>
                            <li>• Refunds are processed within 5-7 business days</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>

            {/* Warning if within 24 hours */}
            {!canCancelWithin24Hours && (
                <Card className="border-red-200 bg-red-50/50">
                    <CardContent className="p-4 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-red-700">Late Cancellation</p>
                            <p className="text-xs text-red-600 mt-1">
                                Your check-in is within 24 hours. Cancellation may not be allowed and
                                refund eligibility is subject to hotel policy.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* Cancel Button */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogTrigger asChild>
                    <Button className="w-full bg-red-500 hover:bg-red-600 text-white">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Cancel This Booking
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <div className="text-center py-4">
                        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-[#2D3436]">Confirm Cancellation</h3>
                        <p className="text-sm text-[#636E72] mt-2">
                            Are you sure you want to cancel booking {booking.bookingNumber}?
                            {canCancelWithin24Hours
                                ? " A full refund will be processed."
                                : " Refund eligibility is subject to hotel policy."}
                        </p>
                        <div className="flex gap-3 mt-6">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setShowConfirmDialog(false)}
                            >
                                Keep Booking
                            </Button>
                            <Button
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                                onClick={handleCancel}
                                disabled={cancelling}
                            >
                                {cancelling ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Cancelling...
                                    </>
                                ) : (
                                    "Yes, Cancel"
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}