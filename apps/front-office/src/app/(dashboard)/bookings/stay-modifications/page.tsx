"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Clock, CheckCircle, XCircle, AlertCircle, ArrowLeft, User, Calendar, Bed } from "lucide-react";
import { formatDate, formatCurrency } from "@the-rooms/ui";

interface StayModificationRequest {
    id: string;
    type: string;
    status: string;
    originalCheckIn: string;
    originalCheckOut: string;
    requestedCheckIn?: string;
    requestedCheckOut?: string;
    reason?: string;
    notes?: string;
    extraChargeAmount: number;
    chargeDescription?: string;
    createdAt: string;
    booking: {
        id: string;
        bookingNumber: string;
        status: string;
        checkIn: string;
        checkOut: string;
        guest: {
            id: string;
            name: string;
            phone: string;
        };
        room: {
            id: string;
            roomNumber: string;
            type: string;
        };
    };
}

interface StayModificationPolicy {
    earlyCheckinEnabled: boolean;
    earlyCheckinCutoffHour: number;
    earlyCheckinChargeType: string;
    lateCheckoutEnabled: boolean;
    lateCheckoutCutoffHour: number;
    lateCheckoutChargeType: string;
    lateCheckoutMaxHour: number;
}

export default function StayModificationsPage() {
    const [requests, setRequests] = useState<StayModificationRequest[]>([]);
    const [policy, setPolicy] = useState<StayModificationPolicy | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionModalOpen, setActionModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<StayModificationRequest | null>(null);
    const [actionType, setActionType] = useState<"APPROVE" | "REJECT">("APPROVE");
    const [rejectionReason, setRejectionReason] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchRequests();
    }, []);

    async function fetchRequests() {
        try {
            const res = await fetch("/api/stay-modifications/pending");
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to fetch requests");
            }
            const data = await res.json();
            setRequests(data.requests);
            setPolicy(data.policy);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }

    const handleApprove = (request: StayModificationRequest) => {
        setSelectedRequest(request);
        setActionType("APPROVE");
        setRejectionReason("");
        setActionModalOpen(true);
    };

    const handleReject = (request: StayModificationRequest) => {
        setSelectedRequest(request);
        setActionType("REJECT");
        setRejectionReason("");
        setActionModalOpen(true);
    };

    const handleSubmitAction = async () => {
        if (!selectedRequest) return;
        setSubmitting(true);
        try {
            const body: Record<string, unknown> = {
                action: actionType,
            };

            if (actionType === "REJECT" && rejectionReason) {
                body.rejectionReason = rejectionReason;
            }

            const res = await fetch(`/api/bookings/${selectedRequest.booking.id}/stay-modification/${selectedRequest.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                setActionModalOpen(false);
                fetchRequests();
                alert(actionType === "APPROVE" ? "Request approved" : "Request rejected");
            } else {
                const data = await res.json();
                alert(data.error || "Failed to process request");
            }
        } catch (err) {
            alert("An error occurred");
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

    if (error) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-gray-900 font-medium">{error}</p>
                    <button onClick={fetchRequests} className="mt-4 text-[#E17055] hover:underline">
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/bookings" className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50">
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                    </Link>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Stay Modification Requests</h2>
                        <p className="text-gray-500">Manage early check-in and late check-out requests</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                        {requests.length} Pending
                    </span>
                </div>
            </div>

            {policy && (
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Policy Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">Early Check-in:</span>
                            <span className={`font-medium ${policy.earlyCheckinEnabled ? "text-green-600" : "text-red-600"}`}>
                                {policy.earlyCheckinEnabled ? "Enabled" : "Disabled"}
                            </span>
                            {policy.earlyCheckinEnabled && (
                                <span className="text-gray-500"> (Free before {policy.earlyCheckinCutoffHour}:00, {policy.earlyCheckinChargeType} charge)</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">Late Check-out:</span>
                            <span className={`font-medium ${policy.lateCheckoutEnabled ? "text-green-600" : "text-red-600"}`}>
                                {policy.lateCheckoutEnabled ? "Enabled" : "Disabled"}
                            </span>
                            {policy.lateCheckoutEnabled && (
                                <span className="text-gray-500"> (Free until {policy.lateCheckoutCutoffHour}:00, {policy.lateCheckoutChargeType} charge, max {policy.lateCheckoutMaxHour}:00)</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {requests.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                    <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Requests</h3>
                    <p className="text-gray-500">All stay modification requests have been processed.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map((request) => (
                        <div key={request.id} className="rounded-xl border border-gray-200 bg-white p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <div className={`rounded-full p-3 ${request.type === "EARLY_CHECKIN" ? "bg-blue-100" : "bg-purple-100"}`}>
                                        <Clock className={`h-6 w-6 ${request.type === "EARLY_CHECKIN" ? "text-blue-600" : "text-purple-600"}`} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {request.type === "EARLY_CHECKIN" ? "Early Check-in" : "Late Check-out"} Request
                                            </h3>
                                            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                                                Pending
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Booking #{request.booking.bookingNumber} • Requested {formatDate(request.createdAt, "short")}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleApprove(request)}
                                        className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                                    >
                                        <CheckCircle className="h-4 w-4" /> Approve
                                    </button>
                                    <button
                                        onClick={() => handleReject(request)}
                                        className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                                    >
                                        <XCircle className="h-4 w-4" /> Reject
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                    <User className="h-5 w-5 text-gray-400" />
                                    <div>
                                        <p className="text-xs text-gray-500">Guest</p>
                                        <p className="font-medium text-gray-900">{request.booking.guest.name}</p>
                                        <p className="text-xs text-gray-500">{request.booking.guest.phone}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                    <Bed className="h-5 w-5 text-gray-400" />
                                    <div>
                                        <p className="text-xs text-gray-500">Room</p>
                                        <p className="font-medium text-gray-900">{request.booking.room.roomNumber}</p>
                                        <p className="text-xs text-gray-500">{request.booking.room.type}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                    <Calendar className="h-5 w-5 text-gray-400" />
                                    <div>
                                        <p className="text-xs text-gray-500">Original Stay</p>
                                        <p className="font-medium text-gray-900">
                                            {formatDate(request.originalCheckIn, "short")} - {formatDate(request.originalCheckOut, "short")}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {request.requestedCheckIn && (
                                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <p className="text-sm text-blue-700">
                                        <strong>Requested Check-in:</strong> {formatDate(request.requestedCheckIn, "full")}
                                    </p>
                                </div>
                            )}

                            {request.requestedCheckOut && (
                                <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                                    <p className="text-sm text-purple-700">
                                        <strong>Requested Check-out:</strong> {formatDate(request.requestedCheckOut, "full")}
                                    </p>
                                </div>
                            )}

                            {request.reason && (
                                <div className="mt-3">
                                    <p className="text-sm text-gray-500">Reason:</p>
                                    <p className="text-gray-900">{request.reason}</p>
                                </div>
                            )}

                            {request.notes && (
                                <div className="mt-2">
                                    <p className="text-sm text-gray-500">Notes:</p>
                                    <p className="text-gray-700">{request.notes}</p>
                                </div>
                            )}

                            {request.extraChargeAmount > 0 && (
                                <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-medium text-orange-700">Extra Charge</p>
                                            <p className="text-xs text-orange-600">{request.chargeDescription}</p>
                                        </div>
                                        <p className="text-xl font-bold text-orange-600">{formatCurrency(request.extraChargeAmount)}</p>
                                    </div>
                                </div>
                            )}

                            <div className="mt-4 flex justify-end">
                                <Link
                                    href={`/bookings/${request.booking.id}`}
                                    className="text-sm text-[#E17055] hover:underline"
                                >
                                    View Booking Details →
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {actionModalOpen && selectedRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
                        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {actionType === "APPROVE" ? "Approve Request" : "Reject Request"}
                            </h3>
                            <button onClick={() => setActionModalOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="rounded-lg bg-gray-50 p-4">
                                <p className="text-sm text-gray-500">Booking</p>
                                <p className="font-medium text-gray-900">#{selectedRequest.booking.bookingNumber}</p>
                                <p className="text-sm text-gray-700">{selectedRequest.booking.guest.name}</p>
                                <p className="text-sm text-gray-500">Room {selectedRequest.booking.room.roomNumber}</p>
                            </div>

                            <div className="rounded-lg bg-gray-50 p-4">
                                <p className="text-sm text-gray-500">Request Type</p>
                                <p className="font-medium text-gray-900">
                                    {selectedRequest.type === "EARLY_CHECKIN" ? "Early Check-in" : "Late Check-out"}
                                </p>
                            </div>

                            {actionType === "APPROVE" && selectedRequest.extraChargeAmount > 0 && (
                                <div className="rounded-lg bg-orange-50 p-4 border border-orange-200">
                                    <p className="text-sm text-orange-700">Extra charge will be applied:</p>
                                    <p className="text-xl font-bold text-orange-600">{formatCurrency(selectedRequest.extraChargeAmount)}</p>
                                    <p className="text-xs text-orange-600">{selectedRequest.chargeDescription}</p>
                                </div>
                            )}

                            {actionType === "REJECT" && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason</label>
                                    <textarea
                                        rows={3}
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="Reason for rejection (optional)"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                                    />
                                </div>
                            )}

                            <div className="pt-4 flex gap-3">
                                <button
                                    onClick={() => setActionModalOpen(false)}
                                    className="flex-1 rounded-lg border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmitAction}
                                    disabled={submitting}
                                    className={`flex-1 rounded-lg py-3 text-sm font-medium text-white disabled:opacity-50 ${actionType === "APPROVE"
                                            ? "bg-green-600 hover:bg-green-700"
                                            : "bg-red-600 hover:bg-red-700"
                                        }`}
                                >
                                    {submitting ? (
                                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                    ) : actionType === "APPROVE" ? (
                                        "Approve"
                                    ) : (
                                        "Reject"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
