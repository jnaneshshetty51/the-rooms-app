"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@the-rooms/ui";
import { Loader2, Search, Calendar, AlertTriangle, User, Phone } from "lucide-react";
import { formatDate, formatCurrency } from "@the-rooms/ui";

interface NoShowBooking {
    id: string;
    bookingNumber: string;
    status: string;
    checkIn: string;
    checkOut: string;
    totalAmount: string;
    noShowAt: string;
    noShowCharge: string;
    guest: {
        id: string;
        name: string;
        phone: string;
        email?: string;
    };
    room: {
        id: string;
        roomNumber: string;
        type: string;
    };
    createdBy?: {
        id: string;
        name: string;
        email: string;
    };
}

export default function NoShowsPage() {
    const [bookings, setBookings] = useState<NoShowBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    useEffect(() => {
        async function fetchNoShows() {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                params.set("page", "1");
                params.set("perPage", "50");
                if (startDate) params.set("startDate", startDate);
                if (endDate) params.set("endDate", endDate);

                const res = await fetch(`/api/bookings/no-shows?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    setBookings(data.bookings ?? []);
                    setPagination({ page: data.page, pages: data.pages, total: data.total });
                }
            } finally {
                setLoading(false);
            }
        }
        fetchNoShows();
    }, [startDate, endDate]);

    const filtered = bookings.filter((b) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            b.guest.name.toLowerCase().includes(query) ||
            b.bookingNumber.toLowerCase().includes(query) ||
            b.guest.phone.includes(query)
        );
    });

    const totalCharges = filtered.reduce((sum, b) => sum + Number(b.noShowCharge || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">No-Show Bookings</h2>
                    <p className="text-gray-500">View and manage no-show bookings</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                        {filtered.length} no-shows | Total Charges: {formatCurrency(totalCharges)}
                    </span>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by guest name, booking number, or phone..."
                        className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">From:</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055]"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">To:</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055]"
                    />
                </div>
                {(startDate || endDate) && (
                    <button
                        onClick={() => { setStartDate(""); setEndDate(""); }}
                        className="text-sm text-[#E17055] hover:underline"
                    >
                        Clear dates
                    </button>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="h-8 w-8 text-orange-500" />
                        <div>
                            <p className="text-sm text-orange-600">Total No-Shows</p>
                            <p className="text-2xl font-bold text-orange-700">{filtered.length}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <div className="flex items-center gap-3">
                        <User className="h-8 w-8 text-red-500" />
                        <div>
                            <p className="text-sm text-red-600">Total Charges</p>
                            <p className="text-2xl font-bold text-red-700">{formatCurrency(totalCharges)}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center gap-3">
                        <Phone className="h-8 w-8 text-gray-500" />
                        <div>
                            <p className="text-sm text-gray-600">Avg. Charge</p>
                            <p className="text-2xl font-bold text-gray-700">
                                {filtered.length > 0 ? formatCurrency(totalCharges / filtered.length) : formatCurrency(0)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* No-Shows List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[#E17055]" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">
                    <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No no-show bookings found</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No-Show Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Charge</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filtered.map((booking) => (
                                <tr key={booking.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-medium text-gray-900">{booking.guest.name}</p>
                                            <p className="text-sm text-gray-500">{booking.guest.phone}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-medium text-gray-900">#{booking.bookingNumber}</p>
                                            <p className="text-sm text-gray-500">
                                                {formatDate(booking.checkIn, "short")} - {formatDate(booking.checkOut, "short")}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-medium text-gray-900">Room {booking.room.roomNumber}</span>
                                        <span className="ml-2 text-sm text-gray-500">({booking.room.type})</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {formatDate(booking.checkIn, "long")}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-orange-600 font-medium">
                                        {booking.noShowAt ? formatDate(booking.noShowAt, "long") : "-"}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-semibold text-orange-600">
                                            {formatCurrency(Number(booking.noShowCharge || 0))}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Link
                                            href={`/bookings/${booking.id}`}
                                            className="text-sm text-[#E17055] hover:underline"
                                        >
                                            View Details
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination Info */}
            {pagination.total > 0 && (
                <div className="text-center text-sm text-gray-500">
                    Showing {filtered.length} of {pagination.total} no-show bookings
                </div>
            )}
        </div>
    );
}
