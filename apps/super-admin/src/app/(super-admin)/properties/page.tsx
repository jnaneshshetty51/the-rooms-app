"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    Building2,
    Plus,
    MapPin,
    Phone,
    Mail,
    Users,
    Bed,
    Calendar,
    Loader2,
    MoreHorizontal,
    Edit,
    Trash2,
} from "lucide-react";
import { formatDate } from "@the-rooms/ui";
import { Button } from "@the-rooms/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@the-rooms/ui";
import { Badge } from "@the-rooms/ui";

interface Property {
    id: string;
    name: string;
    code: string;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string;
    phone: string | null;
    email: string | null;
    isActive: boolean;
    createdAt: string;
    _count: {
        rooms: number;
        bookings: number;
    };
}

export default function PropertiesPage() {
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);

    useEffect(() => {
        fetchProperties();
    }, []);

    async function fetchProperties() {
        setLoading(true);
        try {
            const res = await fetch("/api/properties");
            if (res.ok) {
                const data = await res.json();
                setProperties(data.properties || []);
            } else {
                throw new Error("Failed to fetch properties");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Properties</h2>
                    <p className="text-gray-500">Manage your hotel properties</p>
                </div>
                <Button onClick={() => setShowAddModal(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Property
                </Button>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[#E17055]" />
                </div>
            )}

            {/* Error State */}
            {error && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-4 text-red-700">{error}</CardContent>
                </Card>
            )}

            {/* Properties Grid */}
            {!loading && !error && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {properties.map((property) => (
                        <Card key={property.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-lg bg-[#E17055]/10 flex items-center justify-center">
                                            <Building2 className="h-6 w-6 text-[#E17055]" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">{property.name}</CardTitle>
                                            <p className="text-sm text-gray-500">{property.code}</p>
                                        </div>
                                    </div>
                                    <Badge variant={property.isActive ? "default" : "secondary"}>
                                        {property.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {property.address && (
                                    <div className="flex items-start gap-2 text-sm text-gray-600">
                                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                        <span>
                                            {property.address}
                                            {property.city && `, ${property.city}`}
                                            {property.state && `, ${property.state}`}
                                        </span>
                                    </div>
                                )}
                                {property.phone && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Phone className="h-4 w-4 flex-shrink-0" />
                                        <span>{property.phone}</span>
                                    </div>
                                )}
                                {property.email && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Mail className="h-4 w-4 flex-shrink-0" />
                                        <span>{property.email}</span>
                                    </div>
                                )}

                                <div className="flex items-center gap-4 pt-3 border-t">
                                    <div className="flex items-center gap-1.5 text-sm">
                                        <Bed className="h-4 w-4 text-gray-400" />
                                        <span className="font-medium">{property._count.rooms}</span>
                                        <span className="text-gray-500">rooms</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-sm">
                                        <Calendar className="h-4 w-4 text-gray-400" />
                                        <span className="font-medium">{property._count.bookings}</span>
                                        <span className="text-gray-500">bookings</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-3">
                                    <Link
                                        href={`/properties/${property.id}`}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        <Edit className="h-4 w-4" />
                                        View Details
                                    </Link>
                                    {property.id !== "default" && (
                                        <button
                                            className="inline-flex items-center justify-center rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                                            onClick={() => {
                                                if (confirm("Are you sure you want to archive this property?")) {
                                                    // Handle delete
                                                }
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && properties.length === 0 && (
                <Card className="border-dashed border-2">
                    <CardContent className="py-12 text-center">
                        <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No properties yet</h3>
                        <p className="text-gray-500 mb-4">Get started by adding your first property</p>
                        <Button onClick={() => setShowAddModal(true)} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Add Property
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Add Property Modal */}
            {showAddModal && (
                <AddPropertyModal
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        fetchProperties();
                    }}
                />
            )}
        </div>
    );
}

function AddPropertyModal({
    onClose,
    onSuccess,
}: {
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [form, setForm] = useState({
        name: "",
        code: "",
        address: "",
        city: "",
        state: "",
        country: "India",
        phone: "",
        email: "",
        timezone: "Asia/Kolkata",
        currency: "INR",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/properties", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create property");
            }

            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
                <div className="border-b px-6 py-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Add New Property</h3>
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

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Property Name *
                            </label>
                            <input
                                type="text"
                                required
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                                placeholder="The Rooms"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Property Code * (unique)
                            </label>
                            <input
                                type="text"
                                required
                                value={form.code}
                                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                                placeholder="THEROOMS-001"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Address
                            </label>
                            <input
                                type="text"
                                value={form.address}
                                onChange={(e) => setForm({ ...form, address: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                                placeholder="123 Main Street"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                            <input
                                type="text"
                                value={form.city}
                                onChange={(e) => setForm({ ...form, city: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                                placeholder="Bangalore"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                            <input
                                type="text"
                                value={form.state}
                                onChange={(e) => setForm({ ...form, state: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                                placeholder="Karnataka"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <input
                                type="text"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                                placeholder="+91-80-4567-8900"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                                placeholder="info@therooms.in"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 rounded-lg bg-[#E17055] py-2 text-sm font-medium text-white hover:bg-[#D35B3F] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            Create Property
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}