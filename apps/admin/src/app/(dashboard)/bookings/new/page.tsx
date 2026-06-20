"use client";

// apps/admin/src/app/(dashboard)/bookings/new/page.tsx
// Walk-in Booking Creation Page for Admin Portal

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarPlus, User, CreditCard, BedDouble, Save, Loader2, AlertCircle } from "lucide-react";
import { PageHeader, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, SelectTrigger, SelectContent, SelectValue } from "@the-rooms/ui";
import { formatCurrency } from "@the-rooms/ui";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RoomType {
    id: string;
    name: string;
    basePriceSingle: number;
    basePriceDouble: number;
}

interface PricingPreview {
    basePrice: number;
    nights: number;
    totalAmount: number;
    roomType: string;
}

interface WalkinFormData {
    // Guest Info
    guestName: string;
    guestPhone: string;
    guestEmail: string;
    guestAddress: string;
    // Booking Info
    roomType: "STUDIO" | "PREMIUM";
    checkIn: string;
    checkOut: string;
    guestsCount: number;
    bookingType: "DAILY" | "MONTHLY";
    // Payment Info
    paymentMethod: "CASH" | "UPI" | "CARD" | "ONLINE";
    paymentAmount: string;
    discountCode: string;
    // Options
    specialRequests: string;
    assignmentType: "PRE_ASSIGNED" | "AUTO_ASSIGN";
}

// ─── Default Values ───────────────────────────────────────────────────────────

function getDefaultFormData(): WalkinFormData {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const formatDateInput = (date: Date) => date.toISOString().split('T')[0];

    return {
        guestName: "",
        guestPhone: "",
        guestEmail: "",
        guestAddress: "",
        roomType: "STUDIO",
        checkIn: formatDateInput(today),
        checkOut: formatDateInput(tomorrow),
        guestsCount: 1,
        bookingType: "DAILY",
        paymentMethod: "CASH",
        paymentAmount: "",
        discountCode: "",
        specialRequests: "",
        assignmentType: "PRE_ASSIGNED",
    };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewWalkinBookingPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<WalkinFormData>(getDefaultFormData());
    const [pricing, setPricing] = useState<PricingPreview | null>(null);
    const [calculatingPrice, setCalculatingPrice] = useState(false);

    // Calculate nights from dates
    const calculateNights = () => {
        if (!formData.checkIn || !formData.checkOut) return 0;
        const checkIn = new Date(formData.checkIn);
        const checkOut = new Date(formData.checkOut);
        const diff = checkOut.getTime() - checkIn.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    // Update pricing when relevant fields change
    useEffect(() => {
        const nights = calculateNights();
        if (nights <= 0 || !formData.roomType) {
            setPricing(null);
            return;
        }

        // Simple client-side pricing calculation
        // In production, this would call an API to get accurate pricing
        const basePrice = formData.roomType === "STUDIO" ? 1499 : 2499;
        const isMonthly = formData.bookingType === "MONTHLY" || (nights >= 28 && formData.roomType === "STUDIO");
        const multiplier = isMonthly ? 0.85 : 1; // 15% discount for monthly
        const total = basePrice * nights * multiplier;

        setPricing({
            basePrice,
            nights,
            totalAmount: total,
            roomType: formData.roomType,
        });
    }, [formData.checkIn, formData.checkOut, formData.roomType, formData.bookingType]);

    const updateField = <K extends keyof WalkinFormData>(field: K, value: WalkinFormData[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!formData.guestName.trim()) {
            setError("Guest name is required");
            return;
        }
        if (!formData.guestPhone.trim() || formData.guestPhone.length < 10) {
            setError("Valid phone number is required");
            return;
        }
        if (!formData.checkIn || !formData.checkOut) {
            setError("Check-in and check-out dates are required");
            return;
        }
        if (calculateNights() <= 0) {
            setError("Check-out must be after check-in");
            return;
        }

        setLoading(true);

        try {
            const checkInDate = new Date(formData.checkIn);
            checkInDate.setHours(14, 0, 0, 0); // Standard check-in time
            const checkOutDate = new Date(formData.checkOut);
            checkOutDate.setHours(12, 0, 0, 0); // Standard check-out time

            const payload = {
                guest: {
                    name: formData.guestName.trim(),
                    phone: formData.guestPhone.trim(),
                    email: formData.guestEmail.trim() || undefined,
                    address: formData.guestAddress.trim() || undefined,
                },
                roomType: formData.roomType,
                checkIn: checkInDate.toISOString(),
                checkOut: checkOutDate.toISOString(),
                guestsCount: formData.guestsCount,
                bookingType: formData.bookingType,
                paymentMethod: formData.paymentMethod,
                paymentAmount: formData.paymentAmount ? parseFloat(formData.paymentAmount) : undefined,
                discountCode: formData.discountCode.trim() || undefined,
                specialRequests: formData.specialRequests.trim() || undefined,
                assignmentType: formData.assignmentType,
            };

            const response = await fetch("/api/bookings/walkin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok) {
                if (result.error === "NO_ROOM_AVAILABLE") {
                    throw new Error("No rooms available for the selected dates and room type");
                }
                if (result.error === "GUEST_BLACKLISTED") {
                    throw new Error("This guest is blacklisted and cannot make bookings");
                }
                throw new Error(result.error || result.message || "Failed to create booking");
            }

            // Success - redirect to the booking details page
            router.push(`/bookings/${result.booking.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create booking");
            setLoading(false);
        }
    };

    const nights = calculateNights();

    return (
        <div className="space-y-6">
            <PageHeader
                title="New Walk-in Booking"
                description="Create a walk-in booking for a new or existing guest"
                actions={
                    <Button variant="outline" onClick={() => router.push("/bookings")}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Bookings
                    </Button>
                }
            />

            {error && (
                <Card className="border-red-300 bg-red-50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-red-700">
                            <AlertCircle className="h-5 w-5" />
                            <span>{error}</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Left Column - Guest & Booking Info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Guest Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    Guest Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="guestName">Guest Name *</Label>
                                        <Input
                                            id="guestName"
                                            value={formData.guestName}
                                            onChange={(e) => updateField("guestName", e.target.value)}
                                            placeholder="Enter guest full name"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="guestPhone">Phone Number *</Label>
                                        <Input
                                            id="guestPhone"
                                            type="tel"
                                            value={formData.guestPhone}
                                            onChange={(e) => updateField("guestPhone", e.target.value)}
                                            placeholder="+91 98765 43210"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="guestEmail">Email</Label>
                                        <Input
                                            id="guestEmail"
                                            type="email"
                                            value={formData.guestEmail}
                                            onChange={(e) => updateField("guestEmail", e.target.value)}
                                            placeholder="guest@example.com"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="guestAddress">Address</Label>
                                        <Input
                                            id="guestAddress"
                                            value={formData.guestAddress}
                                            onChange={(e) => updateField("guestAddress", e.target.value)}
                                            placeholder="Guest address (optional)"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Room Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BedDouble className="h-5 w-5" />
                                    Room Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="roomType">Room Type *</Label>
                                        <Select value={formData.roomType} onValueChange={(v) => updateField("roomType", v as "STUDIO" | "PREMIUM")}>
                                            <SelectTrigger id="roomType">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <option value="STUDIO">Studio</option>
                                                <option value="PREMIUM">Premium</option>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="guestsCount">Number of Guests</Label>
                                        <Input
                                            id="guestsCount"
                                            type="number"
                                            min={1}
                                            max={4}
                                            value={formData.guestsCount}
                                            onChange={(e) => updateField("guestsCount", parseInt(e.target.value) || 1)}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="checkIn">Check-in Date *</Label>
                                        <Input
                                            id="checkIn"
                                            type="date"
                                            value={formData.checkIn}
                                            onChange={(e) => updateField("checkIn", e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="checkOut">Check-out Date *</Label>
                                        <Input
                                            id="checkOut"
                                            type="date"
                                            value={formData.checkOut}
                                            onChange={(e) => updateField("checkOut", e.target.value)}
                                            min={formData.checkIn}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="bookingType">Booking Type</Label>
                                        <Select value={formData.bookingType} onValueChange={(v) => updateField("bookingType", v as "DAILY" | "MONTHLY")}>
                                            <SelectTrigger id="bookingType">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <option value="DAILY">Daily</option>
                                                <option value="MONTHLY">Monthly</option>
                                            </SelectContent>
                                        </Select>
                                        {nights >= 28 && formData.roomType === "STUDIO" && (
                                            <p className="text-xs text-muted-foreground">
                                                Monthly pricing applied automatically (28+ nights)
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="assignmentType">Room Assignment</Label>
                                        <Select value={formData.assignmentType} onValueChange={(v) => updateField("assignmentType", v as "PRE_ASSIGNED" | "AUTO_ASSIGN")}>
                                            <SelectTrigger id="assignmentType">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <option value="PRE_ASSIGNED">Pre-assigned Room</option>
                                                <option value="AUTO_ASSIGN">Auto-assign on Check-in</option>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="specialRequests">Special Requests</Label>
                                    <textarea
                                        id="specialRequests"
                                        className="w-full p-3 border rounded-lg text-sm min-h-[80px]"
                                        value={formData.specialRequests}
                                        onChange={(e) => updateField("specialRequests", e.target.value)}
                                        placeholder="Any special requests or notes..."
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - Pricing & Payment */}
                    <div className="space-y-6">
                        {/* Pricing Summary */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CalendarPlus className="h-5 w-5" />
                                    Pricing Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {pricing ? (
                                    <>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Room Type</span>
                                            <span className="font-medium">{pricing.roomType}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Base Price</span>
                                            <span>{formatCurrency(pricing.basePrice)}/night</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Number of Nights</span>
                                            <span className="font-medium">{pricing.nights}</span>
                                        </div>
                                        {formData.bookingType === "MONTHLY" || (nights >= 28 && formData.roomType === "STUDIO") ? (
                                            <div className="flex justify-between text-sm text-green-600">
                                                <span>Monthly Discount</span>
                                                <span>-15%</span>
                                            </div>
                                        ) : null}
                                        <div className="border-t pt-2">
                                            <div className="flex justify-between font-semibold text-lg">
                                                <span>Total Amount</span>
                                                <span className="text-primary">{formatCurrency(pricing.totalAmount)}</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        Enter dates to see pricing
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Payment Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5" />
                                    Payment Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="paymentMethod">Payment Method</Label>
                                    <Select value={formData.paymentMethod} onValueChange={(v) => updateField("paymentMethod", v as "CASH" | "UPI" | "CARD" | "ONLINE")}>
                                        <SelectTrigger id="paymentMethod">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <option value="CASH">Cash</option>
                                            <option value="UPI">UPI</option>
                                            <option value="CARD">Card</option>
                                            <option value="ONLINE">Online</option>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="paymentAmount">Advance Payment</Label>
                                    <Input
                                        id="paymentAmount"
                                        type="number"
                                        min={0}
                                        value={formData.paymentAmount}
                                        onChange={(e) => updateField("paymentAmount", e.target.value)}
                                        placeholder="Enter amount (optional)"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Leave empty if collecting payment later
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="discountCode">Discount Code</Label>
                                    <Input
                                        id="discountCode"
                                        value={formData.discountCode}
                                        onChange={(e) => updateField("discountCode", e.target.value.toUpperCase())}
                                        placeholder="Enter code (optional)"
                                        className="font-mono"
                                    />
                                </div>
                                {formData.paymentAmount && pricing && (
                                    <div className="border-t pt-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Amount Paid</span>
                                            <span className="text-green-600 font-medium">
                                                {formatCurrency(parseFloat(formData.paymentAmount) || 0)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Balance Due</span>
                                            <span className="text-orange-600 font-medium">
                                                {formatCurrency(Math.max(0, pricing.totalAmount - (parseFloat(formData.paymentAmount) || 0)))}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full"
                            size="lg"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Creating Booking...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Create Walk-in Booking
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}