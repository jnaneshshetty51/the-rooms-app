"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    CheckCircle2,
    AlertCircle,
    Loader2,
    Calendar,
    MapPin,
    User,
    Phone,
    Mail,
    FileText,
    Upload,
    Clock,
    Key,
    CreditCard,
} from "lucide-react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Button,
    Badge,
    Input,
    Label,
    Checkbox,
    toast,
} from "@the-rooms/ui";
import { formatDate, formatCurrency } from "@the-rooms/ui";

interface Booking {
    id: string;
    bookingNumber: string;
    checkIn: string;
    checkOut: string;
    status: string;
    totalAmount: string;
    paymentStatus: string;
    room: {
        roomNumber: string;
        type: string;
        floor: string;
    };
    guest: {
        name: string;
        email: string;
        phone: string;
    };
}

interface Document {
    id: string;
    documentType: string;
    frontUrl: string;
    backUrl: string | null;
    verified: boolean;
}

export default function CheckInPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [booking, setBooking] = useState<Booking | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [canCheckIn, setCanCheckIn] = useState(false);
    const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    // Form state
    const [acknowledgeTerms, setAcknowledgeTerms] = useState(false);
    const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
    const [actualCheckInTime, setActualCheckInTime] = useState(
        new Date().toTimeString().slice(0, 5)
    );

    useEffect(() => {
        fetchCheckInInfo();
    }, []);

    async function fetchCheckInInfo() {
        setLoading(true);
        try {
            const res = await fetch("/api/guest-checkin");
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to fetch check-in info");
            }

            setBooking(data.booking);
            setDocuments(data.documents || []);
            setCanCheckIn(data.canCheckIn ?? false);
            setAlreadyCheckedIn(data.alreadyCheckedIn ?? false);
            setMessage(data.message);
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to load check-in information",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }

    async function handleCheckIn() {
        if (!booking) return;

        if (!acknowledgeTerms) {
            toast({
                title: "Acknowledgement Required",
                description: "Please acknowledge the terms and conditions to proceed",
                variant: "destructive",
            });
            return;
        }

        setSubmitting(true);
        try {
            const checkInDateTime = new Date(booking.checkIn);
            const [hours, minutes] = actualCheckInTime.split(":");
            checkInDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            const res = await fetch("/api/guest-checkin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    bookingId: booking.id,
                    actualCheckInTime: checkInDateTime.toISOString(),
                    documentId: selectedDocumentId,
                    acknowledgeTerms,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to process check-in");
            }

            toast({
                title: "Check-in Successful!",
                description: `Welcome! Your room is ${data.roomNumber}. Enjoy your stay!`,
            });

            // Redirect to dashboard
            setTimeout(() => {
                router.push("/dashboard");
            }, 2000);
        } catch (error) {
            toast({
                title: "Check-in Failed",
                description: error instanceof Error ? error.message : "Failed to process check-in",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#E17055] animate-spin" />
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="space-y-6">
                <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-[#B2BEC3] mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-[#2D3436] mb-2">
                        No Upcoming Booking
                    </h2>
                    <p className="text-[#636E72] mb-6">
                        You don't have any upcoming reservations to check in for.
                    </p>
                    <Button
                        onClick={() => router.push("/bookings")}
                        className="bg-[#E17055] hover:bg-[#D35B3F]"
                    >
                        View My Bookings
                    </Button>
                </div>
            </div>
        );
    }

    if (alreadyCheckedIn) {
        return (
            <div className="space-y-6">
                <Card className="border-green-200 bg-green-50">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-green-800">
                                    Already Checked In
                                </h2>
                                <p className="text-green-600">
                                    You have already completed your check-in for Room {booking.room.roomNumber}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Booking Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-[#636E72]">Booking Number</p>
                                <p className="font-medium">{booking.bookingNumber}</p>
                            </div>
                            <div>
                                <p className="text-sm text-[#636E72]">Room</p>
                                <p className="font-medium">{booking.room.roomNumber} ({booking.room.type})</p>
                            </div>
                            <div>
                                <p className="text-sm text-[#636E72]">Check-out Date</p>
                                <p className="font-medium">{formatDate(booking.checkOut, "long")}</p>
                            </div>
                            <div>
                                <p className="text-sm text-[#636E72]">Payment Status</p>
                                <Badge className={booking.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                                    {booking.paymentStatus}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Button
                    onClick={() => router.push("/dashboard")}
                    className="w-full bg-[#E17055] hover:bg-[#D35B3F]"
                >
                    Go to Dashboard
                </Button>
            </div>
        );
    }

    if (!canCheckIn) {
        return (
            <div className="space-y-6">
                <Card className="border-yellow-200 bg-yellow-50">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                                <Clock className="w-6 h-6 text-yellow-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-yellow-800">
                                    Check-in Not Available
                                </h2>
                                <p className="text-yellow-600">{message}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Booking Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[#636E72]">Booking Number</p>
                                <p className="font-medium">{booking.bookingNumber}</p>
                            </div>
                            <Badge className="bg-[#00B894]/10 text-[#00B894] border-[#00B894]/20">
                                {booking.status}
                            </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-[#636E72]">Check-in Date</p>
                                <p className="font-medium">{formatDate(booking.checkIn, "long")}</p>
                            </div>
                            <div>
                                <p className="text-sm text-[#636E72]">Check-out Date</p>
                                <p className="font-medium">{formatDate(booking.checkOut, "long")}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Button
                    onClick={() => router.push("/bookings")}
                    variant="outline"
                    className="w-full"
                >
                    Back to Bookings
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-[#2D3436]">Online Check-in</h1>
                <p className="text-[#636E72] mt-1">
                    Complete your check-in before arrival
                </p>
            </div>

            {/* Booking Summary */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-[#E17055]" />
                        Your Booking
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Badge className="bg-[#00B894]/10 text-[#00B894] border-[#00B894]/20">
                            CONFIRMED
                        </Badge>
                        <span className="text-sm text-[#636E72]">{booking.bookingNumber}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-[#636E72] mt-0.5" />
                            <div>
                                <p className="text-sm text-[#636E72]">Room</p>
                                <p className="font-semibold text-lg">{booking.room.roomNumber}</p>
                                <p className="text-sm text-[#636E72]">{booking.room.type} Room • Floor {booking.room.floor}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Calendar className="w-5 h-5 text-[#636E72] mt-0.5" />
                            <div>
                                <p className="text-sm text-[#636E72]">Stay Period</p>
                                <p className="font-medium">{formatDate(booking.checkIn, "short")}</p>
                                <p className="text-sm text-[#636E72]">to {formatDate(booking.checkOut, "short")}</p>
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-4 mt-4">
                        <div className="flex items-start gap-3">
                            <User className="w-5 h-5 text-[#636E72] mt-0.5" />
                            <div>
                                <p className="text-sm text-[#636E72]">Guest</p>
                                <p className="font-medium">{booking.guest.name}</p>
                                <p className="text-sm text-[#636E72]">{booking.guest.email}</p>
                                <p className="text-sm text-[#636E72]">{booking.guest.phone}</p>
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-4 mt-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[#636E72]">Total Amount</p>
                            <p className="text-2xl font-bold text-[#2D3436]">
                                {formatCurrency(Number(booking.totalAmount))}
                            </p>
                        </div>
                        <Badge className={booking.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                            {booking.paymentStatus}
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Check-in Time */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-[#E17055]" />
                        Estimated Arrival Time
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Label htmlFor="checkInTime">What time do you plan to arrive?</Label>
                        <Input
                            id="checkInTime"
                            type="time"
                            value={actualCheckInTime}
                            onChange={(e) => setActualCheckInTime(e.target.value)}
                            className="w-40"
                        />
                        <p className="text-sm text-[#636E72]">
                            Standard check-in time is 2:00 PM. Let us know your estimated arrival.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Document Verification */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[#E17055]" />
                        ID Verification
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {documents.length > 0 ? (
                        <div className="space-y-3">
                            <p className="text-sm text-[#636E72] mb-3">
                                Select an ID document to verify your check-in (optional but recommended):
                            </p>
                            {documents.map((doc) => (
                                <div
                                    key={doc.id}
                                    className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-colors ${selectedDocumentId === doc.id
                                        ? "border-[#E17055] bg-[#E17055]/5"
                                        : "border-gray-200 hover:border-gray-300"
                                        }`}
                                    onClick={() => setSelectedDocumentId(doc.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedDocumentId === doc.id
                                            ? "border-[#E17055] bg-[#E17055]"
                                            : "border-gray-300"
                                            }`}>
                                            {selectedDocumentId === doc.id && (
                                                <CheckCircle2 className="w-3 h-3 text-white" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium">{doc.documentType}</p>
                                            <p className="text-sm text-[#636E72]">
                                                {doc.verified ? "Verified" : "Pending verification"}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge className={doc.verified ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>
                                        {doc.verified ? "Verified" : "Pending"}
                                    </Badge>
                                </div>
                            ))}
                            <p className="text-sm text-[#636E72] mt-3">
                                You can also upload a new document in the Documents section before checking in.
                            </p>
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <Upload className="w-12 h-12 text-[#B2BEC3] mx-auto mb-3" />
                            <p className="text-[#636E72] mb-4">
                                No ID documents on file. We recommend uploading an ID for faster check-in.
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => router.push("/documents")}
                                className="mx-auto"
                            >
                                Upload Document
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Terms Acknowledgement */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                        <Checkbox
                            id="terms"
                            checked={acknowledgeTerms}
                            onCheckedChange={(checked) => setAcknowledgeTerms(checked as boolean)}
                            className="mt-1"
                        />
                        <div>
                            <Label htmlFor="terms" className="text-base font-medium cursor-pointer">
                                I acknowledge and agree to the following:
                            </Label>
                            <ul className="mt-3 space-y-2 text-sm text-[#636E72]">
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-[#00B894] mt-0.5 shrink-0" />
                                    I confirm that the booking details are correct
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-[#00B894] mt-0.5 shrink-0" />
                                    I agree to the property's check-in/check-out times and policies
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-[#00B894] mt-0.5 shrink-0" />
                                    I accept responsibility for any damages during my stay
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-[#00B894] mt-0.5 shrink-0" />
                                    I authorize the property to charge my payment method for any additional services
                                </li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Submit Button */}
            <Button
                onClick={handleCheckIn}
                disabled={submitting || !acknowledgeTerms}
                className="w-full h-14 text-lg bg-[#E17055] hover:bg-[#D35B3F] disabled:opacity-50"
            >
                {submitting ? (
                    <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing Check-in...
                    </>
                ) : (
                    <>
                        <Key className="w-5 h-5 mr-2" />
                        Complete Check-in
                    </>
                )}
            </Button>

            {message && (
                <p className="text-center text-sm text-[#636E72]">{message}</p>
            )}
        </div>
    );
}