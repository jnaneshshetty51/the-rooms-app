"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { cn } from "@the-rooms/ui";
import { Loader2, ArrowLeft, FileText, Plus, Bed, ShoppingBag, AlertCircle } from "lucide-react";
import { formatDate, formatCurrency } from "@the-rooms/ui";

interface Booking {
    id: string;
    bookingNumber: string;
    status: string;
    checkIn: string;
    checkOut: string;
    totalAmount: string;
    guest: { name: string; phone: string; companyName?: string };
    room: { roomNumber: string; type: string };
}

interface Folio {
    id: string;
    folioNumber: string;
    type: "GUEST" | "COMPANY" | "SERVICE";
    status: string;
    charges: Array<{
        id: string;
        description: string;
        amount: string;
        chargeDate: string;
        category: string;
    }>;
    payments: Array<{
        id: string;
        amount: string;
        method: string;
        paymentDate: string;
    }>;
    subtotal: number;
    taxes: number;
    total: number;
    balanceDue: number;
}

interface FolioSummary {
    booking: Booking;
    folios: Folio[];
    defaultFolio: Folio;
    totalCharges: number;
    totalPayments: number;
    grandTotal: number;
}

export default function FoliosPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [folioSummary, setFolioSummary] = useState<FolioSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        fetchFolioSummary();
    }, [id]);

    async function fetchFolioSummary() {
        setLoading(true);
        try {
            const res = await fetch(`/api/bookings/${id}/folios`);
            if (!res.ok) {
                // If folios API doesn't exist, fetch booking and build basic folio
                const bookingRes = await fetch(`/api/bookings/${id}`);
                if (!bookingRes.ok) throw new Error("Booking not found");
                const booking = await bookingRes.json();
                setFolioSummary({
                    booking,
                    folios: [],
                    defaultFolio: {
                        id: "default",
                        folioNumber: `FOLIO-${booking.bookingNumber}`,
                        type: "GUEST",
                        status: "OPEN",
                        charges: [],
                        payments: booking.payments || [],
                        subtotal: Number(booking.totalAmount),
                        taxes: 0,
                        total: Number(booking.totalAmount),
                        balanceDue: Number(booking.totalAmount),
                    },
                    totalCharges: Number(booking.totalAmount),
                    totalPayments: 0,
                    grandTotal: Number(booking.totalAmount),
                });
                return;
            }
            const data = await res.json();
            setFolioSummary(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#E17055]" />
            </div>
        );
    }

    if (error || !folioSummary) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-gray-900 font-medium">{error || "Unable to load folios"}</p>
                    <Link href={`/bookings/${id}`} className="mt-4 text-[#E17055] hover:underline">
                        Back
                    </Link>
                </div>
            </div>
        );
    }

    const { booking, folios, defaultFolio, totalCharges, totalPayments, grandTotal } = folioSummary;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href={`/bookings/${id}`}
                        className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Guest Folios</h2>
                        <p className="text-gray-500">
                            Booking #{booking.bookingNumber} • Room {booking.room.roomNumber}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#E17055] px-4 py-2 text-sm font-medium text-white hover:bg-[#D35B3F]"
                >
                    <Plus className="h-4 w-4" />
                    Create Folio
                </button>
            </div>

            {/* Booking Summary */}
            <div className="rounded-xl border bg-white p-6">
                <h3 className="text-lg font-semibold mb-4">Booking Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                        <p className="font-medium text-gray-900">{formatDate(booking.checkIn, "short")}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Check-out</p>
                        <p className="font-medium text-gray-900">{formatDate(booking.checkOut, "short")}</p>
                    </div>
                </div>
            </div>

            {/* Folios List */}
            <div className="space-y-4">
                {/* Default/Guest Folio */}
                <div className="rounded-xl border bg-white p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-blue-100 p-2">
                                <FileText className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">
                                    {defaultFolio.folioNumber}
                                </h3>
                                <p className="text-sm text-gray-500">Guest Folio (Default)</p>
                            </div>
                        </div>
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                            {defaultFolio.status}
                        </span>
                    </div>

                    {/* Room Charges */}
                    <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Bed className="h-4 w-4" /> Room Charges
                        </h4>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <span className="font-medium">Room Rate</span>
                                    <p className="text-xs text-gray-500">
                                        {formatDate(booking.checkIn, "short")} - {formatDate(booking.checkOut, "short")}
                                    </p>
                                </div>
                                <span className="font-medium">{formatCurrency(Number(booking.totalAmount))}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payments */}
                    {defaultFolio.payments.length > 0 && (
                        <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Payments</h4>
                            <div className="space-y-2">
                                {defaultFolio.payments.map((payment) => (
                                    <div
                                        key={payment.id}
                                        className="flex justify-between items-center p-3 bg-green-50 rounded-lg"
                                    >
                                        <div>
                                            <span className="font-medium text-green-700">
                                                {payment.method.replace("_", " ")}
                                            </span>
                                            <p className="text-xs text-green-600">
                                                {formatDate(payment.paymentDate, "short")}
                                            </p>
                                        </div>
                                        <span className="font-medium text-green-700">
                                            -{formatCurrency(Number(payment.amount))}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Folio Total */}
                    <div className="border-t border-gray-200 pt-4">
                        <div className="flex justify-between items-center p-4 bg-[#E17055]/5 rounded-lg">
                            <span className="font-semibold text-gray-900">Balance Due</span>
                            <span className="text-xl font-bold text-[#E17055]">
                                {formatCurrency(defaultFolio.balanceDue)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Additional Folios */}
                {folios.map((folio) => (
                    <div key={folio.id} className="rounded-xl border bg-white p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-purple-100 p-2">
                                    <FileText className="h-5 w-5 text-purple-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">{folio.folioNumber}</h3>
                                    <p className="text-sm text-gray-500">
                                        {folio.type === "COMPANY" ? "Company" : "Service"} Folio
                                    </p>
                                </div>
                            </div>
                            <span
                                className={cn(
                                    "rounded-full px-3 py-1 text-xs font-medium",
                                    folio.status === "OPEN"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-green-100 text-green-700"
                                )}
                            >
                                {folio.status}
                            </span>
                        </div>

                        {folio.charges.length > 0 && (
                            <div className="mb-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <ShoppingBag className="h-4 w-4" /> Charges
                                </h4>
                                <div className="space-y-2">
                                    {folio.charges.map((charge) => (
                                        <div
                                            key={charge.id}
                                            className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                                        >
                                            <div>
                                                <span className="font-medium">{charge.description}</span>
                                                <p className="text-xs text-gray-500">
                                                    {charge.category} • {formatDate(charge.chargeDate, "short")}
                                                </p>
                                            </div>
                                            <span className="font-medium">{formatCurrency(Number(charge.amount))}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="border-t border-gray-200 pt-4">
                            <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg">
                                <span className="font-semibold text-gray-900">Balance Due</span>
                                <span className="text-xl font-bold text-purple-700">
                                    {formatCurrency(folio.balanceDue)}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Grand Total Summary */}
            <div className="rounded-xl border border-gray-300 bg-white p-6">
                <h3 className="text-lg font-semibold mb-4">Summary</h3>
                <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Charges</span>
                        <span className="font-medium">{formatCurrency(totalCharges)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Payments</span>
                        <span className="font-medium text-green-600">
                            -{formatCurrency(totalPayments)}
                        </span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg border-t border-gray-200 pt-3">
                        <span>Grand Total</span>
                        <span className="text-[#E17055]">{formatCurrency(grandTotal)}</span>
                    </div>
                </div>
            </div>

            {/* Create Folio Modal */}
            {showCreateModal && (
                <CreateFolioModal
                    bookingId={id}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        fetchFolioSummary();
                    }}
                />
            )}
        </div>
    );
}

function CreateFolioModal({
    bookingId,
    onClose,
    onSuccess,
}: {
    bookingId: string;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [folioType, setFolioType] = useState<"GUEST" | "COMPANY" | "SERVICE">("SERVICE");
    const [name, setName] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const res = await fetch(`/api/bookings/${bookingId}/folios`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: folioType,
                    name: name || undefined,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create folio");
            }

            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create folio");
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
                <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Create New Folio</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        ✕
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Folio Type
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {(["GUEST", "COMPANY", "SERVICE"] as const).map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setFolioType(type)}
                                    className={cn(
                                        "p-3 rounded-lg border-2 text-center text-sm font-medium transition-all",
                                        folioType === type
                                            ? "border-[#E17055] bg-[#E17055]/5 text-[#E17055]"
                                            : "border-gray-200 text-gray-600"
                                    )}
                                >
                                    {type === "GUEST" && "Guest"}
                                    {type === "COMPANY" && "Company"}
                                    {type === "SERVICE" && "Service"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {(folioType === "COMPANY" || folioType === "SERVICE") && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {folioType === "COMPANY" ? "Company Name" : "Service Name"} *
                            </label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                                placeholder={folioType === "COMPANY" ? "Company name" : "Service description"}
                            />
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-lg border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 rounded-lg bg-[#E17055] py-3 text-sm font-medium text-white hover:bg-[#D35B3F] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            Create Folio
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
