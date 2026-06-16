"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
    Loader2,
    CheckCircle,
    AlertCircle,
    Clock,
    Receipt,
    Download,
    LogOut,
    CreditCard,
    AlertTriangle,
    ChevronRight,
    FileText,
} from "lucide-react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Button,
    Badge,
    Progress,
} from "@the-rooms/ui";
import { formatDate, formatCurrency, cn } from "@the-rooms/ui";

type Booking = {
    id: string;
    bookingNumber: string;
    checkIn: string;
    checkOut: string;
    status: string;
    paymentStatus: string;
    totalAmount: string;
    room: {
        roomNumber: string;
        type: string;
    };
    guest: {
        name: string;
        phone: string;
        email?: string;
    };
    payments: {
        id: string;
        amount: string;
        method: string;
        status: string;
    }[];
};

type ExpressCheckoutStatus = "NOT_STARTED" | "INITIATED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";

interface CheckoutSession {
    id: string;
    status: ExpressCheckoutStatus;
    booking: Booking;
    charges: {
        roomCharges: number;
        addons: number;
        damageCharges: number;
        lateCheckoutFee: number;
        totalCharges: number;
    };
    payments: {
        totalPaid: number;
        pendingAmount: number;
    };
    invoice?: {
        id: string;
        invoiceNumber: string;
        pdfUrl?: string;
    };
}

const STATUS_STEPS = [
    { key: "INITIATED", label: "Initiated" },
    { key: "IN_PROGRESS", label: "In Progress" },
    { key: "COMPLETED", label: "Completed" },
] as const;

export default function ExpressCheckoutPage() {
    const searchParams = useSearchParams();
    const bookingId = searchParams.get("bookingId");

    const [booking, setBooking] = useState<Booking | null>(null);
    const [session, setSession] = useState<CheckoutSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [initiating, setInitiating] = useState(false);
    const [completing, setCompleting] = useState(false);

    useEffect(() => {
        if (!bookingId) {
            fetchDefaultBooking();
        } else {
            fetchBooking(bookingId);
        }
    }, [bookingId]);

    useEffect(() => {
        if (session?.status && session.status !== "NOT_STARTED" && session.status !== "COMPLETED") {
            const interval = setInterval(checkStatus, 5000);
            return () => clearInterval(interval);
        }
    }, [session?.status]);

    async function fetchDefaultBooking() {
        try {
            const res = await fetch("/api/bookings");
            if (res.ok) {
                const data = await res.json();
                const bookings: Booking[] = data.bookings ?? [];
                // Find checked-in booking
                const checkedIn = bookings.find((b) => b.status === "CHECKED_IN");
                if (checkedIn) {
                    setBooking(checkedIn);
                    checkExistingSession(checkedIn.id);
                } else if (bookings.length > 0) {
                    setBooking(bookings[0]);
                    checkExistingSession(bookings[0].id);
                } else {
                    setError("No active booking found");
                }
            }
        } catch (err) {
            setError("Failed to fetch booking");
        } finally {
            setLoading(false);
        }
    }

    async function fetchBooking(id: string) {
        try {
            const res = await fetch(`/api/bookings/${id}`);
            if (res.ok) {
                const data = await res.json();
                setBooking(data);
                checkExistingSession(id);
            } else {
                setError("Booking not found");
            }
        } catch (err) {
            setError("Failed to fetch booking");
        } finally {
            setLoading(false);
        }
    }

    async function checkExistingSession(bookingId: string) {
        try {
            const res = await fetch(`/api/bookings/${bookingId}/express-checkout/status`);
            if (res.ok) {
                const data = await res.json();
                if (data.session) {
                    setSession(data.session);
                }
            }
        } catch (err) {
            console.error("Error checking session:", err);
        }
    }

    async function checkStatus() {
        if (!booking) return;
        try {
            const res = await fetch(`/api/bookings/${booking.id}/express-checkout/status`);
            if (res.ok) {
                const data = await res.json();
                if (data.session) {
                    setSession(data.session);
                }
            }
        } catch (err) {
            console.error("Error checking status:", err);
        }
    }

    async function handleInitiateCheckout() {
        if (!booking) return;
        setInitiating(true);
        setError(null);

        try {
            const res = await fetch(`/api/bookings/${booking.id}/express-checkout`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to initiate checkout");
            }

            const data = await res.json();
            setSession(data.session);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to initiate checkout");
        } finally {
            setInitiating(false);
        }
    }

    async function handleCompleteCheckout() {
        if (!booking) return;
        setCompleting(true);
        setError(null);

        try {
            const res = await fetch(`/api/bookings/${booking.id}/express-checkout/complete`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to complete checkout");
            }

            const data = await res.json();
            setSession(data.session);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to complete checkout");
        } finally {
            setCompleting(false);
        }
    }

    const getCurrentStepIndex = () => {
        if (!session) return -1;
        const status = session.status;
        if (status === "NOT_STARTED") return -1;
        if (status === "INITIATED") return 0;
        if (status === "IN_PROGRESS") return 1;
        if (status === "COMPLETED") return 2;
        return -1;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-[#E17055] animate-spin" />
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="text-center py-20">
                <AlertCircle className="w-12 h-12 text-[#B2BEC3] mx-auto mb-3" />
                <p className="text-[#636E72] font-medium">{error || "Booking not found"}</p>
                <Button asChild className="mt-4 bg-[#E17055] hover:bg-[#D35B3F]">
                    <a href="/bookings">Back to Bookings</a>
                </Button>
            </div>
        );
    }

    const totalPaid = booking.payments
        .filter((p) => p.status === "PAID")
        .reduce((sum, p) => sum + Number(p.amount), 0);
    const totalAmount = Number(booking.totalAmount);
    const balanceDue = totalAmount - totalPaid;

    // Completed state
    if (session?.status === "COMPLETED") {
        return (
            <div className="space-y-6">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-[#2D3436]">Express Check-out</h1>
                    <p className="text-sm text-[#636E72] mt-1">Booking #{booking.bookingNumber}</p>
                </div>

                <Card className="border-green-200 bg-green-50">
                    <CardContent className="p-8 text-center">
                        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="h-10 w-10 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-green-800 mb-2">Check-out Complete!</h2>
                        <p className="text-green-700">
                            You have successfully checked out of Room {booking.room.roomNumber}
                        </p>
                        <p className="text-sm text-green-600 mt-2">
                            Thank you for staying with us. We hope to see you again!
                        </p>
                    </CardContent>
                </Card>

                {session.invoice && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Your Invoice
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-[#636E72]">Invoice Number</p>
                                    <p className="font-medium">{session.invoice.invoiceNumber}</p>
                                </div>
                                <Button
                                    onClick={() => {
                                        if (session.invoice?.pdfUrl) {
                                            window.open(session.invoice.pdfUrl, "_blank");
                                        }
                                    }}
                                    className="bg-[#E17055] hover:bg-[#D35B3F]"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Download Invoice
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="flex gap-3">
                    <Button asChild variant="outline" className="flex-1">
                        <a href="/dashboard">Go to Dashboard</a>
                    </Button>
                    <Button asChild className="flex-1 bg-[#E17055] hover:bg-[#D35B3F]">
                        <a href="/feedback">Share Feedback</a>
                    </Button>
                </div>
            </div>
        );
    }

    // Active checkout session
    const currentStepIndex = getCurrentStepIndex();

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-[#2D3436]">Express Check-out</h1>
                <p className="text-sm text-[#636E72] mt-1">Booking #{booking.bookingNumber}</p>
            </div>

            {/* Progress Indicator */}
            {session && session.status !== "NOT_STARTED" && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Checkout Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            {STATUS_STEPS.map((step, index) => (
                                <div key={step.key} className="flex items-center flex-1">
                                    <div className="flex flex-col items-center">
                                        <div
                                            className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                                                index <= currentStepIndex
                                                    ? "bg-[#E17055] text-white"
                                                    : "bg-gray-200 text-gray-500"
                                            )}
                                        >
                                            {index < currentStepIndex ? (
                                                <CheckCircle className="w-5 h-5" />
                                            ) : (
                                                index + 1
                                            )}
                                        </div>
                                        <p
                                            className={cn(
                                                "text-xs mt-1",
                                                index <= currentStepIndex ? "text-[#E17055] font-medium" : "text-gray-500"
                                            )}
                                        >
                                            {step.label}
                                        </p>
                                    </div>
                                    {index < STATUS_STEPS.length - 1 && (
                                        <div
                                            className={cn(
                                                "flex-1 h-0.5 mx-2",
                                                index < currentStepIndex ? "bg-[#E17055]" : "bg-gray-200"
                                            )}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Room & Guest Info */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Stay Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#E17055] flex items-center justify-center">
                            <span className="text-white font-bold text-lg">{booking.guest.name.charAt(0)}</span>
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-[#2D3436]">Room {booking.room.roomNumber}</p>
                            <p className="text-sm text-[#636E72]">{booking.room.type} Room</p>
                            <p className="text-xs text-[#B2BEC3] mt-1">
                                {formatDate(booking.checkIn, "short")} - {formatDate(booking.checkOut, "short")}
                            </p>
                        </div>
                        <Badge
                            className={
                                booking.status === "CHECKED_IN"
                                    ? "bg-[#00B894] text-white"
                                    : "bg-gray-100 text-gray-600"
                            }
                        >
                            {booking.status.replace("_", " ")}
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Charges Summary */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Receipt className="w-4 h-4" />
                        Charges Summary
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-[#636E72]">Room Charges</span>
                        <span className="font-medium">
                            {formatCurrency(session?.charges.roomCharges ?? totalAmount)}
                        </span>
                    </div>
                    {session?.charges.addons && session.charges.addons > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-[#636E72]">Add-ons & Services</span>
                            <span className="font-medium">{formatCurrency(session.charges.addons)}</span>
                        </div>
                    )}
                    {session?.charges.damageCharges && session.charges.damageCharges > 0 && (
                        <div className="flex justify-between text-sm text-red-600">
                            <span>Damage Charges</span>
                            <span className="font-medium">{formatCurrency(session.charges.damageCharges)}</span>
                        </div>
                    )}
                    {session?.charges.lateCheckoutFee && session.charges.lateCheckoutFee > 0 && (
                        <div className="flex justify-between text-sm text-orange-600">
                            <span>Late Checkout Fee</span>
                            <span className="font-medium">{formatCurrency(session.charges.lateCheckoutFee)}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-semibold text-lg border-t pt-3">
                        <span>Total Charges</span>
                        <span>{formatCurrency(session?.charges.totalCharges ?? totalAmount)}</span>
                    </div>

                    <div className="flex justify-between text-sm text-green-600">
                        <span>Amount Paid</span>
                        <span>-{formatCurrency(session?.payments.totalPaid ?? totalPaid)}</span>
                    </div>

                    <div
                        className={cn(
                            "flex justify-between font-semibold text-lg border-t pt-3",
                            (session?.payments.pendingAmount ?? balanceDue) > 0
                                ? "text-orange-600"
                                : "text-green-600"
                        )}
                    >
                        <span>Balance {balanceDue > 0 ? "Due" : "Overpaid"}</span>
                        <span>
                            {formatCurrency(Math.abs(session?.payments.pendingAmount ?? balanceDue))}
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Pending Dues Warning */}
            {(session?.payments.pendingAmount ?? balanceDue) > 0 && (
                <Card className="border-orange-200 bg-orange-50">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-orange-800">Pending Payment Required</p>
                                <p className="text-sm text-orange-700 mt-1">
                                    Please complete your payment at the front desk before checking out.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Error Message */}
            {error && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-red-800">Error</p>
                                <p className="text-sm text-red-700 mt-1">{error}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Actions */}
            <div className="space-y-3">
                {!session || session.status === "NOT_STARTED" ? (
                    <Button
                        onClick={handleInitiateCheckout}
                        disabled={initiating}
                        className="w-full bg-[#E17055] hover:bg-[#D35B3F] h-12"
                    >
                        {initiating ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Initiating...
                            </>
                        ) : (
                            <>
                                <LogOut className="w-5 h-5 mr-2" />
                                Start Express Checkout
                            </>
                        )}
                    </Button>
                ) : session.status === "INITIATED" || session.status === "IN_PROGRESS" ? (
                    <div className="space-y-3">
                        <div className="flex items-center justify-center gap-2 text-sm text-[#636E72]">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing your checkout request...
                        </div>
                        {(session.payments.pendingAmount ?? balanceDue) <= 0 ? (
                            <Button
                                onClick={handleCompleteCheckout}
                                disabled={completing}
                                className="w-full bg-[#00B894] hover:bg-[#00A381] h-12"
                            >
                                {completing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Completing...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-5 h-5 mr-2" />
                                        Confirm & Complete Checkout
                                    </>
                                )}
                            </Button>
                        ) : (
                            <Button disabled className="w-full h-12 bg-gray-300">
                                <Clock className="w-5 h-5 mr-2" />
                                Please Clear Pending Balance at Front Desk
                            </Button>
                        )}
                    </div>
                ) : null}

                <Button asChild variant="outline" className="w-full">
                    <a href={`/stay-details?bookingId=${booking.id}`}>
                        View Stay Details
                        <ChevronRight className="w-4 h-4 ml-2" />
                    </a>
                </Button>
            </div>
        </div>
    );
}