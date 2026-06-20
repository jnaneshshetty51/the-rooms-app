"use client";

// apps/admin/src/app/(dashboard)/guests/[id]/preferences/page.tsx
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Save, User, Utensils, Bed, Volume2 } from "lucide-react";
import { PageHeader, Button, Card, CardContent, CardHeader, CardTitle, Label, Input, Select, SelectTrigger, SelectContent, SelectValue, Badge, Breadcrumbs, BreadcrumbItem } from "@the-rooms/ui";
import { fetchGuestPreferences, updateGuestPreferences, type GuestPreferences } from "@/lib/api";

export default function GuestPreferencesPage() {
    const params = useParams();
    const guestId = params.id as string;
    const [preferences, setPreferences] = useState<GuestPreferences | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        roomTypePreference: "",
        floorPreference: "NONE",
        bedPreference: "NONE",
        smokingPreference: false,
        quietRoom: false,
        dietaryRestrictions: "",
        specialOccasions: "",
        amenities: "",
        notes: "",
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const data = await fetchGuestPreferences(guestId);
                setPreferences(data);
                setFormData({
                    roomTypePreference: data.roomTypePreference ?? "",
                    floorPreference: data.floorPreference,
                    bedPreference: data.bedPreference,
                    smokingPreference: data.smokingPreference,
                    quietRoom: data.quietRoom,
                    dietaryRestrictions: data.dietaryRestrictions.join(", "),
                    specialOccasions: data.specialOccasions.join(", "),
                    amenities: data.amenities.join(", "),
                    notes: data.notes ?? "",
                });
            } finally { setLoading(false); }
        };
        fetchData();
    }, [guestId]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateGuestPreferences(guestId, {
                roomTypePreference: formData.roomTypePreference || null,
                floorPreference: formData.floorPreference as "LOW" | "HIGH" | "NONE",
                bedPreference: formData.bedPreference as "SINGLE" | "DOUBLE" | "NONE",
                smokingPreference: formData.smokingPreference,
                quietRoom: formData.quietRoom,
                dietaryRestrictions: formData.dietaryRestrictions.split(",").map((s) => s.trim()).filter(Boolean),
                specialOccasions: formData.specialOccasions.split(",").map((s) => s.trim()).filter(Boolean),
                amenities: formData.amenities.split(",").map((s) => s.trim()).filter(Boolean),
                notes: formData.notes || null,
            });
            alert("Preferences saved!");
        } finally { setSaving(false); }
    };

    if (loading) { return <div className="space-y-6"><PageHeader title="Guest Preferences" description="Loading..." /><div className="h-64 animate-pulse rounded-xl bg-muted" /></div>; }

    const breadcrumbItems: BreadcrumbItem[] = [
        { label: "Guests", href: "/guests" },
        { label: guestId },
        { label: "Preferences" },
    ];

    return (
        <div className="space-y-6">
            <Breadcrumbs items={breadcrumbItems} />
            <PageHeader title="Guest Preferences" description={`Managing preferences for guest ${guestId}`} actions={<Button onClick={handleSave} disabled={saving}><Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Save Preferences"}</Button>} />
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader><CardTitle className="font-heading text-lg flex items-center gap-2"><Bed className="h-5 w-5" />Room Preferences</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2"><Label>Room Type Preference</Label><Input value={formData.roomTypePreference} onChange={(e) => setFormData((f) => ({ ...f, roomTypePreference: e.target.value }))} placeholder="e.g., Deluxe Suite" /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Floor Preference</Label><select className="w-full p-2 border rounded-lg" value={formData.floorPreference} onChange={(e) => setFormData((f) => ({ ...f, floorPreference: e.target.value }))}><option value="NONE">No Preference</option><option value="LOW">Low Floor</option><option value="HIGH">High Floor</option></select></div>
                            <div className="space-y-2"><Label>Bed Preference</Label><select className="w-full p-2 border rounded-lg" value={formData.bedPreference} onChange={(e) => setFormData((f) => ({ ...f, bedPreference: e.target.value }))}><option value="NONE">No Preference</option><option value="SINGLE">Single Bed</option><option value="DOUBLE">Double Bed</option></select></div>
                        </div>
                        <div className="flex flex-wrap gap-4">
                            <label className="flex items-center gap-2"><input type="checkbox" checked={formData.smokingPreference} onChange={(e) => setFormData((f) => ({ ...f, smokingPreference: e.target.checked }))} /> Smoking</label>
                            <label className="flex items-center gap-2"><input type="checkbox" checked={formData.quietRoom} onChange={(e) => setFormData((f) => ({ ...f, quietRoom: e.target.checked }))} /> Quiet Room</label>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="font-heading text-lg flex items-center gap-2"><Utensils className="h-5 w-5" />Dietary & Special</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2"><Label>Dietary Restrictions</Label><Input value={formData.dietaryRestrictions} onChange={(e) => setFormData((f) => ({ ...f, dietaryRestrictions: e.target.value }))} placeholder="Comma separated" /><p className="text-xs text-muted-foreground">e.g., Vegetarian, Vegan, Gluten-free</p></div>
                        <div className="space-y-2"><Label>Special Occasions</Label><Input value={formData.specialOccasions} onChange={(e) => setFormData((f) => ({ ...f, specialOccasions: e.target.value }))} placeholder="e.g., Anniversary, Birthday" /></div>
                        <div className="space-y-2"><Label>Amenities</Label><Input value={formData.amenities} onChange={(e) => setFormData((f) => ({ ...f, amenities: e.target.value }))} placeholder="e.g., Extra Pillows, Mini Bar" /></div>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                    <CardHeader><CardTitle className="font-heading text-lg flex items-center gap-2"><User className="h-5 w-5" />Notes</CardTitle></CardHeader>
                    <CardContent>
                        <textarea className="w-full h-24 p-3 border rounded-lg text-sm" value={formData.notes} onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))} placeholder="Additional notes about guest preferences..." />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}