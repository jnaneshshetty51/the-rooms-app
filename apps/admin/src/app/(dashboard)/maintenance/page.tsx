"use client";

// apps/admin/src/app/(dashboard)/maintenance/page.tsx
// Maintenance Management - Issue logging, room blocking (OOO), repair tracking

import { useEffect, useState, useCallback } from "react";
import {
    RefreshCw,
    Wrench,
    Plus,
    AlertTriangle,
    CheckCircle,
    Clock,
    BedDouble,
    Filter,
    Eye,
    Edit,
} from "lucide-react";
import {
    PageHeader,
    Button,
    Select,
    SelectTrigger,
    SelectContent,
    SelectValue,
    Input,
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

interface MaintenanceIssue {
    id: string;
    roomNumber: string;
    roomId: string;
    type: "PLUMBING" | "ELECTRICAL" | "HVAC" | "FURNITURE" | "OTHER";
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    description: string;
    reportedBy: string;
    assignedTo: string | null;
    roomBlocked: boolean;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
    notes: string[];
}

interface MaintenanceStats {
    total: number;
    open: number;
    inProgress: number;
    completed: number;
    critical: number;
    blockedRooms: number;
}

interface MaintenanceResponse {
    issues: MaintenanceIssue[];
    stats: MaintenanceStats;
    rooms: { id: string; roomNumber: string; type: string }[];
}

const PRIORITY_CONFIG = {
    LOW: { label: "Low", bg: "bg-gray-100", text: "text-gray-700" },
    MEDIUM: { label: "Medium", bg: "bg-yellow-100", text: "text-yellow-700" },
    HIGH: { label: "High", bg: "bg-orange-100", text: "text-orange-700" },
    CRITICAL: { label: "Critical", bg: "bg-red-100", text: "text-red-700" },
};

const STATUS_CONFIG = {
    OPEN: { label: "Open", bg: "bg-red-100", text: "text-red-700" },
    IN_PROGRESS: { label: "In Progress", bg: "bg-blue-100", text: "text-blue-700" },
    COMPLETED: { label: "Completed", bg: "bg-green-100", text: "text-green-700" },
    CANCELLED: { label: "Cancelled", bg: "bg-gray-100", text: "text-gray-700" },
};

const TYPE_CONFIG = {
    PLUMBING: { label: "Plumbing", icon: "🔧" },
    ELECTRICAL: { label: "Electrical", icon: "⚡" },
    HVAC: { label: "HVAC", icon: "❄️" },
    FURNITURE: { label: "Furniture", icon: "🛋️" },
    OTHER: { label: "Other", icon: "📋" },
};

export default function MaintenancePage() {
    const [data, setData] = useState<MaintenanceResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>("all");
    const [priorityFilter, setPriorityFilter] = useState<string>("all");
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [selectedIssue, setSelectedIssue] = useState<MaintenanceIssue | null>(null);
    const [newIssue, setNewIssue] = useState({
        roomId: "",
        type: "OTHER",
        priority: "MEDIUM",
        description: "",
        roomBlocked: false,
    });

    const fetchMaintenance = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/maintenance/issues");
            if (res.ok) {
                setData(await res.json());
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchMaintenance(); }, [fetchMaintenance]);

    const createIssue = async () => {
        await fetch("/api/maintenance/issues", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newIssue),
        });
        setShowCreateDialog(false);
        setNewIssue({ roomId: "", type: "OTHER", priority: "MEDIUM", description: "", roomBlocked: false });
        fetchMaintenance();
    };

    const updateIssueStatus = async (issueId: string, status: string) => {
        await fetch(`/api/maintenance/issues/${issueId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });
        fetchMaintenance();
    };

    const filteredIssues = data?.issues.filter((issue) => {
        if (filter !== "all" && issue.status !== filter.toUpperCase().replace(" ", "_")) return false;
        if (priorityFilter !== "all" && issue.priority !== priorityFilter.toUpperCase()) return false;
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
                title="Maintenance"
                description="Issue logging, room blocking (OOO), and repair tracking"
                actions={
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={fetchMaintenance} disabled={loading}>
                            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                            Refresh
                        </Button>
                        <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                            <Plus className="h-4 w-4 mr-2" /> Report Issue
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
                <Card className="border-green-200">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-green-600">{data?.stats.completed ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Completed</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-red-300">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-red-600">{data?.stats.critical ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Critical</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-orange-200">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-orange-600">{data?.stats.blockedRooms ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Rooms OOO</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-[150px]">
                        <Filter className="h-4 w-4 mr-1.5 text-muted-foreground" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <option value="all">All Status</option>
                        <option value="open">Open</option>
                        <option value="in progress">In Progress</option>
                        <option value="completed">Completed</option>
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
                        <option value="critical">Critical</option>
                    </SelectContent>
                </Select>
            </div>

            {/* Issues List */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Wrench className="h-5 w-5" />
                        Maintenance Issues ({filteredIssues.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {filteredIssues.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No maintenance issues found
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredIssues.map((issue) => {
                                const priority = PRIORITY_CONFIG[issue.priority];
                                const status = STATUS_CONFIG[issue.status];
                                const type = TYPE_CONFIG[issue.type];

                                return (
                                    <div
                                        key={issue.id}
                                        className={cn(
                                            "flex items-center justify-between rounded-lg border p-4 transition-all hover:shadow-md",
                                            issue.priority === "CRITICAL" && "border-red-300 bg-red-50",
                                            issue.priority === "HIGH" && "border-orange-200",
                                            issue.status === "COMPLETED" && "opacity-60"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-xl">
                                                {type.icon}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold">Room {issue.roomNumber}</span>
                                                    {issue.roomBlocked && (
                                                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                                                            OOO
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-0.5">{type.label}</p>
                                                <p className="text-xs text-gray-500 mt-1 line-clamp-1">{issue.description}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", priority.bg, priority.text)}>
                                                        {priority.label}
                                                    </span>
                                                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", status.bg, status.text)}>
                                                        {status.label}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {formatDate(issue.createdAt, "short")}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setSelectedIssue(issue)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                {issue.status === "OPEN" && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => updateIssueStatus(issue.id, "IN_PROGRESS")}
                                                        className="text-blue-600"
                                                    >
                                                        <Clock className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {issue.status === "IN_PROGRESS" && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => updateIssueStatus(issue.id, "COMPLETED")}
                                                        className="text-green-600"
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create Issue Dialog */}
            {showCreateDialog && (
                <Dialog open onOpenChange={setShowCreateDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Report Maintenance Issue</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Room</label>
                                <Select value={newIssue.roomId} onValueChange={(v) => setNewIssue({ ...newIssue, roomId: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select room" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {data?.rooms.map((room) => (
                                            <SelectItem key={room.id} value={room.id}>
                                                Room {room.roomNumber} ({room.type})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Type</label>
                                    <Select value={newIssue.type} onValueChange={(v) => setNewIssue({ ...newIssue, type: v })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="PLUMBING">Plumbing</SelectItem>
                                            <SelectItem value="ELECTRICAL">Electrical</SelectItem>
                                            <SelectItem value="HVAC">HVAC</SelectItem>
                                            <SelectItem value="FURNITURE">Furniture</SelectItem>
                                            <SelectItem value="OTHER">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Priority</label>
                                    <Select value={newIssue.priority} onValueChange={(v) => setNewIssue({ ...newIssue, priority: v })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="LOW">Low</SelectItem>
                                            <SelectItem value="MEDIUM">Medium</SelectItem>
                                            <SelectItem value="HIGH">High</SelectItem>
                                            <SelectItem value="CRITICAL">Critical</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Description</label>
                                <textarea
                                    value={newIssue.description}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewIssue({ ...newIssue, description: e.target.value })}
                                    placeholder="Describe the issue..."
                                    className="w-full rounded-md border px-3 py-2 min-h-[100px] text-sm"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                            <Button onClick={createIssue} disabled={!newIssue.roomId || !newIssue.description}>
                                Create Issue
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* Issue Details Dialog */}
            {selectedIssue && (
                <Dialog open onOpenChange={() => setSelectedIssue(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Issue Details - Room {selectedIssue.roomNumber}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">{TYPE_CONFIG[selectedIssue.type].icon}</span>
                                <div>
                                    <p className="font-semibold">{TYPE_CONFIG[selectedIssue.type].label}</p>
                                    <p className="text-sm text-muted-foreground">Reported {formatDate(selectedIssue.createdAt, "long")}</p>
                                </div>
                            </div>
                            <div className="rounded-lg bg-secondary/50 p-3">
                                <p className="text-sm font-medium mb-1">Description</p>
                                <p className="text-sm text-muted-foreground">{selectedIssue.description}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-muted-foreground">Priority</p>
                                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", PRIORITY_CONFIG[selectedIssue.priority].bg, PRIORITY_CONFIG[selectedIssue.priority].text)}>
                                        {PRIORITY_CONFIG[selectedIssue.priority].label}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Status</p>
                                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_CONFIG[selectedIssue.status].bg, STATUS_CONFIG[selectedIssue.status].text)}>
                                        {STATUS_CONFIG[selectedIssue.status].label}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setSelectedIssue(null)}>Close</Button>
                            {selectedIssue.status === "OPEN" && (
                                <Button onClick={() => { updateIssueStatus(selectedIssue.id, "IN_PROGRESS"); setSelectedIssue(null); }}>
                                    Start Working
                                </Button>
                            )}
                            {selectedIssue.status === "IN_PROGRESS" && (
                                <Button onClick={() => { updateIssueStatus(selectedIssue.id, "COMPLETED"); setSelectedIssue(null); }}>
                                    Mark Complete
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

// Helper components
function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
    return <option value={value}>{children}</option>;
}
