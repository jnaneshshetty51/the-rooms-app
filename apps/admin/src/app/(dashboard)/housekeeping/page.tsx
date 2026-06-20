"use client";

// apps/admin/src/app/(dashboard)/housekeeping/page.tsx
import { useEffect, useState, useCallback } from "react";
import { Calendar, User, CheckCircle, Clock, Filter, Plus } from "lucide-react";
import {
    PageHeader,
    Button,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Select,
    SelectTrigger,
    SelectContent,
    SelectValue,
    Input,
    Badge,
    Progress,
    StatCard,
    Breadcrumbs,
    BreadcrumbItem,
} from "@the-rooms/ui";
import { formatDate } from "@the-rooms/ui";
import {
    fetchHousekeepingTasks,
    fetchHousekeepingAssignments,
    fetchHousekeepingProgress,
    assignHousekeepingTask,
    updateHousekeepingTaskStatus,
    type HousekeepingTask,
} from "@/lib/api";

interface StaffProgress {
    staffId: string;
    staffName: string;
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
}

export default function HousekeepingPage() {
    const [tasks, setTasks] = useState<{ tasks: HousekeepingTask[]; total: number } | null>(null);
    const [assignments, setAssignments] = useState<Record<string, unknown>[]>([]);
    const [progress, setProgress] = useState<StaffProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [statusFilter, setStatusFilter] = useState("ALL");

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [tasksData, assignmentsData, progressData] = await Promise.all([
                fetchHousekeepingTasks({ date }),
                fetchHousekeepingAssignments(date),
                fetchHousekeepingProgress(date),
            ]);
            setTasks(tasksData);
            setAssignments(assignmentsData.assignments || []);
            setProgress(progressData.progress || []);
        } finally {
            setLoading(false);
        }
    }, [date]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleStatusUpdate = async (taskId: string, status: string) => {
        await updateHousekeepingTaskStatus(taskId, status);
        fetchData();
    };

    const filteredTasks = tasks?.tasks.filter((t) =>
        statusFilter === "ALL" ? true : t.status === statusFilter
    ) ?? [];

    const stats = tasks ? {
        total: tasks.total,
        pending: tasks.tasks.filter((t) => t.status === "PENDING").length,
        inProgress: tasks.tasks.filter((t) => t.status === "IN_PROGRESS").length,
        completed: tasks.tasks.filter((t) => t.status === "COMPLETED").length,
    } : { total: 0, pending: 0, inProgress: 0, completed: 0 };

    const breadcrumbItems: BreadcrumbItem[] = [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Housekeeping" },
    ];

    return (
        <div className="space-y-6">
            <Breadcrumbs items={breadcrumbItems} />
            <PageHeader
                title="Housekeeping Management"
                description="Manage daily housekeeping tasks and staff assignments"
                actions={
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Task
                    </Button>
                }
            />

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total Tasks" value={stats.total} icon={Calendar} />
                <StatCard
                    label="Pending"
                    value={stats.pending}
                    icon={Clock}
                    className={stats.pending > 0 ? "border-l-4 border-l-warning" : ""}
                />
                <StatCard label="In Progress" value={stats.inProgress} icon={User} />
                <StatCard label="Completed" value={stats.completed} icon={CheckCircle} />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <Input
                    type="date"
                    className="w-[160px]"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                        <Filter className="h-4 w-4 mr-1.5 text-muted-foreground" />
                        <span>{statusFilter === "ALL" ? "All Status" : statusFilter.replace("_", " ")}</span>
                    </SelectTrigger>
                    <SelectContent>
                        <option value="ALL">All Status</option>
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Tasks List */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-heading text-lg">Housekeeping Tasks - {formatDate(date, "long")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="space-y-3">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
                                    ))}
                                </div>
                            ) : filteredTasks.length === 0 ? (
                                <div className="text-center py-8">
                                    <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">No tasks found</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredTasks.map((task) => (
                                        <div
                                            key={task.id}
                                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-2 h-2 rounded-full ${task.status === "COMPLETED" ? "bg-success" :
                                                    task.status === "IN_PROGRESS" ? "bg-warning" :
                                                        "bg-muted-foreground"
                                                    }`} />
                                                <div>
                                                    <p className="font-semibold">Room {task.room.roomNumber}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {task.room.type} · {task.type.replace("_", " ")}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    {task.assignedTo ? (
                                                        <>
                                                            <p className="text-sm font-medium">{task.assignedTo.name}</p>
                                                            <p className="text-xs text-muted-foreground">Assigned</p>
                                                        </>
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground">Unassigned</p>
                                                    )}
                                                </div>
                                                <Badge variant={
                                                    task.status === "COMPLETED" ? "success" :
                                                        task.status === "IN_PROGRESS" ? "warning" :
                                                            "secondary"
                                                }>
                                                    {task.status.replace("_", " ")}
                                                </Badge>
                                                <div className="flex items-center gap-1">
                                                    {task.status === "PENDING" && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleStatusUpdate(task.id, "IN_PROGRESS")}
                                                        >
                                                            Start
                                                        </Button>
                                                    )}
                                                    {task.status === "IN_PROGRESS" && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleStatusUpdate(task.id, "COMPLETED")}
                                                        >
                                                            Complete
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Staff Progress */}
                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-heading text-lg">Staff Progress</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {loading ? (
                                <div className="space-y-3">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
                                    ))}
                                </div>
                            ) : progress.length === 0 ? (
                                <div className="text-center py-8">
                                    <User className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">No staff assigned</p>
                                </div>
                            ) : (
                                progress.map((staff) => {
                                    const percent = staff.totalTasks > 0
                                        ? Math.round((staff.completedTasks / staff.totalTasks) * 100)
                                        : 0;
                                    return (
                                        <div key={staff.staffId} className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                                                        <User className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium">{staff.staffName}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {staff.completedTasks}/{staff.totalTasks} tasks
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="text-sm font-semibold">{percent}%</span>
                                            </div>
                                            <Progress value={percent} className="h-2" />
                                        </div>
                                    );
                                })
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
