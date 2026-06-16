"use client";

// apps/admin/src/app/(dashboard)/booking-recovery/page.tsx
import { useState } from "react";
import { Search, AlertTriangle, CheckCircle, Merge, Unlink } from "lucide-react";
import {
    PageHeader,
    Button,
    Input,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Badge,
    StatCard,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Label,
} from "@the-rooms/ui";
import { formatCurrency, formatDate } from "@the-rooms/ui";
import { searchLostBookings, recoverBooking, mergeBookings, type LostBooking } from "@/lib/api";

export default function BookingRecoveryPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [results, setResults] = useState<LostBooking[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<LostBooking | null>(null);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setLoading(true);
        try {
            const result = await searchLostBookings(searchQuery);
            setResults(result.bookings || []);
        } finally {
            setLoading(false);
        }
    };

    const handleRecover = async (targetId: string) => {
        if (!selectedBooking) return;
        await recoverBooking(selectedBooking.id, targetId);
        setSelectedBooking(null);
    };

    const handleMerge = async (sourceId: string, targetId: string) => {
        await mergeBookings(sourceId, targetId);
        setSelectedBooking(null);
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 80) return "text-success";
        if (confidence >= 60) return "text-warning";
        return "text-muted-foreground";
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Booking Recovery"
                description="Find and recover lost or duplicate bookings"
            />

            {/* Search */}
            <Card>
                <CardHeader>
                    <CardTitle className="font-heading text-lg">Search Lost Bookings</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, phone, booking number..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            />
                        </div>
                        <Button onClick={handleSearch} disabled={loading}>
                            {loading ? "Searching..." : "Search"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Results */}
            <div className="grid gap-4">
                {loading ? (
                    [...Array(3)].map((_, i) => (
                        <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
                    ))
                ) : results.length === 0 && searchQuery ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No matching bookings found</p>
                        </CardContent>
                    </Card>
                ) : results.length > 0 ? (
                    results.map((booking) => (
                        <Card key={booking.id} className="hover:bg-accent/50 transition-colors">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${booking.matchConfidence >= 80 ? "bg-green-100" :
                                                booking.matchConfidence >= 60 ? "bg-yellow-100" :
                                                    "bg-gray-100"
                                            }`}>
                                            <AlertTriangle className={`h-6 w-6 ${booking.matchConfidence >= 80 ? "text-green-600" :
                                                    booking.matchConfidence >= 60 ? "text-yellow-600" :
                                                        "text-gray-600"
                                                }`} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <code className="font-semibold">{booking.bookingNumber}</code>
                                                <Badge variant="secondary">{booking.status}</Badge>
                                            </div>
                                            <p className="text-sm mt-1">
                                                <span className="font-medium">{booking.guestName}</span>
                                                <span className="text-muted-foreground"> · {booking.guestPhone}</span>
                                            </p>
                                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                                <span>Check-in: {formatDate(booking.checkIn, "short")}</span>
                                                <span>Check-out: {formatDate(booking.checkOut, "short")}</span>
                                                {booking.roomNumber && <span>Room: {booking.roomNumber}</span>}
                                            </div>
                                            <p className="text-sm mt-1">
                                                Amount: {formatCurrency(Number(booking.totalAmount))}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className={`text-2xl font-bold ${getConfidenceColor(booking.matchConfidence)}`}>
                                                {booking.matchConfidence}%
                                            </p>
                                            <p className="text-xs text-muted-foreground">Match Confidence</p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setSelectedBooking(booking)}
                                        >
                                            Actions
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">
                                Search for bookings by guest name, phone number, or booking ID
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Searches Today" value={0} icon={Search} />
                <StatCard label="Recovered" value={0} icon={CheckCircle} />
                <StatCard label="Merged" value={0} icon={Merge} />
            </div>

            {/* Actions Dialog */}
            <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Booking Actions</DialogTitle>
                    </DialogHeader>
                    {selectedBooking && (
                        <div className="space-y-4 py-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Selected Booking</p>
                                <p className="font-semibold">{selectedBooking.bookingNumber}</p>
                                <p className="text-sm">{selectedBooking.guestName}</p>
                            </div>

                            <div className="space-y-2">
                                <Label>Recovery Actions</Label>
                                <div className="space-y-2">
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start"
                                        onClick={() => {
                                            const targetId = prompt("Enter target booking ID to recover to:");
                                            if (targetId) handleRecover(targetId);
                                        }}
                                    >
                                        <Unlink className="h-4 w-4 mr-2" />
                                        Recover to Existing Booking
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start"
                                        onClick={() => {
                                            const targetId = prompt("Enter booking ID to merge with:");
                                            if (targetId) handleMerge(selectedBooking.id, targetId);
                                        }}
                                    >
                                        <Merge className="h-4 w-4 mr-2" />
                                        Merge with Another Booking
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedBooking(null)}>
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}