"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@the-rooms/ui";
import {
    Loader2,
    Plus,
    Search,
    Calendar,
    CheckCircle,
    XCircle,
    Clock,
    User,
    ArrowUpRight,
    AlertCircle,
    Tag,
    Bed,
} from "lucide-react";
import { formatDate, formatCurrency } from "@the-rooms/ui";

interface PriceOverrideRequest {
    id: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "APPLIED";
    originalPrice: number;
    overriddenPrice: number;
    reason: string | null;
    effectiveFrom?: string | null;
    effectiveUntil?: string | null;
    createdAt: string;
    bookingId?: string | null;
    roomId?: string | null;
    booking?: {
        id: string;
        bookingNumber: string;
        baseAmount: string;
        totalAmount: string;
        discountAmount: string;
        guest: {
            name: string;
            phone: string;
        };
        room: {
            roomNumber: string;
            type: string;
        };
    } | null;
    room?: {
        id: string;
        roomNumber: string;
        type: string;
        floor: number;
    } | null;
    requestedBy: {
        id: string;
        name: string;
        email: string;
    };
    approvedBy?: {
        id: string;
        name: string;
        email: string;
    };
}

export default function PriceOverridesPage() {
    const [requests, setRequests] = useState<PriceOverrideRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<"all" | "PENDING" | "APPROVED" | "REJECTED" | "APPLIED">("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [actionModal, setActionModal] = useState<{
        open: boolean;
        request: PriceOverrideRequest | null;
        action: "approve" | "reject";
    }>({ open: false, request: null, action: "approve" });

    useEffect(() => {
        fetchRequests();
    }, []);

    async function fetchRequests() {
        setLoading(true);
        try {
            const res = await fetch("/api/price-overrides");
            if (res.ok) {
                const data = await res.json();
                setRequests(data.requests ?? []);
            } else {
                throw new Error("Failed to fetch price overrides");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }

    const filteredRequests = requests.filter((request) => {
        if (filter !== "all" && request.status !== filter) return false;
        if (!searchQuery) return true;
        const guestName = request.booking?.guest?.name?.toLowerCase() ?? "";
        const bookingNumber = request.booking?.bookingNumber?.toLowerCase() ?? "";
        const roomNumber = request.room?.roomNumber?.toLowerCase() ?? "";
        const query = searchQuery.toLowerCase();
        return guestName.includes(query) || bookingNumber.includes(query) || roomNumber.includes(query);
    });

    const pendingCount = requests.filter((r) => r.status === "PENDING").length;
    const approvedCount = requests.filter((r) => r.status === "APPROVED").length;
    const appliedCount = requests.filter((r) => r.status === "APPLIED").length;
    const rejectedCount = requests.filter((r) => r.status === "REJECTED").length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Price Overrides</h2>
                    <p className="text-gray-500">Manage price override requests</p>
                </div>
                <button
                    onClick={() => setShowRequestModal(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#E17055] px-4 py-2 text-sm font-medium text-white hover:bg-[#D35B3F]"
                >
                    <Plus className="h-4 w-4" />
                    Request Override
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Requests</p>
                            <p className="mt-2 text-3xl font-bold text-gray-900">{requests.length}</p>
                        </div>
                        <div className="rounded-lg bg-gray-100 p-3">
                            <Tag className="h-6 w-6 text-gray-600" />
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Pending</p>
                            <p className="mt-2 text-3xl font-bold text-orange-600">{pendingCount}</p>
                        </div>
                        <div className="rounded-lg bg-orange-100 p-3">
                            <Clock className="h-6 w-6 text-orange-600" />
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Approved</p>
                            <p className="mt-2 text-3xl font-bold text-blue-600">{approvedCount}</p>
                        </div>
                        <div className="rounded-lg bg-blue-100 p-3">
                            <CheckCircle className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Applied</p>
                            <p className="mt-2 text-3xl font-bold text-green-600">{appliedCount}</p>
                        </div>
                        <div className="rounded-lg bg-green-100 p-3">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Rejected</p>
                            <p className="mt-2 text-3xl font-bold text-red-600">{rejectedCount}</p>
                        </div>
                        <div className="rounded-lg bg-red-100 p-3">
                            <XCircle className="h-6 w-6 text-red-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 border-b border-gray-200">
                    <button
                        onClick={() => setFilter("all")}
                        className={cn(
                            "pb-3 px-1 text-sm font-medium transition-colors",
                            filter === "all"
                                ? "border-b-2 border-[#E17055] text-[#E17055]"
                                : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter("PENDING")}
                        className={cn(
                            "pb-3 px-1 text-sm font-medium transition-colors",
                            filter === "PENDING"
                                ? "border-b-2 border-[#E17055] text-[#E17055]"
                                : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        Pending
                    </button>
                    <button
                        onClick={() => setFilter("APPROVED")}
                        className={cn(
                            "pb-3 px-1 text-sm font-medium transition-colors",
                            filter === "APPROVED"
                                ? "border-b-2 border-[#E17055] text-[#E17055]"
                                : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        Approved
                    </button>
                    <button
                        onClick={() => setFilter("APPLIED")}
                        className={cn(
                            "pb-3 px-1 text-sm font-medium transition-colors",
                            filter === "APPLIED"
                                ? "border-b-2 border-[#E17055] text-[#E17055]"
                                : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        Applied
                    </button>
                    <button
                        onClick={() => setFilter("REJECTED")}
                        className={cn(
                            "pb-3 px-1 text-sm font-medium transition-colors",
                            filter === "REJECTED"
                                ? "border-b-2 border-[#E17055] text-[#E17055]"
                                : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        Rejected
                    </button>
                </div>
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by guest, booking or room..."
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent text-sm"
                    />
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[#E17055]" />
                </div>
            )}

            {/* Empty State */}
            {!loading && filteredRequests.length === 0 && (
                <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">
                    <Tag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No price override requests found</p>
                </div>
            )}

            {/* Requests List */}
            {!loading && filteredRequests.length > 0 && (
                <div className="space-y-4">
                    {filteredRequests.map((request) => (
                        <div
                            key={request.id}
                            className="rounded-xl border border-gray-200 bg-white p-6"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0">
                                        <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                                            <Tag className="h-6 w-6 text-blue-600" />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            {request.booking ? (
                                                <Link
                                                    href={`/bookings/${request.booking.id}`}
                                                    className="text-lg font-semibold text-gray-900 hover:text-[#E17055]"
                                                >
                                                    #{request.booking.bookingNumber}
                                                </Link>
                                            ) : request.room ? (
                                                <span className="text-lg font-semibold text-gray-900">
                                                    Room {request.room.roomNumber}
                                                </span>
                                            ) : (
                                                <span className="text-lg font-semibold text-gray-900">N/A</span>
                                            )}
                                            <span
                                                className={cn(
                                                    "rounded-full px-3 py-1 text-xs font-medium",
                                                    request.status === "PENDING"
                                                        ? "bg-orange-100 text-orange-700"
                                                        : request.status === "APPROVED"
                                                            ? "bg-blue-100 text-blue-700"
                                                            : request.status === "APPLIED"
                                                                ? "bg-green-100 text-green-700"
                                                                : "bg-red-100 text-red-700"
                                                )}
                                            >
                                                {request.status}
                                            </span>
                                        </div>
                                        <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                                            {request.booking?.guest && (
                                                <span className="flex items-center gap-1">
                                                    <User className="h-4 w-4" />
                                                    {request.booking.guest.name}
                                                </span>
                                            )}
                                            {request.booking?.room && (
                                                <span className="flex items-center gap-1">
                                                    <Bed className="h-4 w-4" />
                                                    Room {request.booking.room.roomNumber}
                                                </span>
                                            )}
                                            {request.room && (
                                                <span className="flex items-center gap-1">
                                                    <Bed className="h-4 w-4" />
                                                    Room {request.room.roomNumber} ({request.room.type})
                                                </span>
                                            )}
                                        </div>
                                        {request.reason && (
                                            <p className="mt-2 text-sm text-gray-600">
                                                <span className="font-medium">Reason:</span> {request.reason}
                                            </p>
                                        )}
                                        {(request.effectiveFrom || request.effectiveUntil) && (
                                            <p className="mt-1 text-xs text-gray-500">
                                                Effective: {request.effectiveFrom ? formatDate(request.effectiveFrom, "short") : "Now"} -{" "}
                                                {request.effectiveUntil ? formatDate(request.effectiveUntil, "short") : "Until cancelled"}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-400 line-through">
                                            {formatCurrency(request.originalPrice)}
                                        </span>
                                        <ArrowUpRight className="h-4 w-4 text-gray-400" />
                                        <span className="text-xl font-bold text-blue-600">
                                            {formatCurrency(request.overriddenPrice)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Requested by {request.requestedBy?.name ?? "Unknown"}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {formatDate(request.createdAt, "short")}
                                    </p>
                                </div>
                            </div>

                            {/* Actions for pending requests */}
                            {request.status === "PENDING" && (
                                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                    <div className="text-sm text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-4 w-4" />
                                            Awaiting approval
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() =>
                                                setActionModal({ open: true, request, action: "approve" })
                                            }
                                            className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                                        >
                                            <CheckCircle className="h-4 w-4" />
                                            Approve
                                        </button>
                                        <button
                                            onClick={() =>
                                                setActionModal({ open: true, request, action: "reject" })
                                            }
                                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                                        >
                                            <XCircle className="h-4 w-4" />
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Show approver info for approved/rejected requests */}
                            {request.status !== "PENDING" && request.approvedBy && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <p className="text-xs text-gray-500">
                                        {request.status === "APPROVED" ? "Approved" : request.status === "APPLIED" ? "Applied" : "Rejected"} by{" "}
                                        {request.approvedBy.name} on {formatDate(request.createdAt, "short")}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Request Override Modal */}
            {showRequestModal && (
                <RequestPriceOverrideModal
                    onClose={() => setShowRequestModal(false)}
                    onSuccess={() => {
                        setShowRequestModal(false);
                        fetchRequests();
                    }}
                />
            )}

            {/* Approve/Reject Modal */}
            {actionModal.open && actionModal.request && (
                <ApproveRejectModal
                    request={actionModal.request}
                    action={actionModal.action}
                    onClose={() => setActionModal({ open: false, request: null, action: "approve" })}
                    onSuccess={() => {
                        setActionModal({ open: false, request: null, action: "approve" });
                        fetchRequests();
                    }}
                />
            )}
        </div>
    );
}

function RequestPriceOverrideModal({
    onClose,
    onSuccess,
}: {
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [bookingId, setBookingId] = useState("");
    const [roomId, setRoomId] = useState("");
    const [originalPrice, setOriginalPrice] = useState("");
    const [overriddenPrice, setOverriddenPrice] = useState("");
    const [reason, setReason] = useState("");
    const [effectiveFrom, setEffectiveFrom] = useState("");
    const [effectiveUntil, setEffectiveUntil] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const body: Record<string, unknown> = {
                originalPrice: parseFloat(originalPrice),
                overriddenPrice: parseFloat(overriddenPrice),
                reason,
            };

            if (bookingId) {
                body.bookingId = bookingId;
            } else if (roomId) {
                body.roomId = roomId;
            }

            if (effectiveFrom) {
                body.effectiveFrom = new Date(effectiveFrom).toISOString();
            }
            if (effectiveUntil) {
                body.effectiveUntil = new Date(effectiveUntil).toISOString();
            }

            const res = await fetch("/api/price-overrides", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to request price override");
            }

            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to request price override");
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
                <div className="border-b border-gray-200 px-6 py-4">
                    <h3 className="text-lg font-semibold text-gray-900">Request Price Override</h3>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Booking ID (Optional - if for a specific booking)
                        </label>
                        <input
                            type="text"
                            value={bookingId}
                            onChange={(e) => {
                                setBookingId(e.target.value);
                                if (e.target.value) setRoomId("");
                            }}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                            placeholder="Enter booking ID"
                        />
                    </div>

                    <div className="text-center text-gray-400 text-sm">OR</div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Room ID (Optional - if for a room type/rate)
                        </label>
                        <input
                            type="text"
                            value={roomId}
                            onChange={(e) => {
                                setRoomId(e.target.value);
                                if (e.target.value) setBookingId("");
                            }}
                            disabled={!!bookingId}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent disabled:bg-gray-100"
                            placeholder="Enter room ID"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Original Price (₹) *
                        </label>
                        <input
                            type="number"
                            value={originalPrice}
                            onChange={(e) => setOriginalPrice(e.target.value)}
                            required
                            min="0"
                            step="1"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                            placeholder="e.g. 5000"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Overridden Price (₹) *
                        </label>
                        <input
                            type="number"
                            value={overriddenPrice}
                            onChange={(e) => setOverriddenPrice(e.target.value)}
                            required
                            min="0"
                            step="1"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                            placeholder="e.g. 4500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Reason *
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            required
                            rows={2}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                            placeholder="Explain why this price override is needed..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Effective From (Optional)
                            </label>
                            <input
                                type="date"
                                value={effectiveFrom}
                                onChange={(e) => setEffectiveFrom(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Effective Until (Optional)
                            </label>
                            <input
                                type="date"
                                value={effectiveUntil}
                                onChange={(e) => setEffectiveUntil(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                            />
                        </div>
                    </div>

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
                            Submit Request
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ApproveRejectModal({
    request,
    action,
    onClose,
    onSuccess,
}: {
    request: PriceOverrideRequest;
    action: "approve" | "reject";
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [finalOverriddenPrice, setFinalOverriddenPrice] = useState(
        request.overriddenPrice.toString()
    );
    const [notes, setNotes] = useState("");
    const [rejectionReason, setRejectionReason] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const endpoint =
                action === "approve"
                    ? `/api/price-overrides/${request.id}/approve`
                    : `/api/price-overrides/${request.id}/reject`;

            const body =
                action === "approve"
                    ? {
                        finalOverriddenPrice:
                            action === "approve" ? parseFloat(finalOverriddenPrice) : undefined,
                        notes: notes || undefined,
                    }
                    : { rejectionReason: rejectionReason || undefined };

            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || `Failed to ${action} price override`);
            }

            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : `Failed to ${action} price override`);
            setSubmitting(false);
        }
    };

    const priceDiff = parseFloat(finalOverriddenPrice) - request.originalPrice;
    const percentChange = ((priceDiff / request.originalPrice) * 100).toFixed(1);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
                <div className="border-b border-gray-200 px-6 py-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {action === "approve" ? "Approve" : "Reject"} Price Override
                    </h3>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Request Summary */}
                    <div className="rounded-lg bg-gray-50 p-4">
                        {request.booking && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Booking</span>
                                <Link
                                    href={`/bookings/${request.booking.id}`}
                                    className="text-sm font-medium text-[#E17055] hover:underline"
                                >
                                    #{request.booking.bookingNumber}
                                </Link>
                            </div>
                        )}
                        {request.room && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Room</span>
                                <span className="text-sm font-medium text-gray-900">
                                    Room {request.room.roomNumber}
                                </span>
                            </div>
                        )}
                        {request.booking?.guest && (
                            <div className="flex justify-between items-center mt-2">
                                <span className="text-sm text-gray-600">Guest</span>
                                <span className="text-sm font-medium text-gray-900">
                                    {request.booking.guest.name}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between items-center mt-2">
                            <span className="text-sm text-gray-600">Original Price</span>
                            <span className="text-sm font-medium text-gray-900 line-through">
                                {formatCurrency(request.originalPrice)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                            <span className="text-sm text-gray-600">Requested Price</span>
                            <span className="text-sm font-bold text-blue-600">
                                {formatCurrency(request.overriddenPrice)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                            <span className="text-sm text-gray-600">Change</span>
                            <span
                                className={cn(
                                    "text-sm font-medium",
                                    priceDiff > 0 ? "text-red-600" : priceDiff < 0 ? "text-green-600" : "text-gray-600"
                                )}
                            >
                                {priceDiff > 0 ? "+" : ""}
                                {formatCurrency(priceDiff)} ({percentChange}%)
                            </span>
                        </div>
                        {request.reason && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                                <span className="text-sm text-gray-600">Reason:</span>
                                <p className="text-sm text-gray-700 mt-1">{request.reason}</p>
                            </div>
                        )}
                    </div>

                    {action === "approve" ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Final Overridden Price (₹) *
                                </label>
                                <input
                                    type="number"
                                    value={finalOverriddenPrice}
                                    onChange={(e) => setFinalOverriddenPrice(e.target.value)}
                                    required
                                    min="0"
                                    step="1"
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    You can adjust this to a different value if needed
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Notes (Optional)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={2}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                                    placeholder="Any notes about this approval..."
                                />
                            </div>
                        </>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Reason for Rejection (Optional)
                            </label>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                rows={2}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                                placeholder="Explain why this request is being rejected..."
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
                            className={cn(
                                "flex-1 rounded-lg py-3 text-sm font-medium text-white disabled:opacity-50 flex items-center justify-center gap-2",
                                action === "approve"
                                    ? "bg-green-600 hover:bg-green-700"
                                    : "bg-red-600 hover:bg-red-700"
                            )}
                        >
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {action === "approve" ? "Approve" : "Reject"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
