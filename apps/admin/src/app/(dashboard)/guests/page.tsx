"use client";

// apps/admin/src/app/(dashboard)/guests/page.tsx
// Guest CRM - Full guest profiles, stay history, blacklist/VIP tagging

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Search,
    Filter,
    UserCog,
    Shield,
    Star,
    AlertTriangle,
    Eye,
    Edit,
    Merge,
    Phone,
    Mail,
    MapPin,
} from "lucide-react";
import {
    PageHeader,
    Button,
    Select,
    SelectTrigger,
    SelectContent,
    SelectValue,
    Input,
    DataTable,
    type ColumnDef,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    EmptyState,
} from "@the-rooms/ui";
import { formatDate, formatCurrency } from "@the-rooms/ui";
import { Users } from "lucide-react";

interface GuestProfile {
    id: string;
    name: string;
    email: string | null;
    phone: string;
    address: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    dateOfBirth: string | null;
    idType: string | null;
    idNumber: string | null;
    isBlacklisted: boolean;
    isVip: boolean;
    blacklistReason: string | null;
    totalStays: number;
    totalSpent: number;
    lastStay: string | null;
    createdAt: string;
    tags: string[];
}

interface GuestBookings {
    bookingNumber: string;
    checkIn: string;
    checkOut: string;
    status: string;
    totalAmount: string;
    room: { roomNumber: string; type: string };
}

interface GuestsResponse {
    guests: GuestProfile[];
    total: number;
    pages: number;
    page: number;
}

function cn(...classes: (string | boolean | undefined | null)[]) {
    return classes.filter(Boolean).join(" ");
}

export default function GuestsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [data, setData] = useState<GuestsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedGuest, setSelectedGuest] = useState<GuestProfile | null>(null);
    const [guestBookings, setGuestBookings] = useState<GuestBookings[]>([]);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [filters, setFilters] = useState({
        search: searchParams.get("search") || "",
        filter: searchParams.get("filter") || "all",
        page: 1,
    });

    const fetchGuests = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (filters.search) params.set("search", filters.search);
        if (filters.filter !== "all") params.set("filter", filters.filter);
        params.set("page", String(filters.page));

        const res = await fetch(`/api/guests?${params}`);
        const d = await res.json();
        setData(d);
        setLoading(false);
    }, [filters]);

    useEffect(() => { fetchGuests(); }, [fetchGuests]);

    const fetchGuestDetails = async (guestId: string) => {
        setDetailsLoading(true);
        try {
            const [guestRes, bookingsRes] = await Promise.all([
                fetch(`/api/guests/${guestId}`),
                fetch(`/api/guests/${guestId}/bookings`),
            ]);
            if (guestRes.ok) {
                const guestData = await guestRes.json();
                setSelectedGuest(guestData);
            }
            if (bookingsRes.ok) {
                const bookingsData = await bookingsRes.json();
                setGuestBookings(bookingsData.bookings || []);
            }
        } finally {
            setDetailsLoading(false);
        }
    };

    const handleBlacklist = async (guestId: string, reason: string) => {
        await fetch(`/api/guests/${guestId}/blacklist`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason, blacklist: true }),
        });
        fetchGuests();
        if (selectedGuest?.id === guestId) {
            fetchGuestDetails(guestId);
        }
    };

    const handleRemoveBlacklist = async (guestId: string) => {
        await fetch(`/api/guests/${guestId}/blacklist`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ blacklist: false }),
        });
        fetchGuests();
        if (selectedGuest?.id === guestId) {
            fetchGuestDetails(guestId);
        }
    };

    const handleToggleVip = async (guestId: string, isVip: boolean) => {
        await fetch(`/api/guests/${guestId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isVip: !isVip }),
        });
        fetchGuests();
        if (selectedGuest?.id === guestId) {
            fetchGuestDetails(guestId);
        }
    };

    const columns: ColumnDef<GuestProfile, unknown>[] = [
        {
            accessorKey: "name",
            header: "Guest",
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                        {row.original.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-medium text-sm flex items-center gap-2">
                            {row.original.name}
                            {row.original.isVip && <Star className="h-3 w-3 text-amber-500" />}
                            {row.original.isBlacklisted && <Shield className="h-3 w-3 text-red-500" />}
                        </p>
                        <p className="text-xs text-muted-foreground">{row.original.phone}</p>
                    </div>
                </div>
            ),
        },
        {
            accessorKey: "email",
            header: "Contact",
            cell: ({ row }) => (
                <div className="space-y-0.5">
                    {row.original.email && (
                        <p className="text-xs flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {row.original.email}
                        </p>
                    )}
                    <p className="text-xs flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {row.original.phone}
                    </p>
                </div>
            ),
        },
        {
            accessorKey: "totalStays",
            header: "Stays",
            cell: ({ row }) => (
                <div className="text-center">
                    <p className="font-semibold text-sm">{row.original.totalStays}</p>
                    <p className="text-[10px] text-muted-foreground">{formatCurrency(row.original.totalSpent)}</p>
                </div>
            ),
        },
        {
            accessorKey: "lastStay",
            header: "Last Stay",
            cell: ({ row }) => (
                <span className="text-sm">
                    {row.original.lastStay ? formatDate(row.original.lastStay, "short") : "Never"}
                </span>
            ),
        },
        {
            accessorKey: "isBlacklisted",
            header: "Status",
            cell: ({ row }) => (
                <div className="flex items-center gap-1">
                    {row.original.isBlacklisted ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Blacklisted</span>
                    ) : row.original.isVip ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">VIP</span>
                    ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Regular</span>
                    )}
                </div>
            ),
        },
        {
            accessorKey: "tags",
            header: "Tags",
            cell: ({ row }) => (
                <div className="flex flex-wrap gap-1">
                    {row.original.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                            {tag}
                        </span>
                    ))}
                    {row.original.tags.length > 2 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                            +{row.original.tags.length - 2}
                        </span>
                    )}
                </div>
            ),
        },
        {
            id: "actions",
            header: "",
            cell: ({ row }) => (
                <div className="flex items-center gap-1 justify-end">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                            setSelectedGuest(row.original);
                            fetchGuestDetails(row.original.id);
                        }}
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => router.push(`/guests/${row.original.id}/edit`)}
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    function updateFilter(key: string, value: string) {
        setFilters((f) => ({ ...f, [key]: value, page: 1 }));
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Guest Management"
                description={`${data?.total ?? 0} registered guests`}
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => { }}>
                            <Merge className="h-4 w-4 mr-2" /> Merge Duplicates
                        </Button>
                    </div>
                }
            />

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, phone, email..."
                        value={filters.search}
                        onChange={(e) => updateFilter("search", e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={filters.filter} onValueChange={(v) => updateFilter("filter", v)}>
                    <SelectTrigger className="w-[160px]">
                        <Filter className="h-4 w-4 mr-1.5 text-muted-foreground" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <option value="all">All Guests</option>
                        <option value="vip">VIP Guests</option>
                        <option value="blacklist">Blacklisted</option>
                        <option value="active">Active</option>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            {!loading && (!data?.guests || data.guests.length === 0) ? (
                <EmptyState
                    title="No guests found"
                    description={filters.search || filters.filter !== "all" ? "Try adjusting your search or filters to find what you're looking for." : "Guests will appear here once they make their first booking."}
                    icon={<Users className="h-12 w-12" />}
                    action={
                        filters.search || filters.filter !== "all"
                            ? { label: "Clear Filters", onClick: () => setFilters((f) => ({ ...f, search: "", filter: "all" })) }
                            : undefined
                    }
                />
            ) : (
                <DataTable
                    columns={columns}
                    data={data?.guests ?? []}
                    isLoading={loading}
                    pageSize={20}
                    filterPlaceholder="Filter guests..."
                />
            )}

            {/* Pagination info */}
            {data && (
                <div className="text-sm text-muted-foreground text-center">
                    Page {data.page} of {data.pages} — {data.total} total guests
                </div>
            )}

            {/* Guest Details Modal */}
            {selectedGuest && (
                <Dialog open onOpenChange={() => setSelectedGuest(null)}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary text-lg font-semibold">
                                    {selectedGuest.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <span className="flex items-center gap-2">
                                        {selectedGuest.name}
                                        {selectedGuest.isVip && <Star className="h-4 w-4 text-amber-500" />}
                                        {selectedGuest.isBlacklisted && <Shield className="h-4 w-4 text-red-500" />}
                                    </span>
                                    <span className="text-sm font-normal text-muted-foreground">
                                        Guest since {formatDate(selectedGuest.createdAt, "long")}
                                    </span>
                                </div>
                            </DialogTitle>
                        </DialogHeader>

                        {detailsLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-pulse text-muted-foreground">Loading...</div>
                            </div>
                        ) : (
                            <div className="space-y-6 py-4">
                                {/* Stats */}
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="rounded-lg bg-secondary/50 px-4 py-3 text-center">
                                        <p className="text-2xl font-bold">{selectedGuest.totalStays}</p>
                                        <p className="text-xs text-muted-foreground">Total Stays</p>
                                    </div>
                                    <div className="rounded-lg bg-secondary/50 px-4 py-3 text-center">
                                        <p className="text-2xl font-bold">{formatCurrency(selectedGuest.totalSpent)}</p>
                                        <p className="text-xs text-muted-foreground">Total Spent</p>
                                    </div>
                                    <div className="rounded-lg bg-secondary/50 px-4 py-3 text-center">
                                        <p className="text-2xl font-bold">{selectedGuest.lastStay ? formatDate(selectedGuest.lastStay, "short") : "N/A"}</p>
                                        <p className="text-xs text-muted-foreground">Last Stay</p>
                                    </div>
                                    <div className="rounded-lg bg-secondary/50 px-4 py-3 text-center">
                                        <p className="text-2xl font-bold">{selectedGuest.tags.length}</p>
                                        <p className="text-xs text-muted-foreground">Tags</p>
                                    </div>
                                </div>

                                {/* Contact Info */}
                                <div className="space-y-2">
                                    <h3 className="text-sm font-semibold">Contact Information</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Phone className="h-4 w-4 text-muted-foreground" />
                                            <a href={`tel:${selectedGuest.phone}`} className="text-blue-600 hover:underline">
                                                {selectedGuest.phone}
                                            </a>
                                        </div>
                                        {selectedGuest.email && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                                <a href={`mailto:${selectedGuest.email}`} className="text-blue-600 hover:underline">
                                                    {selectedGuest.email}
                                                </a>
                                            </div>
                                        )}
                                        {selectedGuest.address && (
                                            <div className="flex items-center gap-2 text-sm col-span-2">
                                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                                <span>{selectedGuest.address}, {selectedGuest.city}, {selectedGuest.state} - {selectedGuest.pincode}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ID Verification */}
                                {selectedGuest.idType && (
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-semibold">ID Verification</h3>
                                        <div className="flex items-center gap-4 text-sm">
                                            <span className="px-2 py-1 rounded bg-secondary text-secondary-foreground">
                                                {selectedGuest.idType}
                                            </span>
                                            <span className="font-mono">{selectedGuest.idNumber}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Blacklist Warning */}
                                {selectedGuest.isBlacklisted && (
                                    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                                        <div className="flex items-center gap-2 text-red-800 font-medium">
                                            <AlertTriangle className="h-4 w-4" />
                                            Blacklisted
                                        </div>
                                        <p className="text-sm text-red-600 mt-1">{selectedGuest.blacklistReason}</p>
                                    </div>
                                )}

                                {/* Stay History */}
                                <div className="space-y-2">
                                    <h3 className="text-sm font-semibold">Stay History</h3>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {guestBookings.length === 0 ? (
                                            <p className="text-sm text-muted-foreground text-center py-4">No bookings found</p>
                                        ) : (
                                            guestBookings.map((booking) => (
                                                <div key={booking.bookingNumber} className="flex items-center justify-between rounded-lg border px-3 py-2">
                                                    <div>
                                                        <p className="font-mono text-sm font-semibold">{booking.bookingNumber}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Room {booking.room.roomNumber} · {formatDate(booking.checkIn, "short")} - {formatDate(booking.checkOut, "short")}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${booking.status === "CHECKED_IN" ? "bg-blue-100 text-blue-700" :
                                                            booking.status === "CHECKED_OUT" ? "bg-gray-100 text-gray-700" :
                                                                booking.status === "CONFIRMED" ? "bg-green-100 text-green-700" :
                                                                    "bg-red-100 text-red-700"
                                                            }`}>
                                                            {booking.status.replace("_", " ")}
                                                        </span>
                                                        <p className="text-xs font-medium mt-1">{formatCurrency(Number(booking.totalAmount))}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Admin Actions */}
                                <div className="border-t pt-4 flex gap-2 flex-wrap">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => router.push(`/guests/${selectedGuest.id}/edit`)}
                                    >
                                        <Edit className="h-4 w-4 mr-2" /> Edit Profile
                                    </Button>
                                    <Button
                                        variant={selectedGuest.isVip ? "outline" : "default"}
                                        size="sm"
                                        onClick={() => handleToggleVip(selectedGuest.id, selectedGuest.isVip)}
                                    >
                                        <Star className="h-4 w-4 mr-2" />
                                        {selectedGuest.isVip ? "Remove VIP" : "Mark as VIP"}
                                    </Button>
                                    {selectedGuest.isBlacklisted ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleRemoveBlacklist(selectedGuest.id)}
                                            className="text-green-600 hover:text-green-700"
                                        >
                                            <Shield className="h-4 w-4 mr-2" /> Remove Blacklist
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const reason = prompt("Enter blacklist reason:");
                                                if (reason) handleBlacklist(selectedGuest.id, reason);
                                            }}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <Shield className="h-4 w-4 mr-2" /> Blacklist Guest
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
