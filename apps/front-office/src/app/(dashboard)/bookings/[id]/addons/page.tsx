"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { cn } from "@the-rooms/ui";
import {
    Loader2,
    ArrowLeft,
    ShoppingBag,
    Plus,
    Trash2,
    Utensils,
    Shirt,
    Flower2,
    Coffee,
    Car,
    MoreHorizontal,
    AlertCircle,
} from "lucide-react";
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

interface AddonType {
    type: string;
    name: string;
    description: string;
    defaultPrice: number;
    unit: string;
    taxable: boolean;
}

interface BookingAddon {
    id: string;
    type: string;
    description: string;
    amount: string;
    quantity: number;
    serviceDate: string;
    cgst: string;
    sgst: string;
    totalAmount: string;
    addedBy?: { id: string; name: string; email: string };
    createdAt: string;
}

interface AddonTotals {
    subtotal: number;
    cgst: number;
    sgst: number;
    total: number;
    count: number;
}

function getAddonIcon(type: string) {
    switch (type) {
        case "FB":
            return <Utensils className="h-4 w-4" />;
        case "LAUNDRY":
            return <Shirt className="h-4 w-4" />;
        case "SPA":
            return <Flower2 className="h-4 w-4" />;
        case "MINIBAR":
            return <Coffee className="h-4 w-4" />;
        case "RESTAURANT":
            return <Utensils className="h-4 w-4" />;
        case "TRANSPORT":
            return <Car className="h-4 w-4" />;
        case "ROOM_SERVICE":
            return <Coffee className="h-4 w-4" />;
        default:
            return <MoreHorizontal className="h-4 w-4" />;
    }
}

function getAddonTypeColor(type: string) {
    switch (type) {
        case "FB":
            return "bg-orange-100 text-orange-600";
        case "LAUNDRY":
            return "bg-blue-100 text-blue-600";
        case "SPA":
            return "bg-purple-100 text-purple-600";
        case "MINIBAR":
            return "bg-amber-100 text-amber-600";
        case "RESTAURANT":
            return "bg-green-100 text-green-600";
        case "TRANSPORT":
            return "bg-gray-100 text-gray-600";
        case "ROOM_SERVICE":
            return "bg-rose-100 text-rose-600";
        default:
            return "bg-gray-100 text-gray-600";
    }
}

export default function AddonsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [booking, setBooking] = useState<Booking | null>(null);
    const [addonTypes, setAddonTypes] = useState<AddonType[]>([]);
    const [addons, setAddons] = useState<BookingAddon[]>([]);
    const [totals, setTotals] = useState<AddonTotals | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchData();
    }, [id]);

    async function fetchData() {
        setLoading(true);
        try {
            const [bookingRes, addonsRes, typesRes] = await Promise.all([
                fetch(`/api/bookings/${id}`),
                fetch(`/api/bookings/${id}/addons`),
                fetch(`/api/addons/types`),
            ]);

            if (!bookingRes.ok) throw new Error("Booking not found");
            if (!addonsRes.ok) throw new Error("Failed to fetch addons");
            if (!typesRes.ok) throw new Error("Failed to fetch addon types");

            const bookingData = await bookingRes.json();
            const addonsData = await addonsRes.json();
            const typesData = await typesRes.json();

            setBooking(bookingData);
            setAddons(addonsData.addons || []);
            setTotals(addonsData.totals || null);
            setAddonTypes(typesData.addonTypes || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }

    const handleDeleteAddon = async (addonId: string) => {
        if (!confirm("Delete this add-on?")) return;

        try {
            const res = await fetch(`/api/bookings/${id}/addons/${addonId}`, { method: "DELETE" });
            if (res.ok) {
                fetchData();
                alert("Add-on deleted");
            } else {
                alert("Failed to delete add-on");
            }
        } catch (err) {
            alert("Error deleting add-on");
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
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href={`/bookings/${id}`}
                        className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Services & Add-ons</h2>
                        <p className="text-gray-500">
                            Booking #{booking.bookingNumber} • Room {booking.room.roomNumber}
                        </p>
                    </div>
                </div>
                {canModify && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#E17055] px-4 py-2 text-sm font-medium text-white hover:bg-[#D35B3F]"
                    >
                        <Plus className="h-4 w-4" />
                        Add Service
                    </button>
                )}
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

            {/* Add-ons List */}
            <div className="rounded-xl border bg-white p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5" />
                    Services / Add-ons
                    {totals && totals.count > 0 && (
                        <span className="ml-2 rounded-full bg-[#E17055]/10 px-2 py-0.5 text-xs font-medium text-[#E17055]">
                            {totals.count} item{totals.count !== 1 ? "s" : ""}
                        </span>
                    )}
                </h3>

                {addons.length === 0 ? (
                    <div className="text-center py-8">
                        <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No services recorded</p>
                        {canModify && (
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="mt-3 text-sm text-[#E17055] hover:underline"
                            >
                                Add your first service
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {addons.map((addon) => (
                            <div
                                key={addon.id}
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn("p-2 rounded-lg", getAddonTypeColor(addon.type))}>
                                        {getAddonIcon(addon.type)}
                                    </div>
                                    <div>
                                        <span className="font-medium text-gray-900">{addon.description}</span>
                                        <p className="text-xs text-gray-500">
                                            {addon.type} • {formatDate(addon.serviceDate, "short")}
                                            {addon.quantity > 1 && ` • Qty: ${addon.quantity}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-medium text-gray-900">
                                        {formatCurrency(Number(addon.totalAmount))}
                                    </span>
                                    {canModify && (
                                        <button
                                            onClick={() => handleDeleteAddon(addon.id)}
                                            className="text-gray-400 hover:text-red-500"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {totals && totals.count > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Subtotal</span>
                            <span>{formatCurrency(totals.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">CGST (9%)</span>
                            <span>{formatCurrency(totals.cgst)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">SGST (9%)</span>
                            <span>{formatCurrency(totals.sgst)}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-lg border-t border-gray-200 pt-2">
                            <span>Total</span>
                            <span className="text-[#E17055]">{formatCurrency(totals.total)}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Cannot Modify Warning */}
            {!canModify && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-6">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="h-6 w-6 text-orange-600" />
                        <div>
                            <p className="font-medium text-orange-900">Cannot Add Services</p>
                            <p className="text-sm text-orange-700">
                                Services can only be added for confirmed or checked-in bookings.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Service Modal */}
            {showAddModal && (
                <AddServiceModal
                    bookingId={id}
                    addonTypes={addonTypes}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
}

function AddServiceModal({
    bookingId,
    addonTypes,
    onClose,
    onSuccess,
}: {
    bookingId: string;
    addonTypes: AddonType[];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [selectedType, setSelectedType] = useState<string>("");
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [quantity, setQuantity] = useState("1");
    const [serviceDate, setServiceDate] = useState(new Date().toISOString().split("T")[0]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selectedAddonType = addonTypes.find((t) => t.type === selectedType);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedType || !description || !amount) {
            setError("Please fill all required fields");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`/api/bookings/${bookingId}/addons`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: selectedType,
                    description,
                    amount: Number(amount),
                    quantity: Number(quantity) || 1,
                    serviceDate,
                }),
            });

            if (res.ok) {
                onSuccess();
            } else {
                const data = await res.json();
                setError(data.error || "Failed to add service");
            }
        } catch (err) {
            setError("An error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Add Service</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        ✕
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Service Type *
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {addonTypes.map((type) => (
                                <button
                                    key={type.type}
                                    type="button"
                                    onClick={() => {
                                        setSelectedType(type.type);
                                        setDescription(type.name);
                                        if (type.defaultPrice > 0) {
                                            setAmount(type.defaultPrice.toString());
                                        }
                                    }}
                                    className={cn(
                                        "p-3 rounded-lg border text-center transition-colors",
                                        selectedType === type.type
                                            ? "border-[#E17055] bg-[#E17055]/5 text-[#E17055]"
                                            : "border-gray-200 hover:bg-gray-50"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "mx-auto mb-1",
                                            getAddonTypeColor(type.type),
                                            "w-8 h-8 rounded-lg flex items-center justify-center"
                                        )}
                                    >
                                        {getAddonIcon(type.type)}
                                    </div>
                                    <span className="text-xs font-medium">{type.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description *
                        </label>
                        <input
                            type="text"
                            required
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="e.g. Laundry - 3 pieces"
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Amount (₹) *
                            </label>
                            <input
                                type="number"
                                min="1"
                                step="1"
                                required
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                            <input
                                type="number"
                                min="1"
                                step="1"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Service Date *</label>
                        <input
                            type="date"
                            required
                            value={serviceDate}
                            onChange={(e) => setServiceDate(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                        />
                    </div>

                    {selectedAddonType && Number(amount) > 0 && (
                        <div className="rounded-lg bg-gray-50 p-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Price Summary</h4>
                            <div className="text-xs text-gray-600 space-y-1">
                                <div className="flex justify-between">
                                    <span>Subtotal ({quantity} x ₹{amount})</span>
                                    <span>₹{(Number(quantity) * Number(amount)).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>CGST (9%)</span>
                                    <span>₹{((Number(quantity) * Number(amount) * 0.09).toFixed(2))}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>SGST (9%)</span>
                                    <span>₹{((Number(quantity) * Number(amount) * 0.09).toFixed(2))}</span>
                                </div>
                                <div className="flex justify-between font-medium border-t border-gray-200 pt-1 mt-1">
                                    <span>Total</span>
                                    <span className="text-[#E17055]">
                                        ₹{((Number(quantity) * Number(amount) * 1.18).toFixed(2))}
                                    </span>
                                </div>
                            </div>
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
                            Add Service
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
