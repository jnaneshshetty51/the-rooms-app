"use client";

import { useEffect, useState } from "react";
import { cn } from "@the-rooms/ui";
import {
    Loader2,
    Search,
    Plus,
    Phone,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Calendar,
    X,
    Edit2,
} from "lucide-react";
import { formatDate } from "@the-rooms/ui";

interface WakeUpCall {
    id: string;
    roomNumber: string;
    guestName: string;
    phoneNumber?: string;
    scheduledTime: string;
    duration: number;
    status: "PENDING" | "COMPLETED" | "CANCELLED" | "MISSED";
    notes?: string;
    booking?: {
        id: string;
        bookingNumber: string;
    };
}

interface CreateCallForm {
    roomNumber: string;
    guestName: string;
    phoneNumber: string;
    scheduledTime: string;
    duration: number;
    notes: string;
    bookingId: string;
}

const STATUS_CONFIG = {
    PENDING: { label: "Pending", color: "bg-orange-100 text-orange-700", icon: Clock },
    COMPLETED: { label: "Completed", color: "bg-green-100 text-green-700", icon: CheckCircle },
    CANCELLED: { label: "Cancelled", color: "bg-gray-100 text-gray-700", icon: XCircle },
    MISSED: { label: "Missed", color: "bg-red-100 text-red-700", icon: AlertCircle },
};

export default function WakeUpCallsPage() {
    const [calls, setCalls] = useState<WakeUpCall[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<"today" | "all">("today");
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCall, setSelectedCall] = useState<WakeUpCall | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingCall, setEditingCall] = useState<WakeUpCall | null>(null);

    useEffect(() => {
        fetchCalls();
    }, [filter, statusFilter]);

    async function fetchCalls() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filter === "today") {
                params.set("date", "today");
            }
            if (statusFilter) {
                params.set("status", statusFilter);
            }

            const res = await fetch(`/api/wakeup-calls?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch calls");
            const data = await res.json();
            setCalls(data.calls ?? []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }

    const handleStatusUpdate = async (callId: string, newStatus: string) => {
        try {
            const res = await fetch(`/api/wakeup-calls/${callId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!res.ok) throw new Error("Failed to update call");

            setCalls((prev) =>
                prev.map((call) =>
                    call.id === callId ? { ...call, status: newStatus as WakeUpCall["status"] } : call
                )
            );
            setSelectedCall(null);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to update call");
        }
    };

    const handleEdit = async (callId: string, data: Partial<WakeUpCall>) => {
        try {
            const res = await fetch(`/api/wakeup-calls/${callId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) throw new Error("Failed to update call");

            fetchCalls();
            setEditingCall(null);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to update call");
        }
    };

    const filteredCalls = calls.filter((call) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            call.guestName.toLowerCase().includes(query) ||
            call.roomNumber.toLowerCase().includes(query)
        );
    });

    const pendingCount = calls.filter((c) => c.status === "PENDING").length;
    const completedCount = calls.filter((c) => c.status === "COMPLETED").length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Wake-Up Calls</h2>
                    <p className="text-gray-500">Manage guest wake-up calls</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#E17055] px-4 py-2 text-sm font-medium text-white hover:bg-[#D35B3F]"
                >
                    <Plus className="h-4 w-4" />
                    Schedule Call
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Pending Calls</p>
                            <p className="mt-2 text-3xl font-bold text-orange-600">{pendingCount}</p>
                        </div>
                        <Clock className="h-8 w-8 text-orange-600" />
                    </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Completed Today</p>
                            <p className="mt-2 text-3xl font-bold text-green-600">{completedCount}</p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Calls</p>
                            <p className="mt-2 text-3xl font-bold text-gray-900">{calls.length}</p>
                        </div>
                        <Phone className="h-8 w-8 text-blue-600" />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 border-b border-gray-200">
                    <button
                        onClick={() => setFilter("today")}
                        className={cn(
                            "pb-3 px-1 text-sm font-medium transition-colors",
                            filter === "today"
                                ? "border-b-2 border-[#E17055] text-[#E17055]"
                                : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        Today
                    </button>
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
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
                >
                    <option value="">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="MISSED">Missed</option>
                </select>
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by guest or room..."
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
            {!loading && filteredCalls.length === 0 && (
                <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">
                    <Phone className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No wake-up calls found</p>
                </div>
            )}

            {/* Calls List */}
            {!loading && filteredCalls.length > 0 && (
                <div className="space-y-4">
                    {filteredCalls.map((call) => {
                        const statusConfig = STATUS_CONFIG[call.status];
                        const StatusIcon = statusConfig.icon;
                        const isPast = new Date(call.scheduledTime) < new Date() && call.status === "PENDING";

                        return (
                            <div
                                key={call.id}
                                className={cn(
                                    "rounded-xl border bg-white hover:shadow-md transition-shadow",
                                    call.status === "PENDING" && isPast
                                        ? "border-red-300 border-l-4 border-l-red-500"
                                        : call.status === "PENDING"
                                            ? "border-orange-200"
                                            : "border-gray-200"
                                )}
                            >
                                <div className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <div
                                                className={cn(
                                                    "rounded-lg p-3",
                                                    call.status === "PENDING"
                                                        ? "bg-orange-100"
                                                        : call.status === "COMPLETED"
                                                            ? "bg-green-100"
                                                            : "bg-gray-100"
                                                )}
                                            >
                                                <Phone
                                                    className={cn(
                                                        "h-6 w-6",
                                                        call.status === "PENDING"
                                                            ? "text-orange-600"
                                                            : call.status === "COMPLETED"
                                                                ? "text-green-600"
                                                                : "text-gray-600"
                                                    )}
                                                />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-lg font-semibold text-gray-900">
                                                        Room {call.roomNumber}
                                                    </h3>
                                                    <span
                                                        className={cn(
                                                            "rounded-full px-2 py-0.5 text-xs font-medium flex items-center gap-1",
                                                            statusConfig.color
                                                        )}
                                                    >
                                                        <StatusIcon className="h-3 w-3" />
                                                        {statusConfig.label}
                                                    </span>
                                                    {isPast && call.status === "PENDING" && (
                                                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                                            Overdue
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-1 text-gray-600">{call.guestName}</p>
                                                <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-4 w-4" />
                                                        {formatDate(call.scheduledTime, "long")}
                                                    </span>
                                                    <span>Duration: {call.duration} min</span>
                                                    {call.phoneNumber && <span>{call.phoneNumber}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {call.status === "PENDING" && (
                                                <button
                                                    onClick={() => setEditingCall(call)}
                                                    className="text-gray-400 hover:text-gray-600 p-1"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setSelectedCall(call)}
                                                className="text-gray-400 hover:text-gray-600"
                                            >
                                                <Phone className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Call Detail Modal */}
            {selectedCall && (
                <CallDetailModal
                    call={selectedCall}
                    onClose={() => setSelectedCall(null)}
                    onStatusUpdate={handleStatusUpdate}
                />
            )}

            {/* Create Call Modal */}
            {showCreateModal && (
                <CreateCallModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        fetchCalls();
                    }}
                />
            )}

            {/* Edit Call Modal */}
            {editingCall && (
                <EditCallModal
                    call={editingCall}
                    onClose={() => setEditingCall(null)}
                    onSuccess={(data) => {
                        handleEdit(editingCall.id, data);
                    }}
                />
            )}
        </div>
    );
}

function CallDetailModal({
    call,
    onClose,
    onStatusUpdate,
}: {
    call: WakeUpCall;
    onClose: () => void;
    onStatusUpdate: (id: string, status: string) => void;
}) {
    const [updating, setUpdating] = useState(false);
    const statusConfig = STATUS_CONFIG[call.status];
    const StatusIcon = statusConfig.icon;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
                <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Wake-Up Call Details</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Room Number</p>
                            <p className="font-medium text-gray-900">{call.roomNumber}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Guest Name</p>
                            <p className="font-medium text-gray-900">{call.guestName}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Phone Number</p>
                            <p className="font-medium text-gray-900">{call.phoneNumber || "N/A"}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Status</p>
                            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium flex items-center gap-1 w-fit", statusConfig.color)}>
                                <StatusIcon className="h-3 w-3" />
                                {statusConfig.label}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Scheduled Time</p>
                            <p className="font-medium text-gray-900">{formatDate(call.scheduledTime, "long")}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Duration</p>
                            <p className="font-medium text-gray-900">{call.duration} minutes</p>
                        </div>
                    </div>

                    {call.notes && (
                        <div className="rounded-lg bg-gray-50 p-4">
                            <p className="text-sm font-medium text-gray-700 mb-1">Notes</p>
                            <p className="text-sm text-gray-600">{call.notes}</p>
                        </div>
                    )}

                    {call.booking && (
                        <div className="rounded-lg bg-gray-50 p-4">
                            <p className="text-sm font-medium text-gray-700 mb-1">Booking</p>
                            <p className="text-sm text-gray-900">#{call.booking.bookingNumber}</p>
                        </div>
                    )}

                    {/* Status Actions */}
                    {call.status === "PENDING" && (
                        <div className="border-t border-gray-200 pt-4 space-y-3">
                            <p className="text-sm font-medium text-gray-700">Update Status</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={async () => {
                                        setUpdating(true);
                                        await onStatusUpdate(call.id, "COMPLETED");
                                        setUpdating(false);
                                    }}
                                    disabled={updating}
                                    className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                    Mark Completed
                                </button>
                                <button
                                    onClick={async () => {
                                        setUpdating(true);
                                        await onStatusUpdate(call.id, "CANCELLED");
                                        setUpdating(false);
                                    }}
                                    disabled={updating}
                                    className="flex-1 rounded-lg bg-gray-600 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function CreateCallModal({
    onClose,
    onSuccess,
}: {
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [form, setForm] = useState<CreateCallForm>({
        roomNumber: "",
        guestName: "",
        phoneNumber: "",
        scheduledTime: "",
        duration: 60,
        notes: "",
        bookingId: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const res = await fetch("/api/wakeup-calls", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    roomNumber: form.roomNumber,
                    guestName: form.guestName,
                    phoneNumber: form.phoneNumber || undefined,
                    scheduledTime: new Date(form.scheduledTime).toISOString(),
                    duration: form.duration,
                    notes: form.notes || undefined,
                    bookingId: form.bookingId || undefined,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to schedule call");
            }

            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to schedule call");
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
                <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Schedule Wake-Up Call</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Room Number *</label>
                            <input
                                type="text"
                                required
                                value={form.roomNumber}
                                onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                                placeholder="e.g. 101"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Guest Name *</label>
                            <input
                                type="text"
                                required
                                value={form.guestName}
                                onChange={(e) => setForm({ ...form, guestName: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                                placeholder="Guest name"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                            <input
                                type="tel"
                                value={form.phoneNumber}
                                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                                placeholder="Optional"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                            <select
                                value={form.duration}
                                onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                            >
                                <option value={30}>30 minutes</option>
                                <option value={60}>60 minutes</option>
                                <option value={90}>90 minutes</option>
                                <option value={120}>120 minutes</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Time *</label>
                        <input
                            type="datetime-local"
                            required
                            value={form.scheduledTime}
                            onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                            rows={3}
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                            placeholder="Additional notes..."
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
                            className="flex-1 rounded-lg bg-[#E17055] py-3 text-sm font-medium text-white hover:bg-[#D35B3F] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            Schedule Call
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function EditCallModal({
    call,
    onClose,
    onSuccess,
}: {
    call: WakeUpCall;
    onClose: () => void;
    onSuccess: (data: Partial<WakeUpCall>) => void;
}) {
    const [scheduledTime, setScheduledTime] = useState(
        new Date(call.scheduledTime).toISOString().slice(0, 16)
    );
    const [duration, setDuration] = useState(call.duration);
    const [notes, setNotes] = useState(call.notes || "");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            onSuccess({
                scheduledTime: new Date(scheduledTime).toISOString(),
                duration,
                notes,
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
                <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Edit Wake-Up Call</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Room</p>
                            <p className="font-medium text-gray-900">{call.roomNumber}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Guest</p>
                            <p className="font-medium text-gray-900">{call.guestName}</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Time *</label>
                        <input
                            type="datetime-local"
                            required
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                        <select
                            value={duration}
                            onChange={(e) => setDuration(parseInt(e.target.value))}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                        >
                            <option value={30}>30 minutes</option>
                            <option value={60}>60 minutes</option>
                            <option value={90}>90 minutes</option>
                            <option value={120}>120 minutes</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                            placeholder="Additional notes..."
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
                            className="flex-1 rounded-lg bg-[#E17055] py-3 text-sm font-medium text-white hover:bg-[#D35B3F] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
