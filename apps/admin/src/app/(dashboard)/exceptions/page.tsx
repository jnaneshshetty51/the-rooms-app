"use client";

// apps/admin/src/app/(dashboard)/exceptions/page.tsx
// Exception Handling - Overbooking resolution, payment mismatch, missing documents

import { useEffect, useState } from "react";
import {
    RefreshCw,
    AlertTriangle,
    AlertCircle,
    CheckCircle,
    XCircle,
    BedDouble,
    CreditCard,
    FileText,
    Clock,
} from "lucide-react";
import {
    PageHeader,
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Badge,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Select,
    SelectTrigger,
    SelectContent,
    SelectValue,
} from "@the-rooms/ui";
import { formatDate } from "@the-rooms/ui";
import { cn } from "@the-rooms/ui";

type ExceptionType = "OVERBOOKING" | "PAYMENT_MISMATCH" | "MISSING_DOCUMENT" | "PRICING_ERROR" | "DOUBLE_BOOKING";
type ExceptionStatus = "OPEN" | "RESOLVED" | "ESCALATED" | "DISMISSED";

interface Exception {
    id: string;
    type: ExceptionType;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    status: ExceptionStatus;
    title: string;
    description: string;
    entityType: "BOOKING" | "ROOM" | "PAYMENT" | "GUEST";
    entityId: string;
    relatedEntities: { type: string; id: string; label: string }[];
    resolution: string | null;
    resolvedBy: string | null;
    resolvedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

const EXCEPTION_TYPE_CONFIG: Record<ExceptionType, { label: string; icon: React.ElementType; bg: string }> = {
    OVERBOOKING: { label: "Overbooking", icon: BedDouble, bg: "bg-red-100" },
    PAYMENT_MISMATCH: { label: "Payment Mismatch", icon: CreditCard, bg: "bg-orange-100" },
    MISSING_DOCUMENT: { label: "Missing Document", icon: FileText, bg: "bg-yellow-100" },
    PRICING_ERROR: { label: "Pricing Error", icon: AlertCircle, bg: "bg-purple-100" },
    DOUBLE_BOOKING: { label: "Double Booking", icon: XCircle, bg: "bg-red-100" },
};

const SEVERITY_CONFIG = {
    LOW: { label: "Low", bg: "bg-gray-100", text: "text-gray-700" },
    MEDIUM: { label: "Medium", bg: "bg-yellow-100", text: "text-yellow-700" },
    HIGH: { label: "High", bg: "bg-orange-100", text: "text-orange-700" },
    CRITICAL: { label: "Critical", bg: "bg-red-100", text: "text-red-700" },
};

const STATUS_CONFIG = {
    OPEN: { label: "Open", bg: "bg-red-100", text: "text-red-700", icon: AlertCircle },
    RESOLVED: { label: "Resolved", bg: "bg-green-100", text: "text-green-700", icon: CheckCircle },
    ESCALATED: { label: "Escalated", bg: "bg-purple-100", text: "text-purple-700", icon: AlertTriangle },
    DISMISSED: { label: "Dismissed", bg: "bg-gray-100", text: "text-gray-700", icon: XCircle },
};

const MOCK_EXCEPTIONS: Exception[] = [
    {
        id: "1",
        type: "OVERBOOKING",
        severity: "CRITICAL",
        status: "OPEN",
        title: "Room 203 double booked",
        description: "Room 203 has been booked for two different guests on the same dates (June 20-22).",
        entityType: "ROOM",
        entityId: "203",
        relatedEntities: [
            { type: "BOOKING", id: "BKN-20240615-0001", label: "Booking BKN-20240615-0001" },
            { type: "BOOKING", id: "BKN-20240615-0002", label: "Booking BKN-20240615-0002" },
        ],
        resolution: null,
        resolvedBy: null,
        resolvedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "2",
        type: "PAYMENT_MISMATCH",
        severity: "HIGH",
        status: "OPEN",
        title: "Payment amount discrepancy",
        description: "Invoice amount is ₹15,000 but payment received is only ₹14,500. Missing ₹500.",
        entityType: "PAYMENT",
        entityId: "PAY-2024-0045",
        relatedEntities: [
            { type: "INVOICE", id: "INV-20240610-0003", label: "Invoice INV-20240610-0003" },
        ],
        resolution: null,
        resolvedBy: null,
        resolvedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "3",
        type: "MISSING_DOCUMENT",
        severity: "MEDIUM",
        status: "ESCALATED",
        title: "Guest ID verification pending",
        description: "Guest Arjun Sharma (Booking BKN-20240618-0008) has not submitted ID proof.",
        entityType: "GUEST",
        entityId: "GST-00234",
        relatedEntities: [
            { type: "BOOKING", id: "BKN-20240618-0008", label: "Booking BKN-20240618-0008" },
        ],
        resolution: null,
        resolvedBy: null,
        resolvedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "4",
        type: "DOUBLE_BOOKING",
        severity: "CRITICAL",
        status: "RESOLVED",
        title: "Room 305 double booking resolved",
        description: "Room 305 was accidentally assigned to two guests. One booking was moved to Room 307.",
        entityType: "ROOM",
        entityId: "305",
        relatedEntities: [
            { type: "BOOKING", id: "BKN-20240612-0005", label: "Original booking" },
            { type: "ROOM", id: "307", label: "New room assigned" },
        ],
        resolution: "Guest was moved to Room 307 at no additional cost. Original booking updated.",
        resolvedBy: "Admin User",
        resolvedAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
    },
];

export default function ExceptionsPage() {
    const [exceptions, setExceptions] = useState<Exception[]>(MOCK_EXCEPTIONS);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<"ALL" | ExceptionStatus>("ALL");
    const [typeFilter, setTypeFilter] = useState<"ALL" | ExceptionType>("ALL");
    const [selectedException, setSelectedException] = useState<Exception | null>(null);

    const openCount = exceptions.filter((e) => e.status === "OPEN").length;
    const escalatedCount = exceptions.filter((e) => e.status === "ESCALATED").length;
    const criticalCount = exceptions.filter((e) => e.severity === "CRITICAL" && e.status !== "RESOLVED").length;

    const filteredExceptions = exceptions.filter((e) => {
        if (filter !== "ALL" && e.status !== filter) return false;
        if (typeFilter !== "ALL" && e.type !== typeFilter) return false;
        return true;
    });

    const resolveException = (exceptionId: string, resolution: string) => {
        setExceptions((prev) =>
            prev.map((e) =>
                e.id === exceptionId
                    ? { ...e, status: "RESOLVED" as ExceptionStatus, resolution, resolvedBy: "Admin", resolvedAt: new Date().toISOString() }
                    : e
            )
        );
        setSelectedException(null);
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Exception Handling"
                description="Resolve operational exceptions and conflicts"
                actions={
                    <Button variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                    </Button>
                }
            />

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-red-300">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-red-600">{openCount}</p>
                            <p className="text-xs text-muted-foreground">Open</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-purple-300">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-purple-600">{escalatedCount}</p>
                            <p className="text-xs text-muted-foreground">Escalated</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-red-300">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-red-600">{criticalCount}</p>
                            <p className="text-xs text-muted-foreground">Critical</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold">{exceptions.length}</p>
                            <p className="text-xs text-muted-foreground">Total</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Status</SelectItem>
                        <SelectItem value="OPEN">Open</SelectItem>
                        <SelectItem value="ESCALATED">Escalated</SelectItem>
                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Exception Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Types</SelectItem>
                        <SelectItem value="OVERBOOKING">Overbooking</SelectItem>
                        <SelectItem value="PAYMENT_MISMATCH">Payment Mismatch</SelectItem>
                        <SelectItem value="MISSING_DOCUMENT">Missing Document</SelectItem>
                        <SelectItem value="PRICING_ERROR">Pricing Error</SelectItem>
                        <SelectItem value="DOUBLE_BOOKING">Double Booking</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Exceptions List */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Exceptions ({filteredExceptions.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {filteredExceptions.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            No exceptions found matching the filter
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredExceptions.map((exception) => {
                                const typeConfig = EXCEPTION_TYPE_CONFIG[exception.type];
                                const severity = SEVERITY_CONFIG[exception.severity];
                                const status = STATUS_CONFIG[exception.status];
                                const TypeIcon = typeConfig.icon;

                                return (
                                    <div
                                        key={exception.id}
                                        onClick={() => setSelectedException(exception)}
                                        className={cn(
                                            "flex items-start justify-between rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md",
                                            exception.status === "RESOLVED" && "opacity-60",
                                            exception.severity === "CRITICAL" && exception.status !== "RESOLVED" && "border-l-4 border-l-red-500"
                                        )}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={cn("h-12 w-12 rounded-lg flex items-center justify-center", typeConfig.bg)}>
                                                <TypeIcon className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", severity.bg, severity.text)}>
                                                        {severity.label}
                                                    </span>
                                                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", status.bg, status.text)}>
                                                        {status.label}
                                                    </span>
                                                </div>
                                                <h3 className="font-semibold mt-1">{exception.title}</h3>
                                                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{exception.description}</p>
                                                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                                    <Clock className="h-3 w-3" />
                                                    {formatDate(exception.createdAt, "short")}
                                                    {exception.resolvedBy && (
                                                        <>
                                                            <span>·</span>
                                                            <CheckCircle className="h-3 w-3 text-green-600" />
                                                            <span>Resolved by {exception.resolvedBy}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Exception Details Dialog */}
            {selectedException && (
                <Dialog open onOpenChange={() => setSelectedException(null)}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-3">
                                {(() => {
                                    const TypeIcon = EXCEPTION_TYPE_CONFIG[selectedException.type].icon;
                                    return <TypeIcon className="h-6 w-6" />;
                                })()}
                                <div>
                                    <span>{selectedException.title}</span>
                                    <p className="text-sm font-normal text-muted-foreground">
                                        {EXCEPTION_TYPE_CONFIG[selectedException.type].label}
                                    </p>
                                </div>
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            {/* Severity & Status */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-muted-foreground">Severity</p>
                                    <span className={cn(
                                        "text-xs px-2 py-0.5 rounded-full font-medium inline-block mt-1",
                                        SEVERITY_CONFIG[selectedException.severity].bg,
                                        SEVERITY_CONFIG[selectedException.severity].text
                                    )}>
                                        {SEVERITY_CONFIG[selectedException.severity].label}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Status</p>
                                    <span className={cn(
                                        "text-xs px-2 py-0.5 rounded-full font-medium inline-block mt-1",
                                        STATUS_CONFIG[selectedException.status].bg,
                                        STATUS_CONFIG[selectedException.status].text
                                    )}>
                                        {STATUS_CONFIG[selectedException.status].label}
                                    </span>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <p className="text-xs text-muted-foreground">Description</p>
                                <p className="text-sm mt-1">{selectedException.description}</p>
                            </div>

                            {/* Related Entities */}
                            {selectedException.relatedEntities.length > 0 && (
                                <div>
                                    <p className="text-xs text-muted-foreground mb-2">Related Entities</p>
                                    <div className="space-y-1">
                                        {selectedException.relatedEntities.map((entity) => (
                                            <div key={entity.id} className="flex items-center gap-2 text-sm">
                                                <span className="px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground text-xs">
                                                    {entity.type}
                                                </span>
                                                <span>{entity.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Resolution */}
                            {selectedException.resolution && (
                                <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                                    <p className="text-xs text-green-600 font-medium">Resolution</p>
                                    <p className="text-sm text-green-700 mt-1">{selectedException.resolution}</p>
                                    <p className="text-xs text-green-600 mt-1">
                                        By {selectedException.resolvedBy} on {formatDate(selectedException.resolvedAt!, "long")}
                                    </p>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setSelectedException(null)}>Close</Button>
                            {selectedException.status === "OPEN" && (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setExceptions((prev) =>
                                                prev.map((e) =>
                                                    e.id === selectedException.id ? { ...e, status: "ESCALATED" as ExceptionStatus } : e
                                                )
                                            );
                                            setSelectedException(null);
                                        }}
                                    >
                                        Escalate
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            const resolution = prompt("Enter resolution:");
                                            if (resolution) resolveException(selectedException.id, resolution);
                                        }}
                                    >
                                        Resolve
                                    </Button>
                                </>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

// Placeholder components
function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
    return <option value={value}>{children}</option>;
}
