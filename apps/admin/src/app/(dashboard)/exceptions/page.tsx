"use client";

// apps/admin/src/app/(dashboard)/exceptions/page.tsx
// Exception Handling - Overbooking resolution, payment mismatch, missing documents

import { useEffect, useState, useCallback } from "react";
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
    Input,
    useToast,
} from "@the-rooms/ui";
import { formatDate } from "@the-rooms/ui";
import { cn } from "@the-rooms/ui";
import {
    fetchExceptions,
    updateException,
    resolveException,
    escalateException,
    Exception,
    ExceptionType,
    ExceptionStatus,
} from "@/lib/api";

// ─── Config ────────────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExceptionsPage() {
    const [exceptions, setExceptions] = useState<Exception[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<"ALL" | ExceptionStatus>("ALL");
    const [typeFilter, setTypeFilter] = useState<"ALL" | ExceptionType>("ALL");
    const [selectedException, setSelectedException] = useState<Exception | null>(null);
    const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
    const [resolutionText, setResolutionText] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const { toast } = useToast();

    // ─── Data Fetching ─────────────────────────────────────────────────────────

    const loadExceptions = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const filters: { status?: ExceptionStatus; type?: ExceptionType } = {};
            if (filter !== "ALL") filters.status = filter;
            if (typeFilter !== "ALL") filters.type = typeFilter;

            const { exceptions: fetchedExceptions } = await fetchExceptions(filters);
            setExceptions(fetchedExceptions);
        } catch (error) {
            console.error("Failed to load exceptions:", error);
            toast({
                type: "error",
                title: "Error",
                message: "Failed to load exceptions",
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filter, typeFilter, toast]);

    useEffect(() => {
        loadExceptions();
    }, [loadExceptions]);

    // ─── Handlers ─────────────────────────────────────────────────────────────

    const handleRefresh = () => loadExceptions(true);

    const handleResolve = async () => {
        if (!selectedException || !resolutionText.trim()) {
            toast({
                type: "error",
                title: "Validation Error",
                message: "Resolution text is required",
            });
            return;
        }

        setActionLoading(true);
        try {
            await resolveException(selectedException.id, resolutionText);

            setExceptions((prev) =>
                prev.map((e) =>
                    e.id === selectedException.id
                        ? { ...e, status: "RESOLVED" as ExceptionStatus, resolution: resolutionText, resolvedAt: new Date().toISOString() }
                        : e
                )
            );

            setResolveDialogOpen(false);
            setSelectedException(null);
            setResolutionText("");

            toast({
                type: "success",
                title: "Success",
                message: "Exception resolved successfully",
            });
        } catch (error) {
            console.error("Failed to resolve exception:", error);
            toast({
                type: "error",
                title: "Error",
                message: "Failed to resolve exception",
            });
        } finally {
            setActionLoading(false);
        }
    };

    const handleEscalate = async (exceptionId: string) => {
        setActionLoading(true);
        try {
            await escalateException(exceptionId);

            setExceptions((prev) =>
                prev.map((e) =>
                    e.id === exceptionId ? { ...e, status: "ESCALATED" as ExceptionStatus } : e
                )
            );

            setSelectedException(null);

            toast({
                type: "success",
                title: "Success",
                message: "Exception escalated successfully",
            });
        } catch (error) {
            console.error("Failed to escalate exception:", error);
            toast({
                type: "error",
                title: "Error",
                message: "Failed to escalate exception",
            });
        } finally {
            setActionLoading(false);
        }
    };

    // ─── Computed Values ───────────────────────────────────────────────────────

    const openCount = exceptions.filter((e) => e.status === "OPEN").length;
    const escalatedCount = exceptions.filter((e) => e.status === "ESCALATED").length;
    const criticalCount = exceptions.filter((e) => e.severity === "CRITICAL" && e.status !== "RESOLVED").length;

    const filteredExceptions = exceptions;

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            <PageHeader
                title="Exception Handling"
                description="Resolve operational exceptions and conflicts"
                actions={
                    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} /> Refresh
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
                        <SelectItem value="DISMISSED">Dismissed</SelectItem>
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

            {/* Loading State */}
            {loading ? (
                <Card>
                    <CardContent className="py-12">
                        <div className="space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex items-start gap-4 animate-pulse">
                                    <div className="h-12 w-12 rounded-lg bg-muted" />
                                    <div className="space-y-2 flex-1">
                                        <div className="h-5 w-48 bg-muted rounded" />
                                        <div className="h-4 w-full bg-muted rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            ) : filteredExceptions.length === 0 ? (
                /* Empty State */
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center">
                            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-lg font-medium">No exceptions found</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                {filter !== "ALL" || typeFilter !== "ALL"
                                    ? "Try adjusting your filters"
                                    : "All exceptions have been resolved"}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                /* Exceptions List */
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            Exceptions ({filteredExceptions.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
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
                    </CardContent>
                </Card>
            )}

            {/* Exception Details Dialog */}
            <Dialog open={!!selectedException} onOpenChange={() => setSelectedException(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            {selectedException && (() => {
                                const TypeIcon = EXCEPTION_TYPE_CONFIG[selectedException.type].icon;
                                return <TypeIcon className="h-6 w-6" />;
                            })()}
                            <div>
                                <span>{selectedException?.title}</span>
                                <p className="text-sm font-normal text-muted-foreground">
                                    {selectedException && EXCEPTION_TYPE_CONFIG[selectedException.type].label}
                                </p>
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    {selectedException && (
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
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedException(null)}>Close</Button>
                        {selectedException?.status === "OPEN" && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => handleEscalate(selectedException.id)}
                                    disabled={actionLoading}
                                >
                                    Escalate
                                </Button>
                                <Button
                                    onClick={() => setResolveDialogOpen(true)}
                                    disabled={actionLoading}
                                >
                                    Resolve
                                </Button>
                            </>
                        )}
                        {selectedException?.status === "ESCALATED" && (
                            <Button
                                onClick={() => setResolveDialogOpen(true)}
                                disabled={actionLoading}
                            >
                                Resolve
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Resolve Dialog */}
            <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Resolve Exception</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-medium">Resolution *</label>
                            <textarea
                                className="w-full mt-2 h-24 p-3 border rounded-lg text-sm"
                                placeholder="Describe how this exception was resolved..."
                                value={resolutionText}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setResolutionText(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setResolveDialogOpen(false);
                            setResolutionText("");
                        }}>Cancel</Button>
                        <Button onClick={handleResolve} disabled={actionLoading}>
                            {actionLoading ? "Resolving..." : "Resolve"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ─── SelectItem (shadcn/ui) ────────────────────────────────────────────────────

function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
    return <option value={value}>{children}</option>;
}
