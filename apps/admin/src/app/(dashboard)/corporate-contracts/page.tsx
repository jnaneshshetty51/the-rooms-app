"use client";

// apps/admin/src/app/(dashboard)/corporate-contracts/page.tsx
import { useEffect, useState, useCallback } from "react";
import { Plus, Edit, Trash2, Search, Filter, Building2, RefreshCw } from "lucide-react";
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
    fetchCorporateContracts,
    createCorporateContract,
    updateCorporateContract,
    terminateCorporateContract,
    renewCorporateContract,
    type CorporateContract,
} from "@/lib/api";

export default function CorporateContractsPage() {
    const [data, setData] = useState<{ contracts: CorporateContract[]; total: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: "ALL", search: "" });
    const [showModal, setShowModal] = useState(false);
    const [editingContract, setEditingContract] = useState<CorporateContract | null>(null);
    const [formData, setFormData] = useState({
        companyName: "",
        contactPerson: "",
        email: "",
        phone: "",
        discountPercentage: "0",
        creditLimit: "0",
        billingCycle: "MONTHLY",
        startDate: "",
        endDate: "",
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (filters.status !== "ALL") params.status = filters.status;
            if (filters.search) params.search = filters.search;

            const result = await fetchCorporateContracts(params);
            setData(result);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSubmit = async () => {
        const dataToSend = {
            companyName: formData.companyName,
            contactPerson: formData.contactPerson,
            email: formData.email,
            phone: formData.phone,
            discountPercentage: parseFloat(formData.discountPercentage),
            creditLimit: parseFloat(formData.creditLimit),
            billingCycle: formData.billingCycle as "MONTHLY" | "QUARTERLY",
            startDate: formData.startDate,
            endDate: formData.endDate,
        };

        if (editingContract) {
            await updateCorporateContract(editingContract.id, dataToSend);
        } else {
            await createCorporateContract(dataToSend);
        }
        setShowModal(false);
        setEditingContract(null);
        setFormData({ companyName: "", contactPerson: "", email: "", phone: "", discountPercentage: "0", creditLimit: "0", billingCycle: "MONTHLY", startDate: "", endDate: "" });
        fetchData();
    };

    const handleEdit = (contract: CorporateContract) => {
        setEditingContract(contract);
        setFormData({
            companyName: contract.companyName,
            contactPerson: contract.contactPerson,
            email: contract.email,
            phone: contract.phone,
            discountPercentage: contract.discountPercentage.toString(),
            creditLimit: contract.creditLimit.toString(),
            billingCycle: contract.billingCycle,
            startDate: contract.startDate.split("T")[0],
            endDate: contract.endDate.split("T")[0],
        });
        setShowModal(true);
    };

    const handleTerminate = async (id: string) => {
        if (!confirm("Terminate this contract?")) return;
        await terminateCorporateContract(id);
        fetchData();
    };

    const handleRenew = async (id: string) => {
        const newEndDate = prompt("Enter new end date (YYYY-MM-DD):");
        if (newEndDate) {
            await renewCorporateContract(id, newEndDate);
            fetchData();
        }
    };

    const columns: ColumnDef<CorporateContract, unknown>[] = [
        {
            accessorKey: "companyName",
            header: "Company",
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-secondary" />
                    </div>
                    <div>
                        <p className="font-semibold">{row.original.companyName}</p>
                        <p className="text-xs text-muted-foreground">{row.original.contactPerson}</p>
                    </div>
                </div>
            ),
        },
        { accessorKey: "email", header: "Email" },
        { accessorKey: "phone", header: "Phone" },
        {
            accessorKey: "discountPercentage",
            header: "Discount",
            cell: ({ row }) => <span className="font-semibold">{row.original.discountPercentage}%</span>,
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => (
                <Badge variant={row.original.status === "ACTIVE" ? "success" : row.original.status === "EXPIRED" ? "secondary" : "destructive"}>
                    {row.original.status}
                </Badge>
            ),
        },
        {
            accessorKey: "endDate",
            header: "Expires",
            cell: ({ row }) => (
                <span className="text-sm">{formatDate(row.original.endDate, "short")}</span>
            ),
        },
        {
            id: "actions",
            header: "",
            cell: ({ row }) => (
                <div className="flex items-center gap-1 justify-end">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}><Edit className="h-4 w-4" /></Button>
                    {row.original.status === "ACTIVE" && (
                        <>
                            <Button variant="ghost" size="icon" onClick={() => handleRenew(row.original.id)}><RefreshCw className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleTerminate(row.original.id)}><Trash2 className="h-4 w-4" /></Button>
                        </>
                    )}
                </div>
            ),
        },
    ];

    const stats = data?.contracts ? {
        total: data.contracts.length,
        active: data.contracts.filter((c) => c.status === "ACTIVE").length,
        expired: data.contracts.filter((c) => c.status === "EXPIRED").length,
    } : { total: 0, active: 0, expired: 0 };

    return (
        <div className="space-y-6">
            <PageHeader title="Corporate Contracts" description="Manage corporate billing contracts" actions={<Button onClick={() => setShowModal(true)}><Plus className="h-4 w-4 mr-2" />Add Contract</Button>} />
            <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Total Contracts" value={stats.total} icon={Building2} />
                <StatCard label="Active" value={stats.active} icon={Building2} />
                <StatCard label="Expired" value={stats.expired} icon={Building2} />
            </div>
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search contracts..." value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} className="pl-9" />
                </div>
                <Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}>
                    <SelectTrigger className="w-[150px]"><Filter className="h-4 w-4 mr-1.5 text-muted-foreground" /><span>{filters.status === "ALL" ? "All Status" : filters.status}</span></SelectTrigger>
                    <SelectContent>
                        <option value="ALL">All Status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="EXPIRED">Expired</option>
                        <option value="TERMINATED">Terminated</option>
                    </SelectContent>
                </Select>
            </div>
            <DataTable columns={columns} data={data?.contracts ?? []} isLoading={loading} pageSize={20} filterPlaceholder="Filter contracts..." />
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>{editingContract ? "Edit Contract" : "Add Contract"}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Company Name</Label><Input value={formData.companyName} onChange={(e) => setFormData((f) => ({ ...f, companyName: e.target.value }))} /></div>
                            <div className="space-y-2"><Label>Contact Person</Label><Input value={formData.contactPerson} onChange={(e) => setFormData((f) => ({ ...f, contactPerson: e.target.value }))} /></div>
                            <div className="space-y-2"><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))} /></div>
                            <div className="space-y-2"><Label>Phone</Label><Input value={formData.phone} onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))} /></div>
                            <div className="space-y-2"><Label>Discount %</Label><Input type="number" value={formData.discountPercentage} onChange={(e) => setFormData((f) => ({ ...f, discountPercentage: e.target.value }))} /></div>
                            <div className="space-y-2"><Label>Credit Limit</Label><Input type="number" value={formData.creditLimit} onChange={(e) => setFormData((f) => ({ ...f, creditLimit: e.target.value }))} /></div>
                            <div className="space-y-2"><Label>Billing Cycle</Label><Select value={formData.billingCycle} onValueChange={(v) => setFormData((f) => ({ ...f, billingCycle: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><option value="MONTHLY">Monthly</option><option value="QUARTERLY">Quarterly</option></SelectContent></Select></div>
                            <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={formData.startDate} onChange={(e) => setFormData((f) => ({ ...f, startDate: e.target.value }))} /></div>
                            <div className="space-y-2"><Label>End Date</Label><Input type="date" value={formData.endDate} onChange={(e) => setFormData((f) => ({ ...f, endDate: e.target.value }))} /></div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button onClick={handleSubmit}>{editingContract ? "Update" : "Create"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}