"use client";

import { useEffect, useState } from "react";
import { cn } from "@the-rooms/ui";
import {
    Loader2,
    Search,
    Plus,
    Car,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    Calendar,
    X,
    Users,
    MapPin,
} from "lucide-react";
import { formatDate, formatCurrency } from "@the-rooms/ui";

interface TaxiBooking {
    id: string;
    roomNumber: string;
    guestName: string;
    phoneNumber: string;
    pickupLocation: string;
    dropoffLocation: string;
    pickupDateTime: string;
    vehicleType: "SEDAN" | "SUV" | "LUXURY" | "VAN" | "AUTO";
    numberOfPassengers: number;
    status: "REQUESTED" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    driverName?: string;
    driverPhone?: string;
    vehicleNumber?: string;
    fare?: number;
    notes?: string;
    booking?: {
        id: string;
        bookingNumber: string;
    };
}

interface CreateTaxiForm {
    roomNumber: string;
    guestName: string;
    phoneNumber: string;
    pickupLocation: string;
    dropoffLocation: string;
    pickupDateTime: string;
    vehicleType: "SEDAN" | "SUV" | "LUXURY" | "VAN" | "AUTO";
    numberOfPassengers: number;
    fare: string;
    notes: string;
    bookingId: string;
}

const VEHICLE_TYPES = [
    { value: "SEDAN", label: "Sedan", icon: "🚗" },
    { value: "SUV", label: "SUV", icon: "🚙" },
    { value: "LUXURY", label: "Luxury", icon: "✨" },
    { value: "VAN", label: "Van", icon: "🚐" },
    { value: "AUTO", label: "Auto", icon: "🛺" },
];

const STATUS_CONFIG = {
    REQUESTED: { label: "Requested", color: "bg-orange-100 text-orange-700" },
    CONFIRMED: { label: "Confirmed", color: "bg-blue-100 text-blue-700" },
    IN_PROGRESS: { label: "In Progress", color: "bg-purple-100 text-purple-700" },
    COMPLETED: { label: "Completed", color: "bg-green-100 text-green-700" },
    CANCELLED: { label: "Cancelled", color: "bg-gray-100 text-gray-700" },
};

export default function TaxiBookingsPage() {
    const [bookings, setBookings] = useState<TaxiBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<"today" | "all">("today");
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBooking, setSelectedBooking] = useState<TaxiBooking | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState<TaxiBooking | null>(null);

    useEffect(() => {
        fetchBookings();
    }, [filter, statusFilter]);

    async function fetchBookings() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filter === "today") {
                params.set("date", "today");
            }
            if (statusFilter) {
                params.set("status", statusFilter);
            }

            const res = await fetch(`/api/taxi-bookings?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch bookings");
            const data = await res.json();
            setBookings(data.bookings ?? []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }

    const handleStatusUpdate = async (bookingId: string, newStatus: string, extraData?: object) => {
        try {
            const res = await fetch(`/api/taxi-bookings/${bookingId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus, ...extraData }),
            });

            if (!res.ok) throw new Error("Failed to update booking");

            setBookings((prev) =>
                prev.map((b) =>
                    b.id === bookingId ? { ...b, status: newStatus as TaxiBooking["status"], ...extraData } : b
                )
            );
            setSelectedBooking(null);
            setShowConfirmModal(null);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to update booking");
        }
    };

    const filteredBookings = bookings.filter((booking) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            booking.guestName.toLowerCase().includes(query) ||
            booking.roomNumber.toLowerCase().includes(query) ||
            booking.pickupLocation.toLowerCase().includes(query) ||
            booking.dropoffLocation.toLowerCase().includes(query)
        );
    });

    const activeCount = bookings.filter((b) =>
        ["REQUESTED", "CONFIRMED", "IN_PROGRESS"].includes(b.status)
    ).length;
    const completedCount = bookings.filter((b) => b.status === "COMPLETED").length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Taxi Bookings</h2>
                    <p className="text-gray-500">Manage guest taxi bookings</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#E17055] px-4 py-2 text-sm font-medium text-white hover:bg-[#D35B3F]"
                >
                    <Plus className="h-4 w-4" />
                    Book Taxi
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Active Bookings</p>
                            <p className="mt-2 text-3xl font-bold text-orange-600">{activeCount}</p>
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
                            <p className="text-sm font-medium text-gray-500">Total Bookings</p>
                            <p className="mt-2 text-3xl font-bold text-gray-900">{bookings.length}</p>
                        </div>
                        <Car className="h-8 w-8 text-blue-600" />
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
                    <option value="REQUESTED">Requested</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                </select>
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by guest, room, location..."
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
            {!loading && filteredBookings.length === 0 && (
                <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">
                    <Car className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No taxi bookings found</p>
                </div>
            )}

            {/* Bookings List */}
            {!loading && filteredBookings.length > 0 && (
                <div className="space-y-4">
                    {filteredBookings.map((booking) => {
                        const statusConfig = STATUS_CONFIG[booking.status];
                        const vehicleType = VEHICLE_TYPES.find((v) => v.value === booking.vehicleType);

                        return (
                            <div
                                key={booking.id}
                                className={cn(
                                    "rounded-xl border bg-white hover:shadow-md transition-shadow",
                                    booking.status === "REQUESTED"
                                        ? "border-orange-200"
                                        : booking.status === "CONFIRMED" || booking.status === "IN_PROGRESS"
                                            ? "border-blue-200"
                                            : "border-gray-200"
                                )}
                            >
                                <div className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <div
                                                className={cn(
                                                    "rounded-lg p-3",
                                                    booking.status === "REQUESTED"
                                                        ? "bg-orange-100"
                                                        : booking.status === "CONFIRMED" || booking.status === "IN_PROGRESS"
                                                            ? "bg-blue-100"
                                                            : booking.status === "COMPLETED"
                                                                ? "bg-green-100"
                                                                : "bg-gray-100"
                                                )}
                                            >
                                                <Car
                                                    className={cn(
                                                        "h-6 w-6",
                                                        booking.status === "REQUESTED"
                                                            ? "text-orange-600"
                                                            : booking.status === "CONFIRMED" || booking.status === "IN_PROGRESS"
                                                                ? "text-blue-600"
                                                                : booking.status === "COMPLETED"
                                                                    ? "text-green-600"
                                                                    : "text-gray-600"
                                                    )}
                                                />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-lg font-semibold text-gray-900">
                                                        Room {booking.roomNumber}
                                                    </h3>
                                                    <span
                                                        className={cn(
                                                            "rounded-full px-2 py-0.5 text-xs font-medium",
                                                            statusConfig.color
                                                        )}
                                                    >
                                                        {statusConfig.label}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-gray-600">{booking.guestName}</p>
                                                <div className="mt-3 space-y-1">
                                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                                        <MapPin className="h-4 w-4 text-green-600" />
                                                        <span>{booking.pickupLocation}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                                        <MapPin className="h-4 w-4 text-red-600" />
                                                        <span>{booking.dropoffLocation}</span>
                                                    </div>
                                                </div>
                                                <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-4 w-4" />
                                                        {formatDate(booking.pickupDateTime, "long")}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Users className="h-4 w-4" />
                                                        {booking.numberOfPassengers} passenger{booking.numberOfPassengers > 1 ? "s" : ""}
                                                    </span>
                                                    <span>
                                                        {vehicleType?.icon} {vehicleType?.label}
                                                    </span>
                                                    {booking.fare && (
                                                        <span className="font-medium text-gray-700">
                                                            {formatCurrency(booking.fare)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSelectedBooking(booking)}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            <Car className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Booking Detail Modal */}
            {selectedBooking && (
                <BookingDetailModal
                    booking={selectedBooking}
                    onClose={() => setSelectedBooking(null)}
                    onStatusUpdate={handleStatusUpdate}
                    onConfirm={() => {
                        setShowConfirmModal(selectedBooking);
                        setSelectedBooking(null);
                    }}
                />
            )}

            {/* Create Booking Modal */}
            {showCreateModal && (
                <CreateBookingModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        fetchBookings();
                    }}
                />
            )}

            {/* Confirm Driver Modal */}
            {showConfirmModal && (
                <ConfirmDriverModal
                    booking={showConfirmModal}
                    onClose={() => setShowConfirmModal(null)}
                    onSuccess={(driverData) => {
                        handleStatusUpdate(showConfirmModal.id, "CONFIRMED", driverData);
                    }}
                />
            )}
        </div>
    );
}

function BookingDetailModal({
    booking,
    onClose,
    onStatusUpdate,
    onConfirm,
}: {
    booking: TaxiBooking;
    onClose: () => void;
    onStatusUpdate: (id: string, status: string, extraData?: object) => void;
    onConfirm: () => void;
}) {
    const [updating, setUpdating] = useState(false);
    const statusConfig = STATUS_CONFIG[booking.status];
    const vehicleType = VEHICLE_TYPES.find((v) => v.value === booking.vehicleType);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
                <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Taxi Booking Details</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Room Number</p>
                            <p className="font-medium text-gray-900">{booking.roomNumber}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Guest Name</p>
                            <p className="font-medium text-gray-900">{booking.guestName}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Phone</p>
                            <p className="font-medium text-gray-900">{booking.phoneNumber}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Status</p>
                            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", statusConfig.color)}>
                                {statusConfig.label}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Pickup</p>
                            <p className="font-medium text-gray-900">{booking.pickupLocation}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Drop-off</p>
                            <p className="font-medium text-gray-900">{booking.dropoffLocation}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Pickup Time</p>
                            <p className="font-medium text-gray-900">{formatDate(booking.pickupDateTime, "long")}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Vehicle</p>
                            <p className="font-medium text-gray-900">
                                {vehicleType?.icon} {vehicleType?.label}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Passengers</p>
                            <p className="font-medium text-gray-900">{booking.numberOfPassengers}</p>
                        </div>
                        {booking.fare && (
                            <div>
                                <p className="text-sm text-gray-500">Fare</p>
                                <p className="font-medium text-gray-900">{formatCurrency(booking.fare)}</p>
                            </div>
                        )}
                    </div>

                    {booking.driverName && (
                        <div className="rounded-lg bg-blue-50 p-4">
                            <p className="text-sm font-medium text-blue-700 mb-2">Driver Details</p>
                            <p className="text-sm text-gray-900">Name: {booking.driverName}</p>
                            <p className="text-sm text-gray-900">Phone: {booking.driverPhone}</p>
                            <p className="text-sm text-gray-900">Vehicle: {booking.vehicleNumber}</p>
                        </div>
                    )}

                    {booking.notes && (
                        <div className="rounded-lg bg-gray-50 p-4">
                            <p className="text-sm font-medium text-gray-700 mb-1">Notes</p>
                            <p className="text-sm text-gray-600">{booking.notes}</p>
                        </div>
                    )}

                    {booking.booking && (
                        <div className="rounded-lg bg-gray-50 p-4">
                            <p className="text-sm font-medium text-gray-700 mb-1">Booking</p>
                            <p className="text-sm text-gray-900">#{booking.booking.bookingNumber}</p>
                        </div>
                    )}

                    {/* Status Actions */}
                    <div className="border-t border-gray-200 pt-4 space-y-3">
                        <p className="text-sm font-medium text-gray-700">Update Status</p>
                        <div className="flex gap-2 flex-wrap">
                            {booking.status === "REQUESTED" && (
                                <button
                                    onClick={onConfirm}
                                    className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
                                >
                                    Assign Driver
                                </button>
                            )}
                            {booking.status === "CONFIRMED" && (
                                <button
                                    onClick={async () => {
                                        setUpdating(true);
                                        await onStatusUpdate(booking.id, "IN_PROGRESS");
                                        setUpdating(false);
                                    }}
                                    disabled={updating}
                                    className="flex-1 rounded-lg bg-purple-600 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                                >
                                    Start Trip
                                </button>
                            )}
                            {booking.status === "IN_PROGRESS" && (
                                <button
                                    onClick={async () => {
                                        setUpdating(true);
                                        await onStatusUpdate(booking.id, "COMPLETED");
                                        setUpdating(false);
                                    }}
                                    disabled={updating}
                                    className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                                >
                                    Complete Trip
                                </button>
                            )}
                            {["REQUESTED", "CONFIRMED"].includes(booking.status) && (
                                <button
                                    onClick={async () => {
                                        setUpdating(true);
                                        await onStatusUpdate(booking.id, "CANCELLED");
                                        setUpdating(false);
                                    }}
                                    disabled={updating}
                                    className="flex-1 rounded-lg bg-gray-600 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function CreateBookingModal({
    onClose,
    onSuccess,
}: {
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [form, setForm] = useState<CreateTaxiForm>({
        roomNumber: "",
        guestName: "",
        phoneNumber: "",
        pickupLocation: "",
        dropoffLocation: "",
        pickupDateTime: "",
        vehicleType: "SEDAN",
        numberOfPassengers: 1,
        fare: "",
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
            const res = await fetch("/api/taxi-bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    roomNumber: form.roomNumber,
                    guestName: form.guestName,
                    phoneNumber: form.phoneNumber,
                    pickupLocation: form.pickupLocation,
                    dropoffLocation: form.dropoffLocation,
                    pickupDateTime: new Date(form.pickupDateTime).toISOString(),
                    vehicleType: form.vehicleType,
                    numberOfPassengers: form.numberOfPassengers,
                    fare: form.fare ? parseFloat(form.fare) : undefined,
                    notes: form.notes || undefined,
                    bookingId: form.bookingId || undefined,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create booking");
            }

            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create booking");
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
                <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Book Taxi</h3>
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

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                        <input
                            type="tel"
                            required
                            value={form.phoneNumber}
                            onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                            placeholder="Phone number"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Location *</label>
                        <input
                            type="text"
                            required
                            value={form.pickupLocation}
                            onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                            placeholder="Pickup address"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Drop-off Location *</label>
                        <input
                            type="text"
                            required
                            value={form.dropoffLocation}
                            onChange={(e) => setForm({ ...form, dropoffLocation: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                            placeholder="Destination address"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Date & Time *</label>
                        <input
                            type="datetime-local"
                            required
                            value={form.pickupDateTime}
                            onChange={(e) => setForm({ ...form, pickupDateTime: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type *</label>
                            <select
                                required
                                value={form.vehicleType}
                                onChange={(e) => setForm({ ...form, vehicleType: e.target.value as CreateTaxiForm["vehicleType"] })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                            >
                                {VEHICLE_TYPES.map((v) => (
                                    <option key={v.value} value={v.value}>
                                        {v.icon} {v.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Passengers</label>
                            <select
                                value={form.numberOfPassengers}
                                onChange={(e) => setForm({ ...form, numberOfPassengers: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                                    <option key={n} value={n}>
                                        {n} passenger{n > 1 ? "s" : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Fare</label>
                        <input
                            type="number"
                            value={form.fare}
                            onChange={(e) => setForm({ ...form, fare: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                            placeholder="Optional"
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
                            Book Taxi
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ConfirmDriverModal({
    booking,
    onClose,
    onSuccess,
}: {
    booking: TaxiBooking;
    onClose: () => void;
    onSuccess: (driverData: object) => void;
}) {
    const [driverName, setDriverName] = useState("");
    const [driverPhone, setDriverPhone] = useState("");
    const [vehicleNumber, setVehicleNumber] = useState("");
    const [fare, setFare] = useState(booking.fare?.toString() || "");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            onSuccess({
                driverName,
                driverPhone,
                vehicleNumber,
                fare: fare ? parseFloat(fare) : undefined,
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
                <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Assign Driver</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="rounded-lg bg-gray-50 p-4 mb-4">
                        <p className="text-sm text-gray-500">Booking for</p>
                        <p className="font-medium text-gray-900">Room {booking.roomNumber} - {booking.guestName}</p>
                        <p className="text-sm text-gray-500 mt-1">
                            {booking.pickupLocation} → {booking.dropoffLocation}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name *</label>
                        <input
                            type="text"
                            required
                            value={driverName}
                            onChange={(e) => setDriverName(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                            placeholder="Driver name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Driver Phone *</label>
                        <input
                            type="tel"
                            required
                            value={driverPhone}
                            onChange={(e) => setDriverPhone(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                            placeholder="Phone number"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number *</label>
                        <input
                            type="text"
                            required
                            value={vehicleNumber}
                            onChange={(e) => setVehicleNumber(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                            placeholder="e.g. KA-01-AB-1234"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fare</label>
                        <input
                            type="number"
                            value={fare}
                            onChange={(e) => setFare(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                            placeholder="Agreed fare"
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
                            className="flex-1 rounded-lg bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            Confirm Booking
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
