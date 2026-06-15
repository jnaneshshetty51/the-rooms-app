"use client";

// apps/admin/src/app/(dashboard)/automation/page.tsx
// Automation Rules - Configure automated workflows without AI

import { useEffect, useState } from "react";
import {
    RefreshCw,
    Plus,
    Play,
    Pause,
    Settings,
    Trash2,
    CheckCircle,
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
    Input,
    Select,
    SelectTrigger,
    SelectContent,
    SelectValue,
} from "@the-rooms/ui";
import { cn } from "@the-rooms/ui";

interface AutomationRule {
    id: string;
    name: string;
    description: string;
    trigger: "BOOKING_CREATED" | "CHECK_IN" | "CHECK_OUT" | "NO_SHOW" | "PAYMENT_RECEIVED" | "SCHEDULE" | "COMPLAINT_LOGGED";
    action: "SEND_SMS" | "SEND_EMAIL" | "UPDATE_STATUS" | "CREATE_INVOICE" | "NOTIFY_STAFF" | "BLOCK_ROOM";
    condition: string | null;
    config: Record<string, unknown>;
    status: "ACTIVE" | "PAUSED" | "DISABLED";
    lastTriggered: string | null;
    triggerCount: number;
    createdAt: string;
    updatedAt: string;
}

const TRIGGER_CONFIG = {
    BOOKING_CREATED: { label: "Booking Created", icon: "📅" },
    CHECK_IN: { label: "Check-in", icon: "✅" },
    CHECK_OUT: { label: "Check-out", icon: "🚪" },
    NO_SHOW: { label: "No Show", icon: "👻" },
    PAYMENT_RECEIVED: { label: "Payment Received", icon: "💳" },
    SCHEDULE: { label: "Scheduled", icon: "⏰" },
    COMPLAINT_LOGGED: { label: "Complaint Logged", icon: "📝" },
};

const ACTION_CONFIG = {
    SEND_SMS: { label: "Send SMS", icon: "📱" },
    SEND_EMAIL: { label: "Send Email", icon: "📧" },
    UPDATE_STATUS: { label: "Update Status", icon: "🔄" },
    CREATE_INVOICE: { label: "Create Invoice", icon: "🧾" },
    NOTIFY_STAFF: { label: "Notify Staff", icon: "👥" },
    BLOCK_ROOM: { label: "Block Room", icon: "🚫" },
};

const DEFAULT_RULES: AutomationRule[] = [
    {
        id: "1",
        name: "Auto Mark No-Show",
        description: "Automatically mark booking as no-show if guest doesn't check in by 2 PM",
        trigger: "SCHEDULE",
        action: "UPDATE_STATUS",
        condition: "booking.status === CONFIRMED && hoursSinceCheckIn > 14",
        config: { time: "14:00", days: 1 },
        status: "ACTIVE",
        lastTriggered: new Date().toISOString(),
        triggerCount: 12,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "2",
        name: "Check-in Reminder",
        description: "Send SMS reminder 24 hours before check-in",
        trigger: "SCHEDULE",
        action: "SEND_SMS",
        condition: null,
        config: { hoursBefore: 24, template: "checkin_reminder" },
        status: "ACTIVE",
        lastTriggered: new Date().toISOString(),
        triggerCount: 45,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "3",
        name: "Payment Confirmation",
        description: "Send payment confirmation SMS when payment is received",
        trigger: "PAYMENT_RECEIVED",
        action: "SEND_SMS",
        condition: null,
        config: { template: "payment_confirmation" },
        status: "ACTIVE",
        lastTriggered: new Date().toISOString(),
        triggerCount: 156,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "4",
        name: "Auto Generate Checkout Invoice",
        description: "Automatically generate invoice when guest checks out",
        trigger: "CHECK_OUT",
        action: "CREATE_INVOICE",
        condition: null,
        config: {},
        status: "PAUSED",
        lastTriggered: null,
        triggerCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "5",
        name: "Complaint Escalation Alert",
        description: "Notify manager when high priority complaint is logged",
        trigger: "COMPLAINT_LOGGED",
        action: "NOTIFY_STAFF",
        condition: "complaint.priority === HIGH || complaint.priority === URGENT",
        config: { notifyRoles: ["MANAGER", "ADMIN"] },
        status: "ACTIVE",
        lastTriggered: new Date().toISOString(),
        triggerCount: 8,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
];

export default function AutomationPage() {
    const [rules, setRules] = useState<AutomationRule[]>(DEFAULT_RULES);
    const [loading, setLoading] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    const toggleRuleStatus = (ruleId: string) => {
        setRules((prev) =>
            prev.map((rule) =>
                rule.id === ruleId
                    ? { ...rule, status: rule.status === "ACTIVE" ? "PAUSED" : "ACTIVE" }
                    : rule
            )
        );
    };

    const deleteRule = (ruleId: string) => {
        if (confirm("Delete this automation rule?")) {
            setRules((prev) => prev.filter((rule) => rule.id !== ruleId));
        }
    };

    const activeCount = rules.filter((r) => r.status === "ACTIVE").length;
    const pausedCount = rules.filter((r) => r.status === "PAUSED").length;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Automation Rules"
                description="Configure automated workflows based on triggers and actions"
                actions={
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm">
                            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                        </Button>
                        <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                            <Plus className="h-4 w-4 mr-2" /> Create Rule
                        </Button>
                    </div>
                }
            />

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold">{rules.length}</p>
                            <p className="text-xs text-muted-foreground">Total Rules</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-green-200">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-green-600">{activeCount}</p>
                            <p className="text-xs text-muted-foreground">Active</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-yellow-200">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-yellow-600">{pausedCount}</p>
                            <p className="text-xs text-muted-foreground">Paused</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Rules List */}
            <div className="space-y-4">
                {rules.map((rule) => (
                    <Card key={rule.id} className={cn(
                        rule.status === "PAUSED" && "opacity-60",
                        rule.status === "DISABLED" && "opacity-40"
                    )}>
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-xl">
                                        {TRIGGER_CONFIG[rule.trigger].icon}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold">{rule.name}</h3>
                                            <Badge variant={
                                                rule.status === "ACTIVE" ? "default" :
                                                    rule.status === "PAUSED" ? "secondary" : "outline"
                                            }>
                                                {rule.status}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>
                                        <div className="flex items-center gap-4 mt-2 text-xs">
                                            <span className="flex items-center gap-1">
                                                <span className="text-muted-foreground">Trigger:</span>
                                                <span className="px-1.5 py-0.5 rounded bg-secondary">
                                                    {TRIGGER_CONFIG[rule.trigger].label}
                                                </span>
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <span className="text-muted-foreground">Action:</span>
                                                <span className="px-1.5 py-0.5 rounded bg-secondary">
                                                    {ACTION_CONFIG[rule.action].label}
                                                </span>
                                            </span>
                                            {rule.triggerCount > 0 && (
                                                <span className="text-muted-foreground">
                                                    Triggered {rule.triggerCount} times
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {rule.status !== "DISABLED" && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => toggleRuleStatus(rule.id)}
                                            title={rule.status === "ACTIVE" ? "Pause" : "Activate"}
                                        >
                                            {rule.status === "ACTIVE" ? (
                                                <Pause className="h-4 w-4" />
                                            ) : (
                                                <Play className="h-4 w-4" />
                                            )}
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-600 hover:text-red-700"
                                        onClick={() => deleteRule(rule.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Create Rule Dialog */}
            {showCreateDialog && (
                <Dialog open onOpenChange={setShowCreateDialog}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Create Automation Rule</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Rule Name</label>
                                <Input placeholder="e.g., Auto Mark No-Show" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Description</label>
                                <Input placeholder="Brief description of what this rule does" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Trigger</label>
                                    <Select defaultValue="SCHEDULE">
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(TRIGGER_CONFIG).map(([key, val]) => (
                                                <SelectItem key={key} value={key}>{val.icon} {val.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Action</label>
                                    <Select defaultValue="UPDATE_STATUS">
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(ACTION_CONFIG).map(([key, val]) => (
                                                <SelectItem key={key} value={key}>{val.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                            <Button onClick={() => setShowCreateDialog(false)}>Create Rule</Button>
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
