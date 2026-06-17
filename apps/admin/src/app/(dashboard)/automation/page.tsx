"use client";

// apps/admin/src/app/(dashboard)/automation/page.tsx
// Automation Rules - Configure automated workflows without AI

import { useEffect, useState, useCallback } from "react";
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
    useToast,
} from "@the-rooms/ui";
import { cn } from "@the-rooms/ui";
import {
    fetchAutomationRules,
    createAutomationRule,
    updateAutomationRule,
    deleteAutomationRule,
    toggleAutomationRule,
    AutomationRule,
} from "@/lib/api";

// ─── Trigger/Action Config ─────────────────────────────────────────────────────

const TRIGGER_CONFIG: Record<string, { label: string; icon: string }> = {
    BOOKING_CREATED: { label: "Booking Created", icon: "📅" },
    CHECK_IN: { label: "Check-in", icon: "✅" },
    CHECK_OUT: { label: "Check-out", icon: "🚪" },
    NO_SHOW: { label: "No Show", icon: "👻" },
    PAYMENT_RECEIVED: { label: "Payment Received", icon: "💳" },
    SCHEDULE: { label: "Scheduled", icon: "⏰" },
    COMPLAINT_LOGGED: { label: "Complaint Logged", icon: "📝" },
};

const ACTION_CONFIG: Record<string, { label: string; icon: string }> = {
    SEND_SMS: { label: "Send SMS", icon: "📱" },
    SEND_EMAIL: { label: "Send Email", icon: "📧" },
    UPDATE_STATUS: { label: "Update Status", icon: "🔄" },
    CREATE_INVOICE: { label: "Create Invoice", icon: "🧾" },
    NOTIFY_STAFF: { label: "Notify Staff", icon: "👥" },
    BLOCK_ROOM: { label: "Block Room", icon: "🚫" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AutomationPage() {
    const [rules, setRules] = useState<AutomationRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [creating, setCreating] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const { toast } = useToast();

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        trigger: "SCHEDULE",
        action: "UPDATE_STATUS",
        condition: "",
    });

    // ─── Data Fetching ─────────────────────────────────────────────────────────

    const loadRules = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const { rules: fetchedRules } = await fetchAutomationRules();
            setRules(fetchedRules);
        } catch (error) {
            console.error("Failed to load automation rules:", error);
            toast({
                type: "error",
                title: "Error",
                message: "Failed to load automation rules",
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [toast]);

    useEffect(() => {
        loadRules();
    }, [loadRules]);

    // ─── Handlers ─────────────────────────────────────────────────────────────

    const handleRefresh = () => loadRules(true);

    const handleToggleStatus = async (ruleId: string, currentStatus: AutomationRule["status"]) => {
        if (currentStatus === "DISABLED") return;
        const newStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";

        try {
            await toggleAutomationRule(ruleId, newStatus);
            setRules((prev) =>
                prev.map((rule) =>
                    rule.id === ruleId ? { ...rule, status: newStatus } : rule
                )
            );
            toast({
                type: "success",
                title: "Success",
                message: `Rule ${newStatus === "ACTIVE" ? "activated" : "paused"} successfully`,
            });
        } catch (error) {
            console.error("Failed to toggle rule status:", error);
            toast({
                type: "error",
                title: "Error",
                message: "Failed to update rule status",
            });
        }
    };

    const handleDelete = async (ruleId: string) => {
        try {
            await deleteAutomationRule(ruleId);
            setRules((prev) => prev.filter((rule) => rule.id !== ruleId));
            setDeleteConfirmId(null);
            toast({
                type: "success",
                title: "Success",
                message: "Rule deleted successfully",
            });
        } catch (error) {
            console.error("Failed to delete rule:", error);
            toast({
                type: "error",
                title: "Error",
                message: "Failed to delete rule",
            });
        }
    };

    const handleCreate = async () => {
        if (!formData.name.trim()) {
            toast({
                type: "error",
                title: "Validation Error",
                message: "Rule name is required",
            });
            return;
        }

        setCreating(true);
        try {
            const { rule } = await createAutomationRule({
                name: formData.name,
                description: formData.description,
                trigger: formData.trigger as AutomationRule["trigger"],
                action: formData.action as AutomationRule["action"],
                condition: formData.condition || null,
                config: {},
            });

            setRules((prev) => [...prev, rule]);
            setShowCreateDialog(false);
            setFormData({ name: "", description: "", trigger: "SCHEDULE", action: "UPDATE_STATUS", condition: "" });

            toast({
                type: "success",
                title: "Success",
                message: "Automation rule created successfully",
            });
        } catch (error) {
            console.error("Failed to create rule:", error);
            toast({
                type: "error",
                title: "Error",
                message: "Failed to create rule",
            });
        } finally {
            setCreating(false);
        }
    };

    // ─── Computed Values ───────────────────────────────────────────────────────

    const activeCount = rules.filter((r) => r.status === "ACTIVE").length;
    const pausedCount = rules.filter((r) => r.status === "PAUSED").length;

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            <PageHeader
                title="Automation Rules"
                description="Configure automated workflows based on triggers and actions"
                actions={
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} /> Refresh
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

            {/* Loading State */}
            {loading ? (
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="h-12 w-12 rounded-lg bg-muted" />
                                        <div className="space-y-2">
                                            <div className="h-5 w-48 bg-muted rounded" />
                                            <div className="h-4 w-72 bg-muted rounded" />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : rules.length === 0 ? (
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center">
                            <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-lg font-medium">No automation rules</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Create your first automation rule to get started
                            </p>
                            <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                                <Plus className="h-4 w-4 mr-2" /> Create Rule
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                /* Rules List */
                <div className="space-y-4">
                    {rules.map((rule) => (
                        <Card
                            key={rule.id}
                            className={cn(
                                rule.status === "PAUSED" && "opacity-60",
                                rule.status === "DISABLED" && "opacity-40"
                            )}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-xl">
                                            {TRIGGER_CONFIG[rule.trigger]?.icon || "⚙️"}
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
                                                        {TRIGGER_CONFIG[rule.trigger]?.label || rule.trigger}
                                                    </span>
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <span className="text-muted-foreground">Action:</span>
                                                    <span className="px-1.5 py-0.5 rounded bg-secondary">
                                                        {ACTION_CONFIG[rule.action]?.label || rule.action}
                                                    </span>
                                                </span>
                                                {rule.triggerCount > 0 && (
                                                    <span className="text-muted-foreground flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
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
                                                onClick={() => handleToggleStatus(rule.id, rule.status)}
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
                                            onClick={() => setDeleteConfirmId(rule.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create Rule Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Create Automation Rule</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Rule Name *</label>
                            <Input
                                placeholder="e.g., Auto Mark No-Show"
                                value={formData.name}
                                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Input
                                placeholder="Brief description of what this rule does"
                                value={formData.description}
                                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Trigger</label>
                                <Select
                                    value={formData.trigger}
                                    onValueChange={(v) => setFormData((prev) => ({ ...prev, trigger: v }))}
                                >
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
                                <Select
                                    value={formData.action}
                                    onValueChange={(v) => setFormData((prev) => ({ ...prev, action: v }))}
                                >
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
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Condition (optional)</label>
                            <Input
                                placeholder="e.g., booking.amount > 5000"
                                value={formData.condition}
                                onChange={(e) => setFormData((prev) => ({ ...prev, condition: e.target.value }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={creating}>
                            {creating ? "Creating..." : "Create Rule"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Automation Rule</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to delete this automation rule? This action cannot be undone.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
                            Delete
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
