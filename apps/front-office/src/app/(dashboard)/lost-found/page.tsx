"use client";

import { useEffect, useState } from "react";
import { cn } from "@the-rooms/ui";
import {
    Loader2,
    Search,
    Plus,
    Package,
    AlertCircle,
    CheckCircle,
    Clock,
    Eye,
    Trash2,
    Calendar,
    Filter,
    X,
} from "lucide-react";
import { formatDate } from "@the-rooms/ui";

interface LostAndFoundItem {
    id: string;
    itemDescription: string;
    category: "ELECTRONICS" | "CLOTHING" | "JEWELRY" | "DOCUMENTS" | "OTHER";
    color?: string;
    status: "UNCLAIMED" | "CLAIMED" | "DISPOSED" | "RETURNED_TO_GUEST";
    foundDate: string;
    claimedDate?: string;
    identifiedBy: string;
    notes?: string;
    roomNumber?: string;
    booking?: {
        id: string;
        bookingNumber: string;
        guest: {
            name: string;
            phone: string;
        };
    };
}

interface CreateItemForm {
    itemDescription: string;
    category: "ELECTRONICS" | "CLOTHING" | "JEWELRY" | "DOCUMENTS" | "OTHER";
    color: string;
    foundDate: string;
    identifiedBy: string;
    roomNumber: string;
    bookingId: string;
    notes: string;
}

const CATEGORIES = [
    { value: "ELECTRONICS", label: "Electronics" },
    { value: "CLOTHING", label: "Clothing" },
    { value: "JEWELRY", label: "Jewelry" },
    { value: "DOCUMENTS", label: "Documents" },
    { value: "OTHER", label: "Other" },
];

const STATUSES = [
    { value: "UNCLAIMED", label: "Unclaimed", color: "bg-orange-100 text-orange-700" },
    { value: "CLAIMED", label: "Claimed", color: "bg-green-100 text-green-700" },
    { value: "DISPOSED", label: "Disposed", color: "bg-gray-100 text-gray-700" },
    { value: "RETURNED_TO_GUEST", label: "Returned", color: "bg-blue-100 text-blue-700" },
];

export default function LostFoundPage() {
    const [items, setItems] = useState<LostAndFoundItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<"all" | "unclaimed" | "claimed">("unclaimed");
    const [categoryFilter, setCategoryFilter] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedItem, setSelectedItem] = useState<LostAndFoundItem | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchItems();
    }, [filter, categoryFilter]);

    async function fetchItems() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filter === "unclaimed") {
                params.set("status", "UNCLAIMED");
            } else if (filter === "claimed") {
                params.set("status", "CLAIMED,DISPOSED,RETURNED_TO_GUEST");
            }
            if (categoryFilter) {
                params.set("category", categoryFilter);
            }

            const res = await fetch(`/api/lost-found?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch items");
            const data = await res.json();
            setItems(data.items ?? []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }

    const handleStatusUpdate = async (itemId: string, newStatus: string) => {
        try {
            const res = await fetch(`/api/lost-found/${itemId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!res.ok) throw new Error("Failed to update status");

            setItems((prev) =>
                prev.map((item) =>
                    item.id === itemId ? { ...item, status: newStatus as LostAndFoundItem["status"] } : item
                )
            );
            setSelectedItem(null);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to update status");
        }
    };

    const filteredItems = items.filter((item) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            item.itemDescription.toLowerCase().includes(query) ||
            item.roomNumber?.toLowerCase().includes(query) ||
            item.identifiedBy.toLowerCase().includes(query)
        );
    });

    const unclaimedCount = items.filter((i) => i.status === "UNCLAIMED").length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Lost & Found</h2>
                    <p className="text-gray-500">Track and manage lost & found items</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#E17055] px-4 py-2 text-sm font-medium text-white hover:bg-[#D35B3F]"
                >
                    <Plus className="h-4 w-4" />
                    Report Item
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                    onClick={() => setFilter("unclaimed")}
                    className={cn(
                        "rounded-xl border p-6 text-left transition-all",
                        filter === "unclaimed"
                            ? "border-orange-500 bg-orange-50 ring-2 ring-orange-500"
                            : "border-gray-200 bg-white hover:border-orange-300"
                    )}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Unclaimed Items</p>
                            <p className="mt-2 text-3xl font-bold text-gray-900">{unclaimedCount}</p>
                        </div>
                        <Package className="h-8 w-8 text-orange-600" />
                    </div>
                </button>
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Items</p>
                            <p className="mt-2 text-3xl font-bold text-gray-900">{items.length}</p>
                        </div>
                        <Eye className="h-8 w-8 text-blue-600" />
                    </div>
                </div>
                <button
                    onClick={() => setFilter("claimed")}
                    className={cn(
                        "rounded-xl border p-6 text-left transition-all",
                        filter === "claimed"
                            ? "border-green-500 bg-green-50 ring-2 ring-green-500"
                            : "border-gray-200 bg-white hover:border-green-300"
                    )}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Resolved</p>
                            <p className="mt-2 text-3xl font-bold text-gray-900">
                                {items.filter((i) => i.status !== "UNCLAIMED").length}
                            </p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 border-b border-gray-200">
                    <button
                        onClick={() => setFilter("unclaimed")}
                        className={cn(
                            "pb-3 px-1 text-sm font-medium transition-colors",
                            filter === "unclaimed"
                                ? "border-b-2 border-[#E17055] text-[#E17055]"
                                : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        Unclaimed
                    </button>
                    <button
                        onClick={() => setFilter("claimed")}
                        className={cn(
                            "pb-3 px-1 text-sm font-medium transition-colors",
                            filter === "claimed"
                                ? "border-b-2 border-[#E17055] text-[#E17055]"
                                : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        Resolved
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
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
                >
                    <option value="">All Categories</option>
                    {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                            {cat.label}
                        </option>
                    ))}
                </select>
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search items..."
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
            {!loading && filteredItems.length === 0 && (
                <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">
                    <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No items found</p>
                </div>
            )}

            {/* Items List */}
            {!loading && filteredItems.length > 0 && (
                <div className="space-y-4">
                    {filteredItems.map((item) => (
                        <div
                            key={item.id}
                            className={cn(
                                "rounded-xl border bg-white hover:shadow-md transition-shadow",
                                item.status === "UNCLAIMED" ? "border-orange-200" : "border-gray-200"
                            )}
                        >
                            <div className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className="rounded-lg bg-gray-100 p-3">
                                            <Package className="h-6 w-6 text-gray-600" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    {item.itemDescription}
                                                </h3>
                                                <span
                                                    className={cn(
                                                        "rounded-full px-2 py-0.5 text-xs font-medium",
                                                        STATUSES.find((s) => s.value === item.status)?.color ||
                                                        "bg-gray-100 text-gray-700"
                                                    )}
                                                >
                                                    {STATUSES.find((s) => s.value === item.status)?.label || item.status}
                                                </span>
                                            </div>
                                            <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Filter className="h-4 w-4" />
                                                    {CATEGORIES.find((c) => c.value === item.category)?.label}
                                                </span>
                                                {item.roomNumber && (
                                                    <span>Room {item.roomNumber}</span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-4 w-4" />
                                                    Found {formatDate(item.foundDate, "short")}
                                                </span>
                                            </div>
                                            {item.color && (
                                                <p className="mt-1 text-sm text-gray-500">Color: {item.color}</p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedItem(item)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <Eye className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Item Detail Modal */}
            {selectedItem && (
                <ItemDetailModal
                    item={selectedItem}
                    onClose={() => setSelectedItem(null)}
                    onStatusUpdate={handleStatusUpdate}
                />
            )}

            {/* Create Item Modal */}
            {showCreateModal && (
                <CreateItemModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        fetchItems();
                    }}
                />
            )}
        </div>
    );
}

function ItemDetailModal({
    item,
    onClose,
    onStatusUpdate,
}: {
    item: LostAndFoundItem;
    onClose: () => void;
    onStatusUpdate: (id: string, status: string) => void;
}) {
    const [notes, setNotes] = useState(item.notes || "");
    const [updating, setUpdating] = useState(false);

    const handleUpdate = async (newStatus: string) => {
        setUpdating(true);
        try {
            await onStatusUpdate(item.id, newStatus);
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
                <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Item Details</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Description</p>
                            <p className="font-medium text-gray-900">{item.itemDescription}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Category</p>
                            <p className="font-medium text-gray-900">
                                {CATEGORIES.find((c) => c.value === item.category)?.label}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Status</p>
                            <span
                                className={cn(
                                    "rounded-full px-2 py-0.5 text-xs font-medium",
                                    STATUSES.find((s) => s.value === item.status)?.color || "bg-gray-100 text-gray-700"
                                )}
                            >
                                {STATUSES.find((s) => s.value === item.status)?.label || item.status}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Color</p>
                            <p className="font-medium text-gray-900">{item.color || "N/A"}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Room Number</p>
                            <p className="font-medium text-gray-900">{item.roomNumber || "N/A"}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Found Date</p>
                            <p className="font-medium text-gray-900">{formatDate(item.foundDate, "long")}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Identified By</p>
                            <p className="font-medium text-gray-900">{item.identifiedBy}</p>
                        </div>
                        {item.claimedDate && (
                            <div>
                                <p className="text-sm text-gray-500">Claimed Date</p>
                                <p className="font-medium text-gray-900">{formatDate(item.claimedDate, "long")}</p>
                            </div>
                        )}
                    </div>

                    {item.booking && (
                        <div className="rounded-lg bg-gray-50 p-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">Associated Booking</p>
                            <p className="text-sm text-gray-900">Guest: {item.booking.guest.name}</p>
                            <p className="text-sm text-gray-500">#{item.booking.bookingNumber}</p>
                        </div>
                    )}

                    {item.notes && (
                        <div className="rounded-lg bg-gray-50 p-4">
                            <p className="text-sm font-medium text-gray-700 mb-1">Notes</p>
                            <p className="text-sm text-gray-600">{item.notes}</p>
                        </div>
                    )}

                    {/* Status Actions */}
                    {item.status === "UNCLAIMED" && (
                        <div className="border-t border-gray-200 pt-4 space-y-3">
                            <p className="text-sm font-medium text-gray-700">Update Status</p>
                            <div className="flex gap-2 flex-wrap">
                                <button
                                    onClick={() => handleUpdate("CLAIMED")}
                                    disabled={updating}
                                    className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                    Mark Claimed
                                </button>
                                <button
                                    onClick={() => handleUpdate("RETURNED_TO_GUEST")}
                                    disabled={updating}
                                    className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                    Returned to Guest
                                </button>
                                <button
                                    onClick={() => handleUpdate("DISPOSED")}
                                    disabled={updating}
                                    className="flex-1 rounded-lg bg-gray-600 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    Dispose
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function CreateItemModal({
    onClose,
    onSuccess,
}: {
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [form, setForm] = useState<CreateItemForm>({
        itemDescription: "",
        category: "OTHER",
        color: "",
        foundDate: new Date().toISOString().split("T")[0],
        identifiedBy: "",
        roomNumber: "",
        bookingId: "",
        notes: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const res = await fetch("/api/lost-found", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    itemDescription: form.itemDescription,
                    category: form.category,
                    color: form.color || undefined,
                    foundDate: new Date(form.foundDate).toISOString(),
                    identifiedBy: form.identifiedBy,
                    roomNumber: form.roomNumber || undefined,
                    bookingId: form.bookingId || undefined,
                    notes: form.notes || undefined,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create item");
            }

            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create item");
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
                <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Report Lost & Found Item</h3>
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

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Item Description *
                        </label>
                        <input
                            type="text"
                            required
                            value={form.itemDescription}
                            onChange={(e) => setForm({ ...form, itemDescription: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                            placeholder="e.g. Black leather wallet, Samsung phone"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                        <select
                            required
                            value={form.category}
                            onChange={(e) => setForm({ ...form, category: e.target.value as CreateItemForm["category"] })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                        >
                            {CATEGORIES.map((cat) => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                            <input
                                type="text"
                                value={form.color}
                                onChange={(e) => setForm({ ...form, color: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                                placeholder="e.g. Black, Silver"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
                            <input
                                type="text"
                                value={form.roomNumber}
                                onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                                placeholder="e.g. 101"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Found Date *</label>
                            <input
                                type="date"
                                required
                                value={form.foundDate}
                                onChange={(e) => setForm({ ...form, foundDate: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Identified By *</label>
                            <input
                                type="text"
                                required
                                value={form.identifiedBy}
                                onChange={(e) => setForm({ ...form, identifiedBy: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                                placeholder="Staff name"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                            rows={3}
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                            placeholder="Additional details..."
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
                            Report Item
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
