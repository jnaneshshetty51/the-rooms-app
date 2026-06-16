"use client";

// apps/admin/src/app/(dashboard)/disputes/page.tsx
import { useEffect, useState, useCallback } from "react";
import { Search, Filter, MessageSquare, AlertTriangle, CheckCircle, Send } from "lucide-react";
import {
    PageHeader,
    Button,
    Input,
    Select,
    SelectTrigger,
    SelectContent,
    SelectValue,
    DataTable,
    type ColumnDef,
    Card,
    CardContent,
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
import {
    fetchDisputes,
    respondToDispute,
    resolveDispute,
    type Dispute,
} from "@/lib/api";

export default function DisputesPage() {
    const [data, setData] = useState<{ disputes: Dispute[]; total: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: "ALL",
        type: "ALL",
    });
    const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
    const [responseMessage, setResponseMessage] = useState("");
    const [resolution, setResolution] = useState("");
    const [adjustmentAmount, setAdjustmentAmount] = useState("");

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (filters.status !== "ALL") params.status = filters.status;
            if (filters.type !== "ALL") params.type = filters.type;

            const result = await fetchDisputes(params);
            setData(result);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRespond = async () => {
        if (!selectedDispute || !responseMessage) return;
        await respondToDispute(selectedDispute.id, responseMessage);
        setResponseMessage("");
        fetchData();
    };

    const handleResolve = async () => {
        if (!selectedDispute || !resolution) return;
        await resolveDispute(
            selectedDispute.id,
            resolution,
            adjustmentAmount ? parseFloat(adjustmentAmount) : undefined
        );
        setResolution("");
        setAdjustmentAmount("");
        setSelectedDispute(null);
        fetchData();
    };

    const columns: ColumnDef<Dispute, unknown>[] = [
        {
            accessorKey: "booking.bookingNumber",
            header: "Booking",
            cell: ({ row }) => (
                <code className="text-sm font-semibold">{row.original.booking.bookingNumber}</code>
            ),
        },
        {
            accessorKey: "booking.guest.name",
            header: "Guest",
            cell: ({ row }) => (
                <span className="font-medium">{row.original.booking.guest.name}</span>
            ),
        },
        {
            accessorKey: "type",
            header: "Type",
            cell: ({ row }) => (
                <Badge variant="secondary">{row.original.type}</Badge>
            ),
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => (
                <Badge variant={
                    row.original.status === "OPEN" ? "warning" :
                        row.original.status === "UNDER_REVIEW" ? "secondary" :
                            row.original.status === "RESOLVED" ? "success" :
                                "destructive"
                }>
                    {row.original.status.replace("_", " ")}
                </Badge>
            ),
        },
        {
            accessorKey: "subject",
            header: "Subject",
            cell: ({ row }) => (
                <span className="text-sm max-w-[200px] truncate block">{row.original.subject}</span>
            ),
        },
        {
            accessorKey: "amount",
            header: "Amount",
            cell: ({ row }) => (
                <span className="font-semibold">{formatCurrency(row.original.amount)}</span>
            ),
        },
        {
            accessorKey: "createdAt",
            header: "Filed",
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                    {formatDate(row.original.createdAt, "short")}
                </span>
            ),
        },
        {
            id: "actions",
            header: "",
            cell: ({ row }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDispute(row.original)}
                >
                    View
                </Button>
            ),
        },
    ];

    function updateFilter(key: string, value: string) {
        setFilters((f) => ({ ...f, [key]: value }));
    }

    const stats = data?.disputes ? {
        total: data.disputes.length,
        open: data.disputes.filter((d) => d.status === "OPEN").length,
        underReview: data.disputes.filter((d) => d.status === "UNDER_REVIEW").length,
        resolved: data.disputes.filter((d) => d.status === "RESOLVED").length,
    } : { total: 0, open: 0, underReview: 0, resolved: 0 };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Dispute Management"
                description="Handle guest disputes and billing issues"
            />

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-4">
                <StatCard label="Total Disputes" value={stats.total} icon={AlertTriangle} />
                <StatCard
                    label="Open"
                    value={stats.open}
                    icon={AlertTriangle}
                    className={stats.open > 0 ? "border-l-4 border-l-warning" : ""}
                />
                <StatCard label="Under Review" value={stats.underReview} icon={MessageSquare} />
                <StatCard label="Resolved" value={stats.resolved} icon={CheckCircle} />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <Select value={filters.status} onValueChange={(v) => updateFilter("status", v)}>
                    <SelectTrigger className="w-[150px]">
                        <Filter className="h-4 w-4 mr-1.5 text-muted-foreground" />
                        <span>{filters.status === "ALL" ? "All Status" : filters.status.replace("_", " ")}</span>
                    </SelectTrigger>
                    <SelectContent>
                        <option value="ALL">All Status</option>
                        <option value="OPEN">Open</option>
                        <option value="UNDER_REVIEW">Under Review</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="ESCALATED">Escalated</option>
                    </SelectContent>
                </Select>
                <Select value={filters.type} onValueChange={(v) => updateFilter("type", v)}>
                    <SelectTrigger className="w-[150px]">
                        <span>{filters.type === "ALL" ? "All Types" : filters.type}</span>
                    </SelectTrigger>
                    <SelectContent>
                        <option value="ALL">All Types</option>
                        <option value="BILLING">Billing</option>
                        <option value="SERVICE">Service</option>
                        <option value="DAMAGE">Damage</option>
                        <option value="OTHER">Other</option>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={data?.disputes ?? []}
                isLoading={loading}
                pageSize={20}
                filterPlaceholder="Filter disputes..."
            />

            {/* Dispute Detail Dialog */}
            <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Dispute Details</DialogTitle>
                    </DialogHeader>
                    {selectedDispute && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Booking</p>
                                    <p className="font-semibold">{selectedDispute.booking.bookingNumber}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Guest</p>
                                    <p className="font-semibold">{selectedDispute.booking.guest.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Type</p>
                                    <Badge variant="secondary">{selectedDispute.type}</Badge>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Amount</p>
                                    <p className="font-semibold">{formatCurrency(selectedDispute.amount)}</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-sm text-muted-foreground">Subject</p>
                                <p className="font-medium">{selectedDispute.subject}</p>
                            </div>

                            <div>
                                <p className="text-sm text-muted-foreground">Description</p>
                                <p className="text-sm">{selectedDispute.description}</p>
                            </div>

                            {/* Response Thread */}
                            {selectedDispute.responses.length > 0 && (
                                <div>
                                    <p className="text-sm text-muted-foreground mb-2">Response Thread</p>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {selectedDispute.responses.map((response) => (
                                            <div key={response.id} className="p-3 bg-muted rounded-lg">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-medium text-sm">{response.responder.name}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {formatDate(response.createdAt, "short")}
                                                    </span>
                                                </div>
                                                <p className="text-sm">{response.message}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedDispute.status !== "RESOLVED" && (
                                <>
                                    {/* Add Response */}
                                    <div className="space-y-2">
                                        <Label>Add Response</Label>
                                        <textarea
                                            className="w-full h-20 p-3 border rounded-lg text-sm"
                                            value={responseMessage}
                                            onChange={(e) => setResponseMessage(e.target.value)}
                                            placeholder="Type your response..."
                                        />
                                        <Button onClick={handleRespond} disabled={!responseMessage}>
                                            <Send className="h-4 w-4 mr-2" />
                                            Send Response
                                        </Button>
                                    </div>

                                    {/* Resolution */}
                                    <div className="border-t pt-4 space-y-2">
                                        <Label>Resolve Dispute</Label>
                                        <textarea
                                            className="w-full h-20 p-3 border rounded-lg text-sm"
                                            value={resolution}
                                            onChange={(e) => setResolution(e.target.value)}
                                            placeholder="Enter resolution notes..."
                                        />
                                        <div className="flex items-center gap-3">
                                            <Input
                                                type="number"
                                                placeholder="Adjustment amount (optional)"
                                                value={adjustmentAmount}
                                                onChange={(e) => setAdjustmentAmount(e.target.value)}
                                                className="w-[200px]"
                                            />
                                            <Button onClick={handleResolve} disabled={!resolution}>
                                                <CheckCircle className="h-4 w-4 mr-2" />
                                                Mark Resolved
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            )}

                            {selectedDispute.resolution && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-sm text-muted-foreground">Resolution</p>
                                    <p className="text-sm">{selectedDispute.resolution}</p>
                                    {selectedDispute.resolvedAt && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Resolved on {formatDate(selectedDispute.resolvedAt, "long")}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}