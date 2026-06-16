"use client";

// apps/admin/src/app/(dashboard)/shifts/page.tsx
import { useEffect, useState, useCallback } from "react";
import { Plus, Clock, User, CheckCircle, LogIn, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
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
    StatCard,
} from "@the-rooms/ui";
import { formatDate } from "@the-rooms/ui";
import {
    fetchShiftTypes,
    fetchShifts,
    assignShift,
    checkInShift,
    checkOutShift,
    type ShiftType,
    type ShiftAssignment,
} from "@/lib/api";

export default function ShiftsPage() {
    const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
    const [shifts, setShifts] = useState<ShiftAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [weekOffset, setWeekOffset] = useState(0);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [typesResult, shiftsResult] = await Promise.all([
                fetchShiftTypes(),
                fetchShifts({ date }),
            ]);
            setShiftTypes(typesResult.types || []);
            setShifts(shiftsResult.shifts || []);
        } finally {
            setLoading(false);
        }
    }, [date]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCheckIn = async (shiftId: string) => {
        await checkInShift(shiftId);
        fetchData();
    };

    const handleCheckOut = async (shiftId: string) => {
        await checkOutShift(shiftId);
        fetchData();
    };

    const getWeekDates = () => {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(startOfWeek.getDate() + weekOffset * 7);
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(d.getDate() + i);
            dates.push(d.toISOString().split("T")[0]);
        }
        return dates;
    };

    const weekDates = getWeekDates();

    const stats = {
        totalShifts: shifts.length,
        scheduled: shifts.filter((s) => s.status === "SCHEDULED").length,
        checkedIn: shifts.filter((s) => s.status === "CHECKED_IN").length,
        checkedOut: shifts.filter((s) => s.status === "CHECKED_OUT").length,
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "CHECKED_IN":
                return "bg-success";
            case "CHECKED_OUT":
                return "bg-muted-foreground";
            case "ABSENT":
                return "bg-destructive";
            default:
                return "bg-warning";
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Shift Management"
                description="Manage shift types and staff assignments"
                actions={
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Shift Type
                    </Button>
                }
            />

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-4">
                <StatCard label="Total Shifts" value={stats.totalShifts} icon={Clock} />
                <StatCard label="Scheduled" value={stats.scheduled} icon={Clock} />
                <StatCard label="Checked In" value={stats.checkedIn} icon={LogIn} />
                <StatCard label="Checked Out" value={stats.checkedOut} icon={LogOut} />
            </div>

            {/* Shift Types */}
            <Card>
                <CardHeader>
                    <CardTitle className="font-heading text-lg">Shift Types</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="grid gap-3 sm:grid-cols-3">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
                            ))}
                        </div>
                    ) : shiftTypes.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No shift types configured</p>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                            {shiftTypes.map((type) => (
                                <div
                                    key={type.id}
                                    className="p-4 border rounded-lg"
                                    style={{ borderLeftColor: type.color, borderLeftWidth: 4 }}
                                >
                                    <p className="font-semibold">{type.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {type.startTime} - {type.endTime}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Weekly Calendar */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="font-heading text-lg">Weekly Schedule</CardTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setWeekOffset((w) => w - 1)}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium min-w-[120px] text-center">
                                {formatDate(weekDates[0], "short")} - {formatDate(weekDates[6], "short")}
                            </span>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setWeekOffset((w) => w + 1)}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <th className="text-left p-2 font-medium">Staff</th>
                                    {weekDates.map((d) => (
                                        <th key={d} className="p-2 text-center font-medium">
                                            <div className="text-xs text-muted-foreground">
                                                {new Date(d).toLocaleDateString("en", { weekday: "short" })}
                                            </div>
                                            <div>{new Date(d).getDate()}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="p-4 text-center">
                                            <div className="h-32 animate-pulse rounded-lg bg-muted" />
                                        </td>
                                    </tr>
                                ) : shifts.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="p-8 text-center text-muted-foreground">
                                            No shifts scheduled
                                        </td>
                                    </tr>
                                ) : (
                                    shifts.map((shift) => (
                                        <tr key={shift.id} className="border-t">
                                            <td className="p-2">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-muted-foreground" />
                                                    <div>
                                                        <p className="text-sm font-medium">{shift.staff.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {shift.staff.department}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            {weekDates.map((d) => {
                                                const isThisDay = shift.date === d;
                                                return (
                                                    <td key={d} className="p-2 text-center">
                                                        {isThisDay ? (
                                                            <div
                                                                className="inline-flex flex-col items-center gap-1 p-2 rounded-lg"
                                                                style={{ backgroundColor: `${shift.shiftType.color}20` }}
                                                            >
                                                                <span className="text-xs font-medium">
                                                                    {shift.shiftType.name}
                                                                </span>
                                                                <div className="flex items-center gap-1">
                                                                    <div className={`w-2 h-2 rounded-full ${getStatusColor(shift.status)}`} />
                                                                    <span className="text-xs">
                                                                        {shift.status === "CHECKED_IN" && (
                                                                            <Button
                                                                                size="icon"
                                                                                variant="ghost"
                                                                                className="h-6 w-6"
                                                                                onClick={() => handleCheckOut(shift.id)}
                                                                            >
                                                                                <LogOut className="h-3 w-3" />
                                                                            </Button>
                                                                        )}
                                                                        {shift.status === "SCHEDULED" && (
                                                                            <Button
                                                                                size="icon"
                                                                                variant="ghost"
                                                                                className="h-6 w-6"
                                                                                onClick={() => handleCheckIn(shift.id)}
                                                                            >
                                                                                <LogIn className="h-3 w-3" />
                                                                            </Button>
                                                                        )}
                                                                        {shift.status === "CHECKED_OUT" && (
                                                                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ) : null}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}