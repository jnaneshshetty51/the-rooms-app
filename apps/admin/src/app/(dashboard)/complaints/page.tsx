"use client";

// apps/admin/src/app/(dashboard)/complaints/page.tsx
// Complaints Management - Central inbox, SLA tracking, escalation flow

import { useEffect, useState, useCallback } from "react";
import {
    RefreshCw,
    AlertTriangle,
    CheckCircle,
    Clock,
    User,
    MessageSquare,
    BedDouble,
    ArrowUp,
    Filter,
} from "lucide-react";
import {
    PageHeader,
    Button,
    Select,
    SelectTrigger,
    SelectContent,
    SelectValue,
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
} from "@the-rooms/ui";
import { formatDate } from "@the-rooms/ui";
import { cn } from "@the-rooms/ui";

interface Complaint {
    id: string;
    bookingNumber: string | null;
    guestName: string;
    guestPhone: string;
    roomNumber: string | null;
    category: "ROOM" | "SERVICE" | "STAFF" | "BILLING" | "CLEANING" | "NOISE" | "OTHER";
    subject: string;
    description: string;
    status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "ESCALATED" | "CLOSED";
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    assignedTo: string | null;
    createdAt: string;
    updatedAt: string;
    resolvedAt: string | null;
    SLA: {
        deadline: string;
        breached: boolean;
    };
    notes: { id: string; text: string; createdBy: string; createdAt: string }[];
}

interface ComplaintStats {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    escalated: number;
    slaBreached: number;
}

interface ComplaintsResponse {
    complaints: Complaint[];
    stats: ComplaintStats;
}

const PRIORITY_CONFIG = {
    LOW: { label: "Low", bg: "bg-gray-100", text: "text-gray-700", slaHours: 72 },
    MEDIUM: { label: "Medium", bg: "bg-yellow-100", text: "text-yellow-700", slaHours: 48 },
    HIGH: { label: "High", bg: "bg-orange-100", text: "text-orange-700", slaHours: 24 },
    URGENT: { label: "Urgent", bg: "bg-red-100", text: "text-red-700", slaHours: 4 },
};

const STATUS_CONFIG = {
    OPEN: { label: "Open", bg: "bg-red-100", text: "text-red-700", icon: AlertTriangle },
    IN_PROGRESS: { label: "In Progress", bg: "bg-blue-100", text: "text-blue-700", icon: Clock },
    RESOLVED: { label: "Resolved", bg: "bg-green-100", text: "text-green-700", icon: CheckCircle },
    ESCALATED: { label: "Escalated", bg: "bg-purple-100", text: "text-purple-700", icon: ArrowUp },
    CLOSED: { label: "Closed", bg: "bg-gray-100", text: "text-gray-700", icon: CheckCircle },
};

const CATEGORY_CONFIG = {
    ROOM: { label: "Room Issue", icon: BedDouble },
    SERVICE: { label: "Service", icon: User },
    STAFF: { label: "Staff", icon: User },
    BILLING: { label: "Billing", icon: AlertTriangle },
    CLEANING: { label: "Cleaning", icon: AlertTriangle },
    NOISE: { label: "Noise", icon: AlertTriangle },
    OTHER: { label: "Other", icon: MessageSquare },
};

export default function ComplaintsPage() {
    const [data, setData] = useState<ComplaintsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [priorityFilter, setPriorityFilter] = useState<string>("all");
    const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

    const fetchComplaints = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/complaints");
            if (res.ok) {
                setData(await res.json());
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

    const updateComplaintStatus = async (complaintId: string, status: string) => {
        await fetch(`/api/complaints/${complaintId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        fetchComplaints();
        if (selectedComplaint?.id === complaintId) {
            const updated = data?.complaints.find((c) => c.id === complaintId);
            setSelectedComplaint(updated || null);
        }
    };

    const escalateComplaint = async (complaintId: string) => {
        await updateComplaintStatus(complaintId, "ESCALATED");
    };

    const filteredComplaints = data?.complaints.filter((complaint) => {
        if (statusFilter !== "all" && complaint.status !== statusFilter.toUpperCase().replace(" ", "_")) return false;
        if (priorityFilter !== "all" && complaint.priority !== priorityFilter.toUpperCase()) return false;
        return true;
    }) ?? [];

    if (loading && !data) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-[#E17055]" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <PageHeader
                title="Complaints"
                description="Central complaint inbox with SLA tracking and escalation"
                actions={
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={fetchComplaints} disabled={loading}>
                            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                            Refresh
                        </Button>
                    </div>
                }
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold">{data?.stats.total ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Total</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-red-200">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-red-600">{data?.stats.open ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Open</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-blue-200">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-blue-600">{data?.stats.inProgress ?? 0}</p>
                            <p className="text-xs text-muted-foreground">In Progress</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-purple-200">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-purple-600">{data?.stats.escalated ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Escalated</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-green-200">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-green-600">{data?.stats.resolved ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Resolved</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-red-300">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-red-600">{data?.stats.slaBreached ?? 0}</p>
                            <p className="text-xs text-muted-foreground">SLA Breached</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px]">
                        <Filter className="h-4 w-4 mr-1.5 text-muted-foreground" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <option value="all">All Status</option>
                        <option value="open">Open</option>
                        <option value="in progress">In Progress</option>
                        <option value="escalated">Escalated</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                    </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-[150px]">
                        <AlertTriangle className="h-4 w-4 mr-1.5 text-muted-foreground" />
                        <SelectValue placeholder="All Priority" />
                    </SelectTrigger>
                    <SelectContent>
                        <option value="all">All Priority</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                    </SelectContent>
                </Select>
            </div>

            {/* Complaints List */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Complaints ({filteredComplaints.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {filteredComplaints.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No complaints found
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredComplaints.map((complaint) => {
                                const priority = PRIORITY_CONFIG[complaint.priority];
                                const status = STATUS_CONFIG[complaint.status];
                                const StatusIcon = status.icon;
                                const category = CATEGORY_CONFIG[complaint.category];

                                return (
                                    <div
                                        key={complaint.id}
                                        onClick={() => setSelectedComplaint(complaint)}
                                        className={cn(
                                            "flex items-start justify-between rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md",
                                            complaint.status === "ESCALATED" && "border-purple-300 bg-purple-50",
                                            complaint.status === "OPEN" && "border-red-200",
                                            complaint.SLA.breached && "border-l-4 border-l-red-500"
                                        )}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", priority.bg)}>
                                                <span className="text-lg">{category.icon === BedDouble ? "🛏️" : category.icon === User ? "👤" : "💬"}</span>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold">{complaint.subject}</span>
                                                    {complaint.SLA.breached && (
                                                        <Badge variant="destructive" className="text-xs">SLA Breached</Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-0.5">{complaint.description}</p>
                                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                                    {complaint.guestName}
                                                    {complaint.roomNumber && <span>· Room {complaint.roomNumber}</span>}
                                                    <span>· {formatDate(complaint.createdAt, "short")}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", priority.bg, priority.text)}>
                                                    {priority.label}
                                                </span>
                                                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1", status.bg, status.text)}>
                                                    <StatusIcon className="h-3 w-3" />
                                                    {status.label}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                SLA: {formatDate(complaint.SLA.deadline, "short")}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Complaint Details Dialog */}
            {selectedComplaint && (
                <Dialog open onOpenChange={() => setSelectedComplaint(null)}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-3">
                                <span className="text-2xl">
                                    {CATEGORY_CONFIG[selectedComplaint.category].icon === BedDouble ? "🛏️" :
                                        CATEGORY_CONFIG[selectedComplaint.category].icon === User ? "👤" : "💬"}
                                </span>
                                <div>
                                    <span>{selectedComplaint.subject}</span>
                                    <p className="text-sm font-normal text-muted-foreground">
                                        {CATEGORY_CONFIG[selectedComplaint.category].label} · Room {selectedComplaint.roomNumber || "N/A"}
                                    </p>
                                </div>
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            {/* Guest Info */}
                            <div className="rounded-lg bg-secondary/50 p-3">
                                <p className="text-xs text-muted-foreground">Guest</p>
                                <p className="font-medium">{selectedComplaint.guestName}</p>
                                <p className="text-sm text-blue-600">{selectedComplaint.guestPhone}</p>
                            </div>

                            {/* Description */}
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Description</p>
                                <p className="text-sm">{selectedComplaint.description}</p>
                            </div>

                            {/* Status & Priority */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-muted-foreground">Priority</p>
                                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium inline-block mt-1", PRIORITY_CONFIG[selectedComplaint.priority].bg, PRIORITY_CONFIG[selectedComplaint.priority].text)}>
                                        {PRIORITY_CONFIG[selectedComplaint.priority].label}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Status</p>
                                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium inline-block mt-1", STATUS_CONFIG[selectedComplaint.status].bg, STATUS_CONFIG[selectedComplaint.status].text)}>
                                        {STATUS_CONFIG[selectedComplaint.status].label}
                                    </span>
                                </div>
                            </div>

                            {/* SLA Info */}
                            <div className={cn("rounded-lg px-3 py-2", selectedComplaint.SLA.breached ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200")}>
                                <p className="text-xs font-medium">SLA Deadline</p>
                                <p className={cn("text-sm font-semibold", selectedComplaint.SLA.breached ? "text-red-600" : "text-green-600")}>
                                    {formatDate(selectedComplaint.SLA.deadline, "long")}
                                    {selectedComplaint.SLA.breached && " (BREACHED)"}
                                </p>
                            </div>

                            {/* Notes */}
                            {selectedComplaint.notes.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground">Notes</p>
                                    {selectedComplaint.notes.map((note) => (
                                        <div key={note.id} className="rounded-lg bg-gray-50 px-3 py-2">
                                            <p className="text-sm">{note.text}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {note.createdBy} · {formatDate(note.createdAt, "short")}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <DialogFooter className="flex-wrap gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setSelectedComplaint(null)}
                            >
                                Close
                            </Button>
                            {selectedComplaint.status === "OPEN" && (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={() => { updateComplaintStatus(selectedComplaint.id, "IN_PROGRESS"); }}
                                    >
                                        Start Working
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={() => { escalateComplaint(selectedComplaint.id); }}
                                        className="bg-purple-600 hover:bg-purple-700"
                                    >
                                        <ArrowUp className="h-4 w-4 mr-2" /> Escalate
                                    </Button>
                                </>
                            )}
                            {selectedComplaint.status === "IN_PROGRESS" && (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={() => { updateComplaintStatus(selectedComplaint.id, "OPEN"); }}
                                    >
                                        Reopen
                                    </Button>
                                    <Button
                                        onClick={() => { updateComplaintStatus(selectedComplaint.id, "RESOLVED"); }}
                                    >
                                        <CheckCircle className="h-4 w-4 mr-2" /> Mark Resolved
                                    </Button>
                                </>
                            )}
                            {selectedComplaint.status === "RESOLVED" && (
                                <Button
                                    onClick={() => { updateComplaintStatus(selectedComplaint.id, "CLOSED"); }}
                                >
                                    Close Complaint
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
