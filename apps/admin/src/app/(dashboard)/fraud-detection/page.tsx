"use client";

// apps/admin/src/app/(dashboard)/fraud-detection/page.tsx
import { useEffect, useState, useCallback } from "react";
import { ShieldAlert, CheckCircle, XCircle, AlertTriangle, Eye } from "lucide-react";
import {
    PageHeader,
    Button,
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
    Input,
} from "@the-rooms/ui";
import { formatCurrency, formatDate } from "@the-rooms/ui";
import {
    fetchFlaggedBookings,
    confirmFraudulentBooking,
    dismissFraudAlert,
    type FlaggedBooking,
} from "@/lib/api";

export default function FraudDetectionPage() {
    const [data, setData] = useState<{ bookings: FlaggedBooking[]; total: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState<FlaggedBooking | null>(null);
    const [notes, setNotes] = useState("");

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const result = await fetchFlaggedBookings();
            setData(result);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleConfirm = async () => {
        if (!selectedBooking || !notes) return;
        await confirmFraudulentBooking(selectedBooking.id, notes);
        setSelectedBooking(null);
        setNotes("");
        fetchData();
    };

    const handleDismiss = async () => {
        if (!selectedBooking || !notes) return;
        await dismissFraudAlert(selectedBooking.id, notes);
        setSelectedBooking(null);
        setNotes("");
        fetchData();
    };

    const getRiskColor = (score: number) => {
        if (score >= 80) return "text-destructive";
        if (score >= 60) return "text-warning";
        return "text-muted-foreground";
    };

    const stats = data?.bookings ? {
        total: data.bookings.length,
        pending: data.bookings.filter((b) => b.status === "PENDING").length,
        confirmed: data.bookings.filter((b) => b.status === "CONFIRMED").length,
        dismissed: data.bookings.filter((b) => b.status === "DISMISSED").length,
    } : { total: 0, pending: 0, confirmed: 0, dismissed: 0 };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Fraud Detection"
                description="Review and manage flagged booking alerts"
            />

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-4">
                <StatCard
                    label="Flagged Bookings"
                    value={stats.total}
                    icon={ShieldAlert}
                    className={stats.total > 0 ? "border-l-4 border-l-warning" : ""}
                />
                <StatCard label="Pending Review" value={stats.pending} icon={AlertTriangle} />
                <StatCard label="Confirmed Fraud" value={stats.confirmed} icon={XCircle} />
                <StatCard label="Dismissed" value={stats.dismissed} icon={CheckCircle} />
            </div>

            {/* Flagged Bookings List */}
            <div className="grid gap-4">
                {loading ? (
                    [...Array(3)].map((_, i) => (
                        <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
                    ))
                ) : data?.bookings.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No flagged bookings</p>
                            <p className="text-xs text-muted-foreground">All bookings passed fraud detection</p>
                        </CardContent>
                    </Card>
                ) : (
                    data?.bookings.map((booking) => (
                        <Card
                            key={booking.id}
                            className={booking.status === "CONFIRMED" ? "border-destructive" : ""}
                        >
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${booking.riskScore >= 80 ? "bg-red-100" :
                                                booking.riskScore >= 60 ? "bg-yellow-100" :
                                                    "bg-gray-100"
                                            }`}>
                                            <ShieldAlert className={`h-6 w-6 ${booking.riskScore >= 80 ? "text-red-600" :
                                                    booking.riskScore >= 60 ? "text-yellow-600" :
                                                        "text-gray-600"
                                                }`} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <code className="font-semibold">{booking.booking.bookingNumber}</code>
                                                <Badge variant={
                                                    booking.status === "PENDING" ? "warning" :
                                                        booking.status === "CONFIRMED" ? "destructive" :
                                                            "secondary"
                                                }>
                                                    {booking.status}
                                                </Badge>
                                            </div>
                                            <p className="text-sm mt-1">
                                                <span className="font-medium">{booking.booking.guest.name}</span>
                                                <span className="text-muted-foreground"> · {booking.booking.guest.phone}</span>
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Amount: {formatCurrency(Number(booking.booking.totalAmount))}
                                            </p>

                                            {/* Risk Factors */}
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                {booking.riskFactors.map((factor, i) => (
                                                    <span
                                                        key={i}
                                                        className="inline-flex items-center px-2 py-1 rounded text-xs bg-red-100 text-red-800"
                                                    >
                                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                                        {factor}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className={`text-2xl font-bold ${getRiskColor(booking.riskScore)}`}>
                                                {booking.riskScore}
                                            </p>
                                            <p className="text-xs text-muted-foreground">Risk Score</p>
                                        </div>
                                        {booking.status === "PENDING" && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSelectedBooking(booking)}
                                            >
                                                <Eye className="h-4 w-4 mr-2" />
                                                Review
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {booking.notes && (
                                    <div className="mt-4 p-3 bg-muted rounded-lg">
                                        <p className="text-sm text-muted-foreground">Notes</p>
                                        <p className="text-sm">{booking.notes}</p>
                                        {booking.reviewedBy && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                By {booking.reviewedBy.name} on {formatDate(booking.reviewedAt!, "short")}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Review Dialog */}
            <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Review Flagged Booking</DialogTitle>
                    </DialogHeader>
                    {selectedBooking && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Booking</p>
                                    <p className="font-semibold">{selectedBooking.booking.bookingNumber}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Guest</p>
                                    <p className="font-semibold">{selectedBooking.booking.guest.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Amount</p>
                                    <p className="font-semibold">
                                        {formatCurrency(Number(selectedBooking.booking.totalAmount))}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Risk Score</p>
                                    <p className={`font-semibold ${getRiskColor(selectedBooking.riskScore)}`}>
                                        {selectedBooking.riskScore}/100
                                    </p>
                                </div>
                            </div>

                            <div>
                                <p className="text-sm text-muted-foreground mb-2">Risk Factors</p>
                                <div className="flex flex-wrap gap-2">
                                    {selectedBooking.riskFactors.map((factor, i) => (
                                        <span
                                            key={i}
                                            className="inline-flex items-center px-2 py-1 rounded text-xs bg-red-100 text-red-800"
                                        >
                                            {factor}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Investigation Notes</Label>
                                <textarea
                                    className="w-full h-24 p-3 border rounded-lg text-sm"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Enter your investigation notes..."
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter className="flex-wrap gap-2">
                        <Button
                            variant="destructive"
                            onClick={handleConfirm}
                            disabled={!notes}
                        >
                            <XCircle className="h-4 w-4 mr-2" />
                            Confirm Fraud
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleDismiss}
                            disabled={!notes}
                        >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Dismiss Alert
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}