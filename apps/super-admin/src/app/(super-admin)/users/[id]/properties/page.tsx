"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    PageHeader,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Badge,
    Button,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    LoadingSpinner,
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
} from "@the-rooms/ui";
import {
    Plus,
    Trash2,
    Edit,
    ArrowLeft,
    Building2,
    Shield,
    User,
} from "lucide-react";
import { useToast } from "@the-rooms/ui";

type PropertyRole = "VIEWER" | "STAFF" | "MANAGER" | "ADMIN";

interface PropertyAccess {
    id: string;
    userId: string;
    propertyId: string;
    role: PropertyRole;
    createdAt: string;
    property: {
        id: string;
        name: string;
        code: string;
        city: string | null;
        isActive: boolean;
    };
}

interface Property {
    id: string;
    name: string;
    code: string;
    city: string | null;
    isActive: boolean;
}

const ROLE_LABELS: Record<PropertyRole, string> = {
    VIEWER: "Viewer",
    STAFF: "Staff",
    MANAGER: "Manager",
    ADMIN: "Admin",
};

const ROLE_COLORS: Record<PropertyRole, string> = {
    VIEWER: "bg-gray-100 text-gray-700",
    STAFF: "bg-blue-100 text-blue-700",
    MANAGER: "bg-amber-100 text-amber-700",
    ADMIN: "bg-green-100 text-green-700",
};

export default function UserPropertiesPage() {
    const params = useParams();
    const router = useRouter();
    const toast = useToast();
    const userId = params.id as string;

    const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
    const [propertyAccess, setPropertyAccess] = useState<PropertyAccess[]>([]);
    const [availableProperties, setAvailableProperties] = useState<Property[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingAccess, setEditingAccess] = useState<PropertyAccess | null>(null);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
    const [selectedRole, setSelectedRole] = useState<PropertyRole>("VIEWER");

    const loadUser = useCallback(async () => {
        try {
            const res = await fetch("/api/users");
            if (res.ok) {
                const json = await res.json();
                const foundUser = json.data?.find((u: { id: string }) => u.id === userId);
                if (foundUser) {
                    setUser(foundUser);
                }
            }
        } catch {
            // error
        }
    }, [userId]);

    const loadPropertyAccess = useCallback(async () => {
        try {
            const res = await fetch(`/api/users/${userId}/properties`);
            if (res.ok) {
                const json = await res.json();
                if (json.data) setPropertyAccess(json.data);
            }
        } catch {
            // error
        }
    }, [userId]);

    const loadAvailableProperties = useCallback(async () => {
        try {
            const res = await fetch("/api/properties");
            if (res.ok) {
                const json = await res.json();
                if (json.data) {
                    const activeProperties = json.data.filter((p: Property) => p.isActive);
                    setAvailableProperties(activeProperties);
                }
            }
        } catch {
            // error
        }
    }, []);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        await Promise.all([loadUser(), loadPropertyAccess(), loadAvailableProperties()]);
        setIsLoading(false);
    }, [loadUser, loadPropertyAccess, loadAvailableProperties]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const assignedPropertyIds = propertyAccess.map((pa) => pa.propertyId);
    const unassignedProperties = availableProperties.filter(
        (p) => !assignedPropertyIds.includes(p.id)
    );

    function openAdd() {
        setEditingAccess(null);
        setSelectedPropertyId("");
        setSelectedRole("VIEWER");
        setDialogOpen(true);
    }

    function openEdit(access: PropertyAccess) {
        setEditingAccess(access);
        setSelectedRole(access.role);
        setDialogOpen(true);
    }

    async function handleSubmit() {
        if (!editingAccess && !selectedPropertyId) {
            toast.error("Please select a property");
            return;
        }

        try {
            if (editingAccess) {
                // Update existing access
                const res = await fetch(`/api/users/property-access/${editingAccess.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ role: selectedRole }),
                });
                const data = await res.json();
                if (!res.ok) {
                    toast.error(data.error || "Failed to update access");
                    return;
                }
                toast.success("Access updated successfully");
            } else {
                // Create new access
                const res = await fetch(`/api/users/${userId}/properties`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ propertyId: selectedPropertyId, role: selectedRole }),
                });
                const data = await res.json();
                if (!res.ok) {
                    toast.error(data.error || "Failed to assign property");
                    return;
                }
                toast.success("Property assigned successfully");
            }

            setDialogOpen(false);
            loadPropertyAccess();
        } catch {
            toast.error("Failed to save property access");
        }
    }

    async function handleDelete(accessId: string) {
        try {
            const res = await fetch(`/api/users/property-access/${accessId}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const data = await res.json();
                toast.error(data.error || "Failed to remove access");
                return;
            }
            toast.success("Access removed successfully");
            loadPropertyAccess();
        } catch {
            toast.error("Failed to remove property access");
        }
    }

    if (isLoading) {
        return (
            <div className="flex h-full min-h-[50vh] items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <PageHeader
                    title={`${user?.name || "User"}'s Properties`}
                    description={user?.email ? `Managing property access for ${user.email}` : "Managing property access"}
                />
            </div>

            {/* User Info Card */}
            {user && (
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-[#E17055] flex items-center justify-center">
                                <User className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <p className="font-medium">{user.name}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                            <div className="ml-auto">
                                <Badge variant="outline">
                                    {propertyAccess.length} {propertyAccess.length === 1 ? "Property" : "Properties"}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Properties Access Table */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Property Access
                    </CardTitle>
                    <Button onClick={openAdd} size="sm" className="gap-2" disabled={unassignedProperties.length === 0}>
                        <Plus className="h-4 w-4" />
                        Assign Property
                    </Button>
                </CardHeader>
                <CardContent>
                    {propertyAccess.length === 0 ? (
                        <div className="text-center py-8">
                            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50" />
                            <p className="mt-2 text-sm text-muted-foreground">No properties assigned yet</p>
                            {unassignedProperties.length > 0 && (
                                <Button onClick={openAdd} variant="outline" className="mt-4 gap-2">
                                    <Plus className="h-4 w-4" />
                                    Assign First Property
                                </Button>
                            )}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Property</TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Assigned</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {propertyAccess.map((access) => (
                                    <TableRow key={access.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">{access.property.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                                {access.property.code}
                                            </code>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {access.property.city || "—"}
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[access.role]
                                                    }`}
                                            >
                                                {ROLE_LABELS[access.role]}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {new Date(access.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 justify-end">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => openEdit(access)}
                                                    title="Edit role"
                                                >
                                                    <Edit className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                                    onClick={() => handleDelete(access.id)}
                                                    title="Remove access"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingAccess ? "Update Property Access" : "Assign Property"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {editingAccess ? (
                            <div className="p-3 bg-muted rounded-lg">
                                <p className="font-medium">{editingAccess.property.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {editingAccess.property.code} • {editingAccess.property.city || "No city"}
                                </p>
                            </div>
                        ) : (
                            <div>
                                <label className="text-sm font-medium">Select Property *</label>
                                <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Choose a property" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {unassignedProperties.map((property) => (
                                            <SelectItem key={property.id} value={property.id}>
                                                {property.name} ({property.code})
                                                {property.city ? ` - ${property.city}` : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div>
                            <label className="text-sm font-medium flex items-center gap-1">
                                <Shield className="h-3 w-3" />
                                Property Role *
                            </label>
                            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as PropertyRole)}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="VIEWER">Viewer — Read-only access</SelectItem>
                                    <SelectItem value="STAFF">Staff — Basic operational access</SelectItem>
                                    <SelectItem value="MANAGER">Manager — Full property management</SelectItem>
                                    <SelectItem value="ADMIN">Admin — Full control including settings</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="mt-1 text-xs text-muted-foreground">
                                This role determines what this user can do within the assigned property.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit}>
                            {editingAccess ? "Update Access" : "Assign Property"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
