"use client";

import { useEffect, useState } from "react";
import { formatDate, formatCurrency } from "@the-rooms/ui";
import {
    Loader2,
    AlertCircle,
    CheckCircle2,
    Clock,
    Users,
    CreditCard,
    Bed,
    AlertTriangle,
    Calendar,
    TrendingUp,
    RefreshCw,
    ExternalLink,
    FileText,
} from "lucide-react";

interface NightAuditReport {
    date: string;
    isClosed: boolean;
    closeRecord: {
        id: string;
        closedAt: string;
        closedBy: { name: string };
        totalCheckIns: number;
        totalCheckOuts: number;
        totalOccupied: number;
        totalRevenue: string;
        totalPayments: number;
        totalCharges: number;
        discrepancies: number;
        roomChargesPosted: boolean;
        notes: string;
    } | null;
    summary: {
        totalRooms: number;
        occupiedRooms: number;
        vacantRooms: number;
        maintenanceRooms: number;
        occupancyRate: string;
        expectedCheckIns: number;
        actualCheckIns: number;
        expectedCheckOuts: number;
        totalPayments: number;
        totalPaymentsAmount: number;
        totalRoomCharges: number;
        discrepanciesFound: number;
    };
    checkIns: Array<{
        id: string;
        bookingNumber: string;
        checkIn: string;
        guest: { name: string; phone: string };
        room: { roomNumber: string; type: string };
    }>;
    checkOuts: Array<{
        id: string;
        bookingNumber: string;
        checkOut: string;
        guest: { name: string; phone: string };
        room: { roomNumber: string; type: string };
    }>;
    checkedInBookings: Array<{
        id: string;
        bookingNumber: string;
        checkInTime: string;
        guest: { name: string; phone: string };
        room: { roomNumber: string; type: string };
    }>;
    payments: Array<{
        id: string;
        amount: string;
        method: string;
        createdAt: string;
        booking: {
            bookingNumber: string;
            guest: { name: string };
            room: { roomNumber: string };
        };
    }>;
    roomCharges: Array<{
        id: string;
        totalAmount: string;
        chargeDate: string;
        booking: {
            bookingNumber: string;
            guest: { name: string };
            room: { roomNumber: string };
        };
    }>;
    discrepancies: Array<{
        id: string;
        type: string;
        severity: string;
        description: string;
        booking?: {
            bookingNumber: string;
            guest: { name: string };
            room: { roomNumber: string };
        };
    }>;
}

export default function NightAuditPage() {
    const [report, setReport] = useState<NightAuditReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState(
        new Date().toISOString().split("T")[0]
    );

    useEffect(() => {
        fetchReport();
    }, [selectedDate]);

    async function fetchReport() {
        setLoading(true);
        setError(null);
        try {
            // Fetch from front-office API via relative path
            const res = await fetch(
                `/api/night-audit/report?date=${selectedDate}`
            );
            if (!res.ok) throw new Error("Failed to fetch report");
            const data = await res.json();
            setReport(data.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#E17055]" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-gray-900 font-medium">{error}</p>
                    <button
                        onClick={fetchReport}
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#E17055] px-4 py-2 text-sm font-medium text-white hover:bg-[#D35B3F]"
                    >
                        <RefreshCw className="h-4 w-4" /> Retry
                    </button>
                </div>
            </div>
        );
    }

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case "CRITICAL":
                return "text-red-600 bg-red-50";
            case "HIGH":
                return "text-orange-600 bg-orange-50";
            case "MEDIUM":
                return "text-yellow-600 bg-yellow-50";
            case "LOW":
                return "text-blue-600 bg-blue-50";
            default:
                return "text-gray-600 bg-gray-50";
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        Night Audit
                    </h2>
                    <p className="text-gray-500">
                        {report?.date ? formatDate(report.date, "full") : "Select a date"}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        max={new Date().toISOString().split("T")[0]}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[#E17055] focus:outline-none focus:ring-1 focus:ring-[#E17055]"
                    />
                    <button
                        onClick={fetchReport}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        <RefreshCw className="h-4 w-4" /> Refresh
                    </button>
                    <a
                        href="/night-audit"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-[#E17055] px-4 py-2 text-sm font-medium text-white hover:bg-[#D35B3F]"
                    >
                        <ExternalLink className="h-4 w-4" /> Open in Front Office
                    </a>
                </div>
            </div>

            {/* Info Banner */}
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                        <p className="font-medium text-blue-800">
                            Night Audit Management
                        </p>
                        <p className="text-sm text-blue-600">
                            View night audit reports and status here. To perform night audit operations (post charges, close day, process no-shows), use the Front Office portal.
                        </p>
                    </div>
                </div>
            </div>

            {/* Status Banner */}
            {report?.isClosed ? (
                <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                        <div>
                            <p className="font-medium text-green-800">
                                Day Closed
                            </p>
                            <p className="text-sm text-green-600">
                                Closed by {report.closeRecord?.closedBy?.name} on{" "}
                                {report.closeRecord?.closedAt
                                    ? formatDate(report.closeRecord.closedAt, "full")
                                    : "N/A"}
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
                    <div className="flex items-center gap-3">
                        <Clock className="h-6 w-6 text-yellow-600" />
                        <div>
                            <p className="font-medium text-yellow-800">
                                Day Not Closed
                            </p>
                            <p className="text-sm text-yellow-600">
                                This date has not been closed yet. Operations pending in Front Office.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">
                                Occupancy Rate
                            </p>
                            <p className="mt-2 text-3xl font-bold text-gray-900">
                                {report?.summary.occupancyRate}%
                            </p>
                        </div>
                        <div className="rounded-lg bg-blue-100 p-3">
                            <TrendingUp className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                        {report?.summary.occupiedRooms} of {report?.summary.totalRooms}{" "}
                        rooms occupied
                    </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">
                                Expected Check-ins
                            </p>
                            <p className="mt-2 text-3xl font-bold text-gray-900">
                                {report?.summary.expectedCheckIns}
                            </p>
                        </div>
                        <div className="rounded-lg bg-green-100 p-3">
                            <Users className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                        {report?.summary.actualCheckIns} actually checked in
                    </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">
                                Expected Check-outs
                            </p>
                            <p className="mt-2 text-3xl font-bold text-gray-900">
                                {report?.summary.expectedCheckOuts}
                            </p>
                        </div>
                        <div className="rounded-lg bg-orange-100 p-3">
                            <Calendar className="h-6 w-6 text-orange-600" />
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">
                                Total Revenue
                            </p>
                            <p className="mt-2 text-3xl font-bold text-gray-900">
                                {report?.summary.totalPaymentsAmount
                                    ? formatCurrency(report.summary.totalPaymentsAmount)
                                    : "₹0"}
                            </p>
                        </div>
                        <div className="rounded-lg bg-emerald-100 p-3">
                            <CreditCard className="h-6 w-6 text-emerald-600" />
                        </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                        {report?.summary.totalPayments} payments received
                    </p>
                </div>
            </div>

            {/* Discrepancy Alerts */}
            {report &&
                report.discrepancies &&
                report.discrepancies.length > 0 && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <AlertTriangle className="h-6 w-6 text-red-600" />
                            <h3 className="text-lg font-semibold text-red-800">
                                Discrepancies Found ({report.discrepancies.length})
                            </h3>
                        </div>
                        <div className="space-y-3">
                            {report.discrepancies.map((disc) => (
                                <div
                                    key={disc.id}
                                    className={`rounded-lg p-4 ${getSeverityColor(disc.severity)}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-medium">{disc.type.replace(/_/g, " ")}</p>
                                            <p className="text-sm mt-1">{disc.description}</p>
                                            {disc.booking && (
                                                <p className="text-sm mt-1">
                                                    Booking: {disc.booking.bookingNumber} - Room{" "}
                                                    {disc.booking.room.roomNumber}
                                                </p>
                                            )}
                                        </div>
                                        <span className="text-xs font-medium uppercase">
                                            {disc.severity}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Arrivals */}
                <div className="rounded-xl border border-gray-200 bg-white">
                    <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Check-ins
                        </h3>
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                            {report?.checkIns.length ?? 0}
                        </span>
                    </div>
                    <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                        {report?.checkIns.length === 0 ? (
                            <div className="px-6 py-12 text-center">
                                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500">No check-ins scheduled</p>
                            </div>
                        ) : (
                            report?.checkIns.map((checkIn) => (
                                <div
                                    key={checkIn.id}
                                    className="flex items-center justify-between px-6 py-4"
                                >
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {checkIn.guest.name}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {checkIn.guest.phone}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-gray-900">
                                            Room {checkIn.room.roomNumber}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {checkIn.room.type}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Departures */}
                <div className="rounded-xl border border-gray-200 bg-white">
                    <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Check-outs
                        </h3>
                        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
                            {report?.checkOuts.length ?? 0}
                        </span>
                    </div>
                    <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                        {report?.checkOuts.length === 0 ? (
                            <div className="px-6 py-12 text-center">
                                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500">No check-outs scheduled</p>
                            </div>
                        ) : (
                            report?.checkOuts.map((checkOut) => (
                                <div
                                    key={checkOut.id}
                                    className="flex items-center justify-between px-6 py-4"
                                >
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {checkOut.guest.name}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {checkOut.guest.phone}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-gray-900">
                                            Room {checkOut.room.roomNumber}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Check-out: {formatDate(checkOut.checkOut, "short")}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Payments */}
            <div className="rounded-xl border border-gray-200 bg-white">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Payments Received
                    </h3>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                        {report?.payments.length ?? 0}
                    </span>
                </div>
                <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                    {report?.payments.length === 0 ? (
                        <div className="px-6 py-12 text-center">
                            <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No payments received</p>
                        </div>
                    ) : (
                        report?.payments.map((payment) => (
                            <div
                                key={payment.id}
                                className="flex items-center justify-between px-6 py-4"
                            >
                                <div>
                                    <p className="font-medium text-gray-900">
                                        {payment.booking.guest.name}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {payment.booking.bookingNumber} - Room{" "}
                                        {payment.booking.room.roomNumber}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium text-gray-900">
                                        {formatCurrency(Number(payment.amount))}
                                    </p>
                                    <p className="text-sm text-gray-500">{payment.method}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Room Charges */}
            <div className="rounded-xl border border-gray-200 bg-white">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Room Charges Posted
                    </h3>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                        {report?.roomCharges.length ?? 0}
                    </span>
                </div>
                <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                    {report?.roomCharges.length === 0 ? (
                        <div className="px-6 py-12 text-center">
                            <Bed className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No room charges posted</p>
                        </div>
                    ) : (
                        report?.roomCharges.map((charge) => (
                            <div
                                key={charge.id}
                                className="flex items-center justify-between px-6 py-4"
                            >
                                <div>
                                    <p className="font-medium text-gray-900">
                                        {charge.booking.guest.name}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {charge.booking.bookingNumber} - Room{" "}
                                        {charge.booking.room.roomNumber}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium text-gray-900">
                                        {formatCurrency(Number(charge.totalAmount))}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {formatDate(charge.chargeDate, "short")}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Room Status */}
            <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Room Status
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-3xl font-bold text-green-600">
                            {report?.summary.vacantRooms ?? 0}
                        </p>
                        <p className="text-sm text-gray-600">Vacant</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-3xl font-bold text-blue-600">
                            {report?.summary.occupiedRooms ?? 0}
                        </p>
                        <p className="text-sm text-gray-600">Occupied</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <p className="text-3xl font-bold text-orange-600">
                            {report?.summary.maintenanceRooms ?? 0}
                        </p>
                        <p className="text-sm text-gray-600">Maintenance</p>
                    </div>
                    <div className="text-center p-4 bg-gray-100 rounded-lg">
                        <p className="text-3xl font-bold text-gray-600">
                            {report?.summary.totalRooms ?? 0}
                        </p>
                        <p className="text-sm text-gray-600">Total</p>
                    </div>
                </div>
            </div>
        </div>
    );
}