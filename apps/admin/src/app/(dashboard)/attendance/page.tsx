"use client";

// apps/admin/src/app/(dashboard)/attendance/page.tsx
import { useEffect, useState, useCallback } from "react";
import { Search, Filter, Download, Calendar, Clock, User } from "lucide-react";
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
    StatCard,
    ExportButton,
} from "@the-rooms/ui";
import { formatDate } from "@the-rooms/ui";
import { fetchAttendanceReport, type AttendanceRecord } from "@/lib/api";

const DEPARTMENTS = [
    "FRONT_OFFICE",
    "HOUSEKEEPING",
    "FOOD_BEVERAGE",
    "MAINTENANCE",
    "SECURITY",
    "ADMIN",
];

export default function AttendancePage() {
    const [data, setData] = useState<{ records: AttendanceRecord[]; total: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        fromDate: "",
        toDate: "",
        department: "ALL",
        staffId: "",
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (filters.fromDate) params.fromDate = filters.fromDate;
            if (filters.toDate) params.toDate = filters.toDate;
            if (filters.department !== "ALL") params.department = filters.department;
            if (filters.staffId) params.staffId = filters.staffId;

            const result = await fetchAttendanceReport(params);
            setData(result);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const columns: ColumnDef<AttendanceRecord, unknown>[] = [
        {
            accessorKey: "staff.name",
            header: "Staff",
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        <User className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="font-medium text-sm">{row.original.staff.name}</p>
                        <p className="text-xs text-muted-foreground">{row.original.staff.department}</p>
                    </div>
                </div>
            ),
        },
        {
            accessorKey: "date",
            header: "Date",
            cell: ({ row }) => (
                <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {formatDate(row.original.date, "short")}
                </div>
            ),
        },
        {
            accessorKey: "checkInAt",
            header: "Check In",
            cell: ({ row }) => (
                <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {new Date(row.original.checkInAt).toLocaleTimeString("en", {
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </div>
            ),
        },
        {
            accessorKey: "checkOutAt",
            header: "Check Out",
            cell: ({ row }) => (
                <div className="text-sm">
                    {row.original.checkOutAt ? (
                        new Date(row.original.checkOutAt).toLocaleTimeString("en", {
                            hour: "2-digit",
                            minute: "2-digit",
                        })
                    ) : (
                        <span className="text-muted-foreground">--:--</span>
                    )}
                </div>
            ),
        },
        {
            accessorKey: "totalHours",
            header: "Hours",
            cell: ({ row }) => (
                <span className="font-medium">{row.original.totalHours.toFixed(1)}h</span>
            ),
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const variant =
                    row.original.status === "PRESENT"
                        ? "success"
                        : row.original.status === "LATE"
                            ? "warning"
                            : row.original.status === "HALF_DAY"
                                ? "secondary"
                                : "destructive";
                return (
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${variant === "success" ? "bg-green-100 text-green-800" :
                            variant === "warning" ? "bg-yellow-100 text-yellow-800" :
                                variant === "destructive" ? "bg-red-100 text-red-800" :
                                    "bg-gray-100 text-gray-800"
                        }`}>
                        {row.original.status.replace("_", " ")}
                    </span>
                );
            },
        },
    ];

    function updateFilter(key: string, value: string) {
        setFilters((f) => ({ ...f, [key]: value }));
    }

    const stats = data?.records ? {
        totalRecords: data.records.length,
        present: data.records.filter((r) => r.status === "PRESENT").length,
        absent: data.records.filter((r) => r.status === "ABSENT").length,
        late: data.records.filter((r) => r.status === "LATE").length,
        avgHours: data.records.length > 0
            ? data.records.reduce((sum, r) => sum + r.totalHours, 0) / data.records.length
            : 0,
    } : { totalRecords: 0, present: 0, absent: 0, late: 0, avgHours: 0 };

    const exportData = data?.records.map((r) => ({
        "Staff Name": r.staff.name,
        "Department": r.staff.department,
        "Date": formatDate(r.date, "short"),
        "Check In": new Date(r.checkInAt).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" }),
        "Check Out": r.checkOutAt
            ? new Date(r.checkOutAt).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })
            : "--:--",
        "Total Hours": r.totalHours.toFixed(1),
        "Status": r.status.replace("_", " "),
    })) ?? [];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Attendance Report"
                description="Track staff attendance and work hours"
                actions={
                    <ExportButton
                        data={exportData}
                        filename="attendance-report"
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    />
                }
            />

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total Records" value={stats.totalRecords} icon={User} />
                <StatCard label="Present" value={stats.present} icon={User} />
                <StatCard label="Absent" value={stats.absent} icon={User} />
                <StatCard label="Avg Hours" value={`${stats.avgHours.toFixed(1)}h`} icon={Clock} />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <Input
                    type="date"
                    className="w-[160px]"
                    value={filters.fromDate}
                    onChange={(e) => updateFilter("fromDate", e.target.value)}
                    placeholder="From date"
                />
                <Input
                    type="date"
                    className="w-[160px]"
                    value={filters.toDate}
                    onChange={(e) => updateFilter("toDate", e.target.value)}
                    placeholder="To date"
                />
                <Select value={filters.department} onValueChange={(v) => updateFilter("department", v)}>
                    <SelectTrigger className="w-[180px]">
                        <Filter className="h-4 w-4 mr-1.5 text-muted-foreground" />
                        <span>{filters.department === "ALL" ? "All Departments" : filters.department.replace("_", " ")}</span>
                    </SelectTrigger>
                    <SelectContent>
                        <option value="ALL">All Departments</option>
                        {DEPARTMENTS.map((dept) => (
                            <option key={dept} value={dept}>{dept.replace("_", " ")}</option>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={data?.records ?? []}
                isLoading={loading}
                pageSize={20}
                filterPlaceholder="Filter attendance..."
            />

            {data && (
                <div className="text-sm text-muted-foreground text-center">
                    {data.total} attendance records
                </div>
            )}
        </div>
    );
}