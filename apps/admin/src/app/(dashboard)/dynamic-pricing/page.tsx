"use client";

// apps/admin/src/app/(dashboard)/dynamic-pricing/page.tsx
import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Zap, ToggleLeft, ToggleRight, ArrowUp, ArrowDown } from "lucide-react";
import {
    PageHeader,
    Button,
    Card,
    CardContent,
    Badge,
    Input,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Label,
    Select,
    SelectTrigger,
    SelectContent,
    SelectValue,
} from "@the-rooms/ui";
import {
    fetchDynamicPricingRules,
    createDynamicPricingRule,
    updateDynamicPricingRule,
    deleteDynamicPricingRule,
    type DynamicPricingRule,
} from "@/lib/api";

const CONDITION_TYPES = [
    { value: "DAY_OF_WEEK", label: "Day of Week" },
    { value: "OCCUPANCY", label: "Occupancy Level" },
    { value: "LEAD_TIME", label: "Booking Lead Time" },
    { value: "SPECIAL_EVENT", label: "Special Event" },
];

const OPERATORS = [
    { value: "EQ", label: "Equals (=)" },
    { value: "GT", label: "Greater Than (>)" },
    { value: "LT", label: "Less Than (<)" },
    { value: "GTE", label: "Greater or Equal (>=)" },
    { value: "LTE", label: "Less or Equal (<=)" },
];

export default function DynamicPricingPage() {
    const [rules, setRules] = useState<DynamicPricingRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingRule, setEditingRule] = useState<DynamicPricingRule | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        conditionType: "DAY_OF_WEEK",
        operator: "EQ",
        conditionValue: "",
        priceAdjustment: "0",
        priority: "0",
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const result = await fetchDynamicPricingRules();
            setRules((result.rules || []).sort((a, b) => a.priority - b.priority));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async () => {
        const data = {
            name: formData.name,
            condition: {
                type: formData.conditionType as DynamicPricingRule["condition"]["type"],
                operator: formData.operator as DynamicPricingRule["condition"]["operator"],
                value: formData.conditionType === "OCCUPANCY" || formData.conditionType === "LEAD_TIME"
                    ? parseInt(formData.conditionValue, 10)
                    : formData.conditionValue,
            },
            priceAdjustment: parseFloat(formData.priceAdjustment),
            priority: parseInt(formData.priority, 10),
        };

        if (editingRule) {
            await updateDynamicPricingRule(editingRule.id, data);
        } else {
            await createDynamicPricingRule(data);
        }
        setShowModal(false);
        setEditingRule(null);
        setFormData({
            name: "",
            conditionType: "DAY_OF_WEEK",
            operator: "EQ",
            conditionValue: "",
            priceAdjustment: "0",
            priority: "0",
        });
        fetchData();
    };

    const handleEdit = (rule: DynamicPricingRule) => {
        setEditingRule(rule);
        setFormData({
            name: rule.name,
            conditionType: rule.condition.type,
            operator: rule.condition.operator,
            conditionValue: String(rule.condition.value),
            priceAdjustment: rule.priceAdjustment.toString(),
            priority: rule.priority.toString(),
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this pricing rule?")) return;
        await deleteDynamicPricingRule(id);
        fetchData();
    };

    const handleToggle = async (rule: DynamicPricingRule) => {
        await updateDynamicPricingRule(rule.id, { isActive: !rule.isActive });
        fetchData();
    };

    const formatCondition = (rule: DynamicPricingRule) => {
        const type = CONDITION_TYPES.find((t) => t.value === rule.condition.type);
        const op = OPERATORS.find((o) => o.value === rule.condition.operator);
        return `${type?.label ?? rule.condition.type} ${op?.label ?? rule.condition.operator} ${rule.condition.value}`;
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Dynamic Pricing Rules"
                description="Configure automated pricing adjustments based on conditions"
                actions={
                    <Button onClick={() => setShowModal(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Rule
                    </Button>
                }
            />

            {/* Rules List */}
            <div className="grid gap-4">
                {loading ? (
                    [...Array(3)].map((_, i) => (
                        <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
                    ))
                ) : rules.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Zap className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No dynamic pricing rules configured</p>
                        </CardContent>
                    </Card>
                ) : (
                    rules.map((rule, index) => (
                        <Card key={rule.id} className={!rule.isActive ? "opacity-60" : ""}>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <Zap className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {index > 0 && (
                                                <ArrowUp className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary" />
                                            )}
                                            {index < rules.length - 1 && (
                                                <ArrowDown className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary" />
                                            )}
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold">{rule.name}</h3>
                                                    <Badge variant={rule.isActive ? "success" : "secondary"}>
                                                        {rule.isActive ? "Active" : "Inactive"}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {formatCondition(rule)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className={`text-2xl font-bold ${rule.priceAdjustment >= 0 ? "text-success" : "text-destructive"}`}>
                                                {rule.priceAdjustment >= 0 ? "+" : ""}{rule.priceAdjustment.toFixed(2)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Priority: {rule.priority}
                                            </p>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => handleToggle(rule)}>
                                            {rule.isActive ? (
                                                <ToggleRight className="h-6 w-6 text-success" />
                                            ) : (
                                                <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                                            )}
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(rule)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => handleDelete(rule.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Create/Edit Modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingRule ? "Edit Pricing Rule" : "Add Pricing Rule"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Rule Name</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                                placeholder="e.g., Weekend Premium, High Occupancy Surge"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Condition Type</Label>
                            <Select
                                value={formData.conditionType}
                                onValueChange={(v) => setFormData((f) => ({ ...f, conditionType: v }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CONDITION_TYPES.map((type) => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Operator</Label>
                                <Select
                                    value={formData.operator}
                                    onValueChange={(v) => setFormData((f) => ({ ...f, operator: v }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {OPERATORS.map((op) => (
                                            <option key={op.value} value={op.value}>
                                                {op.label}
                                            </option>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Value</Label>
                                <Input
                                    value={formData.conditionValue}
                                    onChange={(e) => setFormData((f) => ({ ...f, conditionValue: e.target.value }))}
                                    placeholder={
                                        formData.conditionType === "DAY_OF_WEEK"
                                            ? "e.g., SAT, SUN"
                                            : formData.conditionType === "OCCUPANCY"
                                                ? "e.g., 80"
                                                : formData.conditionType === "LEAD_TIME"
                                                    ? "e.g., 7"
                                                    : "e.g., Diwali"
                                    }
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Price Adjustment</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.priceAdjustment}
                                    onChange={(e) => setFormData((f) => ({ ...f, priceAdjustment: e.target.value }))}
                                    placeholder="0.00"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Positive for increase, negative for discount
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label>Priority</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={formData.priority}
                                    onChange={(e) => setFormData((f) => ({ ...f, priority: e.target.value }))}
                                    placeholder="0"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Lower = higher priority
                                </p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit}>
                            {editingRule ? "Update" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}