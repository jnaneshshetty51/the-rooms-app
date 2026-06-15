"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { cn } from "@the-rooms/ui";
import { Loader2, ArrowLeft, Building2, AlertCircle, CheckCircle, XCircle, Search } from "lucide-react";
import { formatDate, formatCurrency } from "@the-rooms/ui";

interface Booking {
    id: string;
    bookingNumber: string;
    status: string;
    checkIn: string;
    checkOut: string;
    guest: { name: string; phone: string; companyName?: string };
    room: { roomNumber: string; type: string };
}

interface CorporateBillingInfo {
    hasCorporateBilling: boolean;
    corporateAccount?: {
        id: string;
        companyName: string;
        billingType: string;
        creditLimit: number;
        creditUsed: number;
        creditAvailable: number;
        isActive: boolean;
    };
    notes?: string;
    assignedAt?: string;
    assignedBy?: { name: string };
}

interface CorporateAccount {
    id: string;
    companyName: string;
    billingType: string;
    creditLimit: number;
    creditUsed: number;
    creditAvailable: number;
    isActive: boolean;
}

export default function CorporateBillingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [booking, setBooking] = useState<Booking | null>(null);
    const [billingInfo, setBillingInfo] = useState<CorporateBillingInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<CorporateAccount[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<CorporateAccount | null>(null);
    const [notes, setNotes] = useState("");
    const [removeReason, setRemoveReason] = useState("");

    useEffect(() => {
        fetchData();
    }, [id]);

    async function fetchData() {
        setLoading(true);
        try {
            const [bookingRes, billingRes] = await Promise.all([
                fetch(`/api/bookings/${id}`),
                fetch(`/api/bookings/${id}/corporate-billing`),
            ]);

            if (!bookingRes.ok) throw new Error("Booking not found");
            if (!billingRes.ok) throw new Error("Failed to fetch billing info");

            const bookingData = await bookingRes.json();
            const billingData = await billingRes.json();

            setBooking(bookingData);
            setBillingInfo(billingData);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setSearching(true);
        try {
            const res = await fetch(`/api/corporate-accounts/search?q=${encodeURIComponent(searchQuery)}`);
            if (res.ok) {
                const data = await res.json();
                setSearchResults(data.accounts || []);
            }
        } catch (err) {
            console.error("Search error:", err);
        } finally {
            setSearching(false);
        }
    };

    const handleAssign = async () => {
        if (!selectedAccount) return;

        setSubmitting(true);
        try {
            const res = await fetch(`/api/bookings/${id}/corporate-billing`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    corporateAccountId: selectedAccount.id,
                    billingType: selectedAccount.billingType,
                    notes: notes || undefined,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to assign corporate billing");
            }

            fetchData();
            setShowAssignModal(false);
            setSelectedAccount(null);
            setNotes("");
            setSearchQuery("");
            setSearchResults([]);
            alert("Corporate billing assigned successfully");
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to assign corporate billing");
        } finally {
            setSubmitting(false);
        }
    };

    const handleRemove = async () => {
        if (!confirm("Are you sure you want to remove corporate billing from this booking?")) return;

        setSubmitting(true);
        try {
            const res = await fetch(`/api/bookings/${id}/corporate-billing`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: removeReason || undefined }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to remove corporate billing");
            }

            fetchData();
            setRemoveReason("");
            alert("Corporate billing removed successfully");
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to remove corporate billing");
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
                    <h2 className="text-2xl font-bold text-gray-900">Corporate Billing</h2>
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
                        <p className="text-sm text-gray-500">Company</p>
                        <p className="font-medium text-gray-900">{booking.guest.companyName || "N/A"}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Room</p>
                        <p className="font-medium text-gray-900">
                            {booking.room.roomNumber} ({booking.room.type})
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Stay Period</p>
                        <p className="font-medium text-gray-900">
                            {formatDate(booking.checkIn, "short")} - {formatDate(booking.checkOut, "short")}
                        </p>
                    </div>
                </div>
            </div>

            {/* Current Corporate Billing Status */}
            <div className="rounded-xl border bg-white p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Corporate Billing Status
                </h3>

                {billingInfo?.hasCorporateBilling && billingInfo.corporateAccount ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                            <div>
                                <p className="font-medium text-green-900">Corporate Billing Active</p>
                                <p className="text-sm text-green-700">
                                    Assigned on {billingInfo.assignedAt && formatDate(billingInfo.assignedAt, "long")}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-500">Company</p>
                                <p className="font-medium text-gray-900">{billingInfo.corporateAccount.companyName}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-500">Billing Type</p>
                                <p className="font-medium text-gray-900">
                                    {billingInfo.corporateAccount.billingType === "COMPANY" ? "Company" : "Individual"}
                                </p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-500">Credit Limit</p>
                                <p className="font-medium text-gray-900">
                                    {formatCurrency(billingInfo.corporateAccount.creditLimit)}
                                </p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-500">Credit Used</p>
                                <p className="font-medium text-gray-900">
                                    {formatCurrency(billingInfo.corporateAccount.creditUsed)}
                                </p>
                            </div>
                        </div>

                        <div className="p-4 bg-[#E17055]/5 rounded-lg border border-[#E17055]/20">
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900">Credit Available</span>
                                <span
                                    className={cn(
                                        "text-xl font-bold",
                                        billingInfo.corporateAccount.creditAvailable > 0
                                            ? "text-green-600"
                                            : "text-red-600"
                                    )}
                                >
                                    {formatCurrency(billingInfo.corporateAccount.creditAvailable)}
                                </span>
                            </div>
                            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full rounded-full",
                                        billingInfo.corporateAccount.creditAvailable > 0 ? "bg-green-500" : "bg-red-500"
                                    )}
                                    style={{
                                        width: `${Math.min(
                                            100,
                                            (billingInfo.corporateAccount.creditUsed /
                                                billingInfo.corporateAccount.creditLimit) *
                                            100
                                        )}%`,
                                    }}
                                />
                            </div>
                        </div>

                        {billingInfo.notes && (
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm font-medium text-gray-700 mb-1">Notes</p>
                                <p className="text-sm text-gray-600">{billingInfo.notes}</p>
                            </div>
                        )}

                        {canModify && (
                            <div className="border-t border-gray-200 pt-4">
                                <button
                                    onClick={() => setRemoveReason("")}
                                    className="w-full rounded-lg border border-red-200 py-3 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center justify-center gap-2"
                                >
                                    <XCircle className="h-4 w-4" />
                                    Remove Corporate Billing
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <AlertCircle className="h-6 w-6 text-gray-500" />
                            <div>
                                <p className="font-medium text-gray-900">No Corporate Billing</p>
                                <p className="text-sm text-gray-500">
                                    This booking is not linked to a corporate account
                                </p>
                            </div>
                        </div>

                        {canModify && (
                            <button
                                onClick={() => setShowAssignModal(true)}
                                className="w-full rounded-lg bg-[#E17055] py-3 text-sm font-medium text-white hover:bg-[#D35B3F] flex items-center justify-center gap-2"
                            >
                                <Building2 className="h-4 w-4" />
                                Assign Corporate Billing
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Cannot Modify Warning */}
            {!canModify && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-6">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="h-6 w-6 text-orange-600" />
                        <div>
                            <p className="font-medium text-orange-900">Cannot Modify Corporate Billing</p>
                            <p className="text-sm text-orange-700">
                                Corporate billing can only be modified for confirmed or checked-in bookings.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Corporate Billing Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
                        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900">Assign Corporate Billing</h3>
                            <button
                                onClick={() => {
                                    setShowAssignModal(false);
                                    setSelectedAccount(null);
                                    setSearchQuery("");
                                    setSearchResults([]);
                                }}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {!selectedAccount ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Search Company
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                                                placeholder="Search by company name..."
                                            />
                                            <button
                                                onClick={handleSearch}
                                                disabled={searching}
                                                className="px-4 py-2 rounded-lg bg-[#E17055] text-white hover:bg-[#D35B3F] disabled:opacity-50 flex items-center gap-2"
                                            >
                                                {searching ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Search className="h-4 w-4" />
                                                )}
                                                Search
                                            </button>
                                        </div>
                                    </div>

                                    {searchResults.length > 0 && (
                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                            {searchResults.map((account) => (
                                                <button
                                                    key={account.id}
                                                    onClick={() => setSelectedAccount(account)}
                                                    className="w-full p-4 text-left rounded-lg border border-gray-200 hover:border-[#E17055] hover:bg-[#E17055]/5 transition-colors"
                                                >
                                                    <p className="font-medium text-gray-900">{account.companyName}</p>
                                                    <p className="text-sm text-gray-500">
                                                        Credit: {formatCurrency(account.creditAvailable)} available of{" "}
                                                        {formatCurrency(account.creditLimit)}
                                                    </p>
                                                    <span
                                                        className={cn(
                                                            "inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-medium",
                                                            account.isActive
                                                                ? "bg-green-100 text-green-700"
                                                                : "bg-red-100 text-red-700"
                                                        )}
                                                    >
                                                        {account.isActive ? "Active" : "Inactive"}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {searchQuery && searchResults.length === 0 && !searching && (
                                        <p className="text-center text-gray-500 py-4">No companies found</p>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                        <p className="text-sm text-green-700 mb-1">Selected Company</p>
                                        <p className="font-medium text-gray-900">{selectedAccount.companyName}</p>
                                        <p className="text-sm text-gray-500">
                                            Credit: {formatCurrency(selectedAccount.creditAvailable)} available
                                        </p>
                                        <button
                                            onClick={() => setSelectedAccount(null)}
                                            className="mt-2 text-sm text-red-600 hover:underline"
                                        >
                                            Change selection
                                        </button>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                        <textarea
                                            rows={3}
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                                            placeholder="Optional notes..."
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <button
                                            onClick={() => {
                                                setShowAssignModal(false);
                                                setSelectedAccount(null);
                                                setSearchQuery("");
                                                setSearchResults([]);
                                            }}
                                            className="flex-1 rounded-lg border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleAssign}
                                            disabled={submitting}
                                            className="flex-1 rounded-lg bg-[#E17055] py-3 text-sm font-medium text-white hover:bg-[#D35B3F] disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                            Assign Billing
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
