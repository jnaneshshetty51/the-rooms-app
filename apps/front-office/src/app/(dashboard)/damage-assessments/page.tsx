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
    AlertTriangle,
    Trash2,
    Edit,
    Eye,
    DollarSign,
    Image,
    X,
    FileText,
    ChevronDown,
} from "lucide-react";
import { formatDate, formatCurrency } from "@the-rooms/ui";
import { Badge } from "@the-rooms/ui";

interface DamageAssessment {
    id: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "ADDED_TO_FOLIO";
    type: string;
    description: string;
    amount: string;
    photos: string[];
    notes?: string;
    createdAt: string;
    updatedAt: string;
    booking: {
        id: string;
        bookingNumber: string;
        checkIn: string;
        checkOut: string;
        guest: {
            name: string;
            phone: string;
        };
        room: {
            roomNumber: string;
            type: string;
        };
    };
    assessedBy?: {
        id: string;
        name: string;
    };
    approvedBy?: {
        id: string;
        name: string;
    };
}

export default function DamageAssessmentsPage() {
    const [assessments, setAssessments] = useState<DamageAssessment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<"all" | "PENDING" | "APPROVED" | "REJECTED" | "ADDED_TO_FOLIO">("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedAssessment, setSelectedAssessment] = useState<DamageAssessment | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [actionModal, setActionModal] = useState<{
        open: boolean;
        assessment: DamageAssessment | null;
        action: "approve" | "reject" | "add_to_folio";
    }>({ open: false, assessment: null, action: "approve" });

    useEffect(() => {
        fetchAssessments();
    }, []);

    async function fetchAssessments() {
        setLoading(true);
        try {
            const res = await fetch("/api/damage-assessments");
            if (res.ok) {
                const data = await res.json();
                setAssessments(data.assessments ?? []);
            } else {
                throw new Error("Failed to fetch damage assessments");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }

    const filteredAssessments = assessments.filter((assessment) => {
        if (filter !== "all" && assessment.status !== filter) return false;
        if (!searchQuery) return true;
        const guestName = assessment.booking?.guest?.name?.toLowerCase() ?? "";
        const bookingNumber = assessment.booking?.bookingNumber?.toLowerCase() ?? "";
        const roomNumber = assessment.booking?.room?.roomNumber?.toLowerCase() ?? "";
        const query = searchQuery.toLowerCase();
        return guestName.includes(query) || bookingNumber.includes(query) || roomNumber.includes(query);
    });

    const pendingCount = assessments.filter((a) => a.status === "PENDING").length;
    const approvedCount = assessments.filter((a) => a.status === "APPROVED").length;
    const rejectedCount = assessments.filter((a) => a.status === "REJECTED").length;
    const addedToFolioCount = assessments.filter((a) => a.status === "ADDED_TO_FOLIO").length;

    const totalAmount = filteredAssessments
        .filter((a) => a.status === "APPROVED" || a.status === "ADDED_TO_FOLIO")
        .reduce((sum, a) => sum + Number(a.amount), 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Damage Assessments</h2>
                    <p className="text-gray-500">Track and manage room damage charges</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#E17055] px-4 py-2 text-sm font-medium text-white hover:bg-[#D35B3F]"
                >
                    <Plus className="h-4 w-4" />
                    New Assessment
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total</p>
                            <p className="mt-2 text-3xl font-bold text-gray-900">{assessments.length}</p>
                        </div>
                        <div className="rounded-lg bg-gray-100 p-3">
                            <AlertTriangle className="h-6 w-6 text-gray-600" />
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
                            <p className="mt-2 text-3xl font-bold text-green-600">{approvedCount}</p>
                        </div>
                        <div className="rounded-lg bg-green-100 p-3">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Added to Folio</p>
                            <p className="mt-2 text-3xl font-bold text-blue-600">{addedToFolioCount}</p>
                        </div>
                        <div className="rounded-lg bg-blue-100 p-3">
                            <DollarSign className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Amount</p>
                            <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
                        </div>
                        <div className="rounded-lg bg-purple-100 p-3">
                            <DollarSign className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 border-b border-gray-200 flex-wrap">
                    {(["all", "PENDING", "APPROVED", "ADDED_TO_FOLIO", "REJECTED"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "pb-3 px-1 text-sm font-medium transition-colors capitalize",
                                filter === f
                                    ? "border-b-2 border-[#E17055] text-[#E17055]"
                                    : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            {f === "all" ? "All" : f.replace("_", " ")}
                        </button>
                    ))}
                </div>
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by guest, booking, or room..."
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
            {!loading && filteredAssessments.length === 0 && (
                <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">
                    <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No damage assessments found</p>
                </div>
            )}

            {/* Assessments List */}
            {!loading && filteredAssessments.length > 0 && (
                <div className="space-y-4">
                    {filteredAssessments.map((assessment) => (
                        <div
                            key={assessment.id}
                            className="rounded-xl border border-gray-200 bg-white p-6 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0">
                                        <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                                            <AlertTriangle className="h-6 w-6 text-red-600" />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <Link
                                                href={`/bookings/${assessment.booking.id}`}
                                                className="text-lg font-semibold text-gray-900 hover:text-[#E17055]"
                                            >
                                                #{assessment.booking.bookingNumber}
                                            </Link>
                                            <span
                                                className={cn(
                                                    "rounded-full px-3 py-1 text-xs font-medium",
                                                    assessment.status === "PENDING"
                                                        ? "bg-orange-100 text-orange-700"
                                                        : assessment.status === "APPROVED"
                                                            ? "bg-green-100 text-green-700"
                                                            : assessment.status === "ADDED_TO_FOLIO"
                                                                ? "bg-blue-100 text-blue-700"
                                                                : "bg-red-100 text-red-700"
                                                )}
                                            >
                                                {assessment.status.replace("_", " ")}
                                            </span>
                                            <Badge variant="outline">{assessment.type}</Badge>
                                        </div>
                                        <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <User className="h-4 w-4" />
                                                {assessment.booking?.guest?.name ?? "N/A"}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <span>Room {assessment.booking?.room?.roomNumber ?? "N/A"}</span>
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-4 w-4" />
                                                {formatDate(assessment.createdAt, "short")}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{assessment.description}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-bold text-gray-900">{formatCurrency(Number(assessment.amount))}</p>
                                    {assessment.photos.length > 0 && (
                                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 justify-end">
                                            <Image className="h-3 w-3" />
                                            {assessment.photos.length} photo(s)
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                <div className="text-sm text-gray-500">
                                    {assessment.assessedBy && (
                                        <span>Assessed by {assessment.assessedBy.name}</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setSelectedAssessment(assessment);
                                            setShowDetailModal(true);
                                        }}
                                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        <Eye className="h-4 w-4" />
                                        View
                                    </button>
                                    {assessment.status === "PENDING" && (
                                        <>
                                            <button
                                                onClick={() =>
                                                    setActionModal({ open: true, assessment, action: "approve" })
                                                }
                                                className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                                            >
                                                <CheckCircle className="h-4 w-4" />
                                                Approve
                                            </button>
                                            <button
                                                onClick={() =>
                                                    setActionModal({ open: true, assessment, action: "reject" })
                                                }
                                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                                            >
                                                <XCircle className="h-4 w-4" />
                                                Reject
                                            </button>
                                        </>
                                    )}
                                    {assessment.status === "APPROVED" && (
                                        <button
                                            onClick={() =>
                                                setActionModal({ open: true, assessment, action: "add_to_folio" })
                                            }
                                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                                        >
                                            <DollarSign className="h-4 w-4" />
                                            Add to Folio
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <CreateAssessmentModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        fetchAssessments();
                    }}
                />
            )}

            {/* Detail Modal */}
            {showDetailModal && selectedAssessment && (
                <AssessmentDetailModal
                    assessment={selectedAssessment}
                    onClose={() => {
                        setShowDetailModal(false);
                        setSelectedAssessment(null);
                    }}
                />
            )}

            {/* Action Modal */}
            {actionModal.open && actionModal.assessment && (
                <ActionModal
                    assessment={actionModal.assessment}
                    action={actionModal.action}
                    onClose={() => setActionModal({ open: false, assessment: null, action: "approve" })}
                    onSuccess={() => {
                        setActionModal({ open: false, assessment: null, action: "approve" });
                        fetchAssessments();
                    }}
                />
            )}
        </div>
    );
}

function CreateAssessmentModal({
    onClose,
    onSuccess,
}: {
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [bookingId, setBookingId] = useState("");
    const [type, setType] = useState("MINOR_DAMAGE");
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [notes, setNotes] = useState("");
    const [photoUrls, setPhotoUrls] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const res = await fetch("/api/damage-assessments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    bookingId,
                    type,
                    description,
                    amount: parseFloat(amount),
                    notes: notes || undefined,
                    photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create damage assessment");
            }

            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create damage assessment");
            setSubmitting(false);
        }
    };

    const addPhotoUrl = () => {
        setPhotoUrls([...photoUrls, ""]);
    };

    const updatePhotoUrl = (index: number, value: string) => {
        const updated = [...photoUrls];
        updated[index] = value;
        setPhotoUrls(updated);
    };

    const removePhotoUrl = (index: number) => {
        setPhotoUrls(photoUrls.filter((_, i) => i !== index));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Create Damage Assessment</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Booking ID *
                        </label>
                        <input
                            type="text"
                            value={bookingId}
                            onChange={(e) => setBookingId(e.target.value)}
                            required
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                            placeholder="Enter booking ID"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Damage Type *
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { value: "MINOR_DAMAGE", label: "Minor Damage" },
                                { value: "MAJOR_DAMAGE", label: "Major Damage" },
                                { value: "MISSING_ITEMS", label: "Missing Items" },
                                { value: "EXTRA_CLEANING", label: "Extra Cleaning" },
                            ].map((t) => (
                                <button
                                    key={t.value}
                                    type="button"
                                    onClick={() => setType(t.value)}
                                    className={cn(
                                        "rounded-lg border-2 py-2 text-sm font-medium transition-all",
                                        type === t.value
                                            ? "border-[#E17055] bg-[#E17055]/5 text-[#E17055]"
                                            : "border-gray-200 text-gray-600"
                                    )}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description *
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                            rows={3}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                            placeholder="Describe the damage in detail..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Amount (₹) *
                        </label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                            min="0"
                            step="1"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                            placeholder="Enter amount"
                        />
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
                            placeholder="Any additional notes..."
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Photo URLs (Optional)
                            </label>
                            <button
                                type="button"
                                onClick={addPhotoUrl}
                                className="text-sm text-[#E17055] hover:text-[#D35B3F]"
                            >
                                + Add URL
                            </button>
                        </div>
                        {photoUrls.map((url, index) => (
                            <div key={index} className="flex gap-2 mb-2">
                                <input
                                    type="url"
                                    value={url}
                                    onChange={(e) => updatePhotoUrl(index, e.target.value)}
                                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent text-sm"
                                    placeholder="https://..."
                                />
                                <button
                                    type="button"
                                    onClick={() => removePhotoUrl(index)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
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
                            Create Assessment
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function AssessmentDetailModal({
    assessment,
    onClose,
}: {
    assessment: DamageAssessment;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Damage Assessment Details</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                        <span
                            className={cn(
                                "rounded-full px-3 py-1 text-xs font-medium",
                                assessment.status === "PENDING"
                                    ? "bg-orange-100 text-orange-700"
                                    : assessment.status === "APPROVED"
                                        ? "bg-green-100 text-green-700"
                                        : assessment.status === "ADDED_TO_FOLIO"
                                            ? "bg-blue-100 text-blue-700"
                                            : "bg-red-100 text-red-700"
                            )}
                        >
                            {assessment.status.replace("_", " ")}
                        </span>
                        <Badge variant="outline">{assessment.type}</Badge>
                    </div>

                    {/* Booking Info */}
                    <div className="rounded-lg bg-gray-50 p-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Booking Information</p>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Booking</span>
                                <Link
                                    href={`/bookings/${assessment.booking.id}`}
                                    className="text-sm font-medium text-[#E17055] hover:underline"
                                >
                                    #{assessment.booking.bookingNumber}
                                </Link>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Guest</span>
                                <span className="text-sm font-medium text-gray-900">
                                    {assessment.booking?.guest?.name}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Room</span>
                                <span className="text-sm font-medium text-gray-900">
                                    {assessment.booking?.room?.roomNumber} ({assessment.booking?.room?.type})
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Stay Period</span>
                                <span className="text-sm text-gray-900">
                                    {formatDate(assessment.booking.checkIn, "short")} -{" "}
                                    {formatDate(assessment.booking.checkOut, "short")}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Damage Details */}
                    <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Damage Description</p>
                        <p className="text-sm text-gray-600">{assessment.description}</p>
                    </div>

                    {/* Amount */}
                    <div className="rounded-lg bg-red-50 p-4">
                        <p className="text-sm text-gray-500">Assessment Amount</p>
                        <p className="text-2xl font-bold text-red-600">{formatCurrency(Number(assessment.amount))}</p>
                    </div>

                    {/* Notes */}
                    {assessment.notes && (
                        <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Notes</p>
                            <p className="text-sm text-gray-600">{assessment.notes}</p>
                        </div>
                    )}

                    {/* Photos */}
                    {assessment.photos.length > 0 && (
                        <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Photos</p>
                            <div className="grid grid-cols-2 gap-2">
                                {assessment.photos.map((photo, index) => (
                                    <a
                                        key={index}
                                        href={photo}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition-opacity"
                                    >
                                        <img
                                            src={photo}
                                            alt={`Damage photo ${index + 1}`}
                                            className="w-full h-24 object-cover"
                                        />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Metadata */}
                    <div className="text-xs text-gray-400 pt-4 border-t">
                        <p>Created: {formatDate(assessment.createdAt, "long")}</p>
                        {assessment.assessedBy && <p>Assessed by: {assessment.assessedBy.name}</p>}
                        {assessment.approvedBy && <p>Approved by: {assessment.approvedBy.name}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ActionModal({
    assessment,
    action,
    onClose,
    onSuccess,
}: {
    assessment: DamageAssessment;
    action: "approve" | "reject" | "add_to_folio";
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            let res;
            if (action === "approve") {
                res = await fetch(`/api/damage-assessments/${assessment.id}/approve`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ notes: notes || undefined }),
                });
            } else if (action === "reject") {
                res = await fetch(`/api/damage-assessments/${assessment.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "REJECTED", notes: notes || undefined }),
                });
            } else {
                res = await fetch(`/api/damage-assessments/${assessment.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "ADDED_TO_FOLIO", notes: notes || undefined }),
                });
            }

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || `Failed to ${action.replace("_", " ")} assessment`);
            }

            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : `Failed to ${action.replace("_", " ")} assessment`);
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
                <div className="border-b border-gray-200 px-6 py-4">
                    <h3 className="text-lg font-semibold text-gray-900 capitalize">
                        {action === "add_to_folio" ? "Add to Folio" : action} Assessment
                    </h3>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Assessment Summary */}
                    <div className="rounded-lg bg-gray-50 p-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Booking</span>
                            <Link
                                href={`/bookings/${assessment.booking.id}`}
                                className="text-sm font-medium text-[#E17055] hover:underline"
                            >
                                #{assessment.booking.bookingNumber}
                            </Link>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                            <span className="text-sm text-gray-600">Guest</span>
                            <span className="text-sm font-medium text-gray-900">
                                {assessment.booking?.guest?.name}
                            </span>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                            <span className="text-sm text-gray-600">Amount</span>
                            <span className="text-sm font-bold text-red-600">
                                {formatCurrency(Number(assessment.amount))}
                            </span>
                        </div>
                    </div>

                    {action === "approve" && (
                        <div>
                            <p className="text-sm text-green-700 mb-2">
                                This will approve the damage assessment of {formatCurrency(Number(assessment.amount))}.
                            </p>
                        </div>
                    )}

                    {action === "add_to_folio" && (
                        <div>
                            <p className="text-sm text-blue-700 mb-2">
                                This will add the damage charge of {formatCurrency(Number(assessment.amount))} to the
                                booking folio.
                            </p>
                        </div>
                    )}

                    {action === "reject" && (
                        <div>
                            <p className="text-sm text-red-700 mb-2">
                                This will reject the damage assessment. This action cannot be undone.
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes (Optional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                            placeholder="Any notes about this action..."
                        />
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
                            className={cn(
                                "flex-1 rounded-lg py-3 text-sm font-medium text-white disabled:opacity-50 flex items-center justify-center gap-2",
                                action === "approve"
                                    ? "bg-green-600 hover:bg-green-700"
                                    : action === "reject"
                                        ? "bg-red-600 hover:bg-red-700"
                                        : "bg-blue-600 hover:bg-blue-700"
                            )}
                        >
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {action === "approve"
                                ? "Approve"
                                : action === "reject"
                                    ? "Reject"
                                    : "Add to Folio"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}