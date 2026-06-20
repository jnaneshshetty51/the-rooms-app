"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CalendarPlus, Loader2, CheckCircle2, ArrowLeft, AlertCircle, Clock } from "lucide-react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Button,
    Badge,
} from "@the-rooms/ui";
import { formatDate } from "@the-rooms/ui";

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
};

type StayModificationRequest = {
    id: string;
    type: string;
    status: string;
    requestedCheckIn?: string;
    requestedCheckOut?: string;
    reason?: string;
    createdAt: string;
};

export default function ModifyStayPage() {
    const params = useParams();
    const router = useRouter();
    const bookingId = params.id as string;

    const [booking, setBooking] = useState<Booking | null>(null);
    const [pendingRequest, setPendingRequest] = useState<StayModificationRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [modificationType, setModificationType] = useState<string>("LATE_CHECKOUT");
    const [requestedCheckOut, setRequestedCheckOut] = useState("");
    const [reason, setReason] = useState("");

    useEffect(() => {
        async function fetchData() {
            try {
                const [bookingsRes, modificationRes] = await Promise.all([
                    fetch("/api/bookings"),
                    fetch(`/api/bookings/${bookingId}/stay-modification`),
                ]);

                if (bookingsRes.ok) {
                    const data = await bookingsRes.json();
                    const found = (data.bookings ?? []).find((b: Booking) => b.id === bookingId);
                    setBooking(found ?? null);
                }

                if (modificationRes.ok) {
                    const modData = await modificationRes.json();
                    if (modData.hasPendingRequest) {
                        setPendingRequest(modData.request);
                    }
                }
            } catch (err) {
                console.error("Error fetching data:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [bookingId]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!requestedCheckOut) {
            setError("Please select a new check-out date");
            return;
        }

        setSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await fetch(`/api/bookings/${bookingId}/stay-modification`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: modificationType,
                    requestedCheckOut,
                    reason,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error ?? "Request failed");
            }

            setSuccess(data.message ?? "Modification request submitted successfully!");
            setPendingRequest(data.request);
            setRequestedCheckOut("");
            setReason("");
        } catch (err: any) {
            setError(err.message ?? "Failed to submit request");
        } finally {
            setSubmitting(false);
        }
    }

    // Set min date to day after current check-out
    const minDate = booking
        ? new Date(new Date(booking.checkOut).getTime() + 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0]
        : "";

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

    const canModify = ["CONFIRMED", "CHECKED_IN"].includes(booking.status);

    if (!canModify) {
        return (
            <div className="space-y-6 max-w-2xl">
                <Button variant="ghost" onClick={() => router.back()} className="mb-2">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>

                <Card className="border-red-200 bg-red-50/50">
                    <CardContent className="p-6 text-center">
                        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                        <h2 className="text-lg font-semibold text-red-700">Cannot Modify Booking</h2>
                        <p className="text-sm text-red-600 mt-2">
                            Stay modifications are only available for confirmed or checked-in bookings.
                            Your current status is <strong>{booking.status}</strong>.
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
                <h1 className="text-2xl font-bold text-[#2D3436]">Modify Your Stay</h1>
                <p className="text-sm text-[#636E72] mt-1">
                    Request changes to your check-out date
                </p>
            </div>

            {/* Pending Request Alert */}
            {pendingRequest && (
                <Card className="border-[#00B894]/30 bg-[#00B894]/5">
                    <CardContent className="p-4 flex items-start gap-3">
                        <Clock className="w-5 h-5 text-[#00B894] shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-[#2D3436]">Request Pending</p>
                            <p className="text-xs text-[#636E72] mt-1">
                                You already have a pending modification request (
                                {pendingRequest.type.replace("_", " ")}).
                                Our team will review it and get back to you shortly.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Current Booking */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <CalendarPlus className="w-5 h-5 text-[#E17055]" />
                        Current Booking
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-[#636E72]">Booking</span>
                        <Badge variant="outline">{booking.bookingNumber}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-[#636E72]">Room</span>
                        <span className="text-sm font-medium text-[#2D3436]">
                            {booking.room.roomNumber} — {booking.room.type}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-[#636E72]">Current Check-out</span>
                        <span className="text-sm font-semibold text-[#2D3436]">
                            {formatDate(booking.checkOut, "long")}
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Modification Form */}
            <Card className="border-[#E17055]/30">
                <div className="h-1 bg-gradient-to-r from-[#E17055] to-[#FDCB6E]" />
                <CardHeader className="pb-4">
                    <CardTitle className="text-base">Request Extension</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Modification Type */}
                        <div>
                            <label className="block text-sm font-medium text-[#2D3436] mb-1.5">
                                Modification Type
                            </label>
                            <select
                                className="w-full px-4 py-3 rounded-lg border border-[#E5E5E5] bg-white text-[#2D3436] text-sm focus:outline-none focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                                value={modificationType}
                                onChange={(e) => setModificationType(e.target.value)}
                                disabled={!!pendingRequest}
                            >
                                <option value="LATE_CHECKOUT">Late Check-out</option>
                                <option value="DATE_CHANGE">Extend Stay</option>
                            </select>
                        </div>

                        {/* New Check-out Date */}
                        <div>
                            <label className="block text-sm font-medium text-[#2D3436] mb-1.5">
                                New Check-out Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={requestedCheckOut}
                                min={minDate}
                                onChange={(e) => setRequestedCheckOut(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-[#E5E5E5] bg-white text-[#2D3436] text-sm focus:outline-none focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                                required
                                disabled={!!pendingRequest}
                            />
                            <p className="text-xs text-[#B2BEC3] mt-1">
                                Must be after {formatDate(booking.checkOut, "long")}
                            </p>
                        </div>

                        {/* Reason */}
                        <div>
                            <label className="block text-sm font-medium text-[#2D3436] mb-1.5">
                                Reason <span className="text-xs text-[#B2BEC3]">(optional)</span>
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="e.g., Need extra day for work, holiday extension..."
                                rows={3}
                                className="w-full px-4 py-3 rounded-lg border border-[#E5E5E5] bg-white text-[#2D3436] text-sm focus:outline-none focus:ring-2 focus:ring-[#E17055] focus:border-transparent resize-none"
                                disabled={!!pendingRequest}
                            />
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="p-3 rounded-lg bg-[#00B894]/10 text-[#00A381] text-sm flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                                {success}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={submitting || !requestedCheckOut || !!pendingRequest}
                            className="w-full bg-[#E17055] hover:bg-[#D35B3F]"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <CalendarPlus className="w-4 h-4 mr-2" />
                                    Request Extension
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}