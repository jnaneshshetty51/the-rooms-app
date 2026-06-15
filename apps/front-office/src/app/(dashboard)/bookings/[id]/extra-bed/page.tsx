"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { cn } from "@the-rooms/ui";
import { Loader2, ArrowLeft, Bed, Plus, Trash2, AlertCircle, CheckCircle } from "lucide-react";
import { formatDate, formatCurrency } from "@the-rooms/ui";

interface Booking {
    id: string;
    bookingNumber: string;
    status: string;
    checkIn: string;
    checkOut: string;
    guest: { name: string; phone: string };
    room: { roomNumber: string; type: string };
}

interface ExtraBedInfo {
    currentBeds: number;
    maxBeds: number;
    extraBedPrice: number;
    totalCharge: number;
    history: Array<{
        id: string;
        quantity: number;
        chargeAmount: number;
        addedAt: string;
        removedAt?: string;
        notes?: string;
    }>;
}

export default function ExtraBedPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [booking, setBooking] = useState<Booking | null>(null);
    const [extraBedInfo, setExtraBedInfo] = useState<ExtraBedInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState("");

    useEffect(() => {
        fetchData();
    }, [id]);

    async function fetchData() {
        setLoading(true);
        try {
            const [bookingRes, extraBedRes] = await Promise.all([
                fetch(`/api/bookings/${id}`),
                fetch(`/api/bookings/${id}/extra-bed`),
            ]);

            if (!bookingRes.ok) throw new Error("Booking not found");
            if (!extraBedRes.ok) throw new Error("Failed to fetch extra bed info");

            const bookingData = await bookingRes.json();
            const extraBedData = await extraBedRes.json();

            setBooking(bookingData);
            setExtraBedInfo(extraBedData);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }

    const handleAddBed = async () => {
        setSubmitting(true);
        try {
            const res = await fetch(`/api/bookings/${id}/extra-bed`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ quantity, notes: notes || undefined }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to add extra bed");
            }

            fetchData();
            setQuantity(1);
            setNotes("");
            alert("Extra bed added successfully");
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to add extra bed");
        } finally {
            setSubmitting(false);
        }
    };

    const handleRemoveBed = async (removeQuantity: number) => {
        if (!confirm(`Remove ${removeQuantity} extra bed(s)?`)) return;

        setSubmitting(true);
        try {
            const res = await fetch(`/api/bookings/${id}/extra-bed`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ quantity: removeQuantity }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to remove extra bed");
            }

            fetchData();
            alert("Extra bed removed successfully");
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to remove extra bed");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#E17055]" />
            </div>
        );
    }

    if (error || !booking) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-gray-900 font-medium">{error || "Booking not found"}</p>
                    <Link href={`/bookings/${id}`} className="mt-4 text-[#E17055] hover:underline">
                        Back
                    </Link>
                </div>
            </div>
        );
    }

    const canModify = booking.status === "CONFIRMED" || booking.status === "CHECKED_IN";
    const availableBeds = extraBedInfo ? extraBedInfo.maxBeds - extraBedInfo.currentBeds : 0;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href={`/bookings/${id}`}
                    className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Extra Bed Management</h2>
                    <p className="text-gray-500">
                        Booking #{booking.bookingNumber} • Room {booking.room.roomNumber}
                    </p>
                </div>
            </div>

            {/* Booking Info */}
            <div className="rounded-xl border bg-white p-6">
                <h3 className="text-lg font-semibold mb-4">Booking Details</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-gray-500">Guest</p>
                        <p className="font-medium text-gray-900">{booking.guest.name}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Room</p>
                        <p className="font-medium text-gray-900">
                            {booking.room.roomNumber} ({booking.room.type})
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Check-in</p>
                        <p className="font-medium text-gray-900">{formatDate(booking.checkIn, "long")}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Check-out</p>
                        <p className="font-medium text-gray-900">{formatDate(booking.checkOut, "long")}</p>
                    </div>
                </div>
            </div>

            {/* Current Extra Beds */}
            <div className="rounded-xl border bg-white p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Bed className="h-5 w-5" />
                    Current Extra Beds
                </h3>

                {extraBedInfo && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <p className="text-sm text-gray-500">Extra Beds In Use</p>
                                <p className="text-3xl font-bold text-gray-900">{extraBedInfo.currentBeds}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500">Maximum Allowed</p>
                                <p className="text-3xl font-bold text-gray-900">{extraBedInfo.maxBeds}</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                            <div>
                                <p className="text-sm text-orange-700">Available to Add</p>
                                <p className="text-2xl font-bold text-orange-700">{availableBeds}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-orange-700">Price per Bed</p>
                                <p className="text-2xl font-bold text-orange-700">
                                    {formatCurrency(extraBedInfo.extraBedPrice)}
                                </p>
                            </div>
                        </div>

                        {extraBedInfo.totalCharge > 0 && (
                            <div className="flex items-center justify-between p-4 bg-[#E17055]/5 rounded-lg border border-[#E17055]/20">
                                <span className="font-medium text-gray-900">Total Extra Bed Charges</span>
                                <span className="text-xl font-bold text-[#E17055]">
                                    {formatCurrency(extraBedInfo.totalCharge)}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Add/Remove Extra Beds */}
            {canModify && (
                <div className="rounded-xl border bg-white p-6">
                    <h3 className="text-lg font-semibold mb-4">Modify Extra Beds</h3>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Number of Beds
                                </label>
                                <select
                                    value={quantity}
                                    onChange={(e) => setQuantity(parseInt(e.target.value))}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                                    disabled={availableBeds === 0}
                                >
                                    {[1, 2, 3].map((n) => (
                                        <option key={n} value={n} disabled={n > availableBeds}>
                                            {n} bed{n > 1 ? "s" : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Charge per Bed
                                </label>
                                <div className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-700">
                                    {formatCurrency(extraBedInfo?.extraBedPrice || 0)}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                            <textarea
                                rows={2}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                                placeholder="Optional notes..."
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleAddBed}
                                disabled={submitting || availableBeds === 0}
                                className="flex-1 rounded-lg bg-[#E17055] py-3 text-sm font-medium text-white hover:bg-[#D35B3F] disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Plus className="h-4 w-4" />
                                )}
                                Add Extra Bed
                            </button>
                            {extraBedInfo && extraBedInfo.currentBeds > 0 && (
                                <button
                                    onClick={() => handleRemoveBed(1)}
                                    disabled={submitting}
                                    className="flex-1 rounded-lg border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                    Remove 1 Bed
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* History */}
            {extraBedInfo && extraBedInfo.history.length > 0 && (
                <div className="rounded-xl border bg-white p-6">
                    <h3 className="text-lg font-semibold mb-4">History</h3>
                    <div className="space-y-3">
                        {extraBedInfo.history.map((entry) => (
                            <div
                                key={entry.id}
                                className={cn(
                                    "p-4 rounded-lg border",
                                    entry.removedAt ? "bg-gray-50 border-gray-200" : "bg-green-50 border-green-200"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {entry.removedAt ? (
                                            <Trash2 className="h-4 w-4 text-gray-500" />
                                        ) : (
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                        )}
                                        <span className="font-medium text-gray-900">
                                            {entry.quantity} bed{entry.quantity > 1 ? "s" : ""}
                                        </span>
                                    </div>
                                    <span className="font-medium text-[#E17055]">
                                        {formatCurrency(entry.chargeAmount)}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                    {entry.removedAt ? "Removed" : "Added"} on{" "}
                                    {formatDate(entry.addedAt, "long")}
                                </p>
                                {entry.notes && <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Cannot Modify Warning */}
            {!canModify && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-6">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="h-6 w-6 text-orange-600" />
                        <div>
                            <p className="font-medium text-orange-900">Cannot Modify Extra Beds</p>
                            <p className="text-sm text-orange-700">
                                Extra beds can only be modified for confirmed or checked-in bookings.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
