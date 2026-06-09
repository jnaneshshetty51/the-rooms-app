"use client";

// apps/admin/src/app/(dashboard)/rooms/[id]/page.tsx
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  ImageIcon,
} from "lucide-react";
import { Button, StatusBadge, Input, Select, SelectTrigger, SelectContent, SelectValue, Badge } from "@the-rooms/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@the-rooms/ui";
import { PageHeader } from "@the-rooms/ui";

interface Amenity {
  amenity: { id: string; name: string; icon: string };
}

interface Room {
  id: string;
  roomNumber: string;
  type: "STUDIO" | "PREMIUM";
  floor: number;
  status: "VACANT" | "OCCUPIED" | "MAINTENANCE" | "BLOCKED";
  description: string | null;
  maxOccupancy: number;
  sizeSqft: number | null;
  basePriceSingle: string;
  basePriceDouble: string;
  monthlyPriceSingle: string | null;
  monthlyPriceDouble: string | null;
  internalNotes: string | null;
  amenities: Amenity[];
}

export default function RoomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    roomNumber: "",
    type: "STUDIO" as "STUDIO" | "PREMIUM",
    floor: "1",
    description: "",
    maxOccupancy: "2",
    basePriceSingle: "",
    basePriceDouble: "",
    monthlyPriceSingle: "",
    monthlyPriceDouble: "",
    internalNotes: "",
    status: "VACANT" as "VACANT" | "OCCUPIED" | "MAINTENANCE" | "BLOCKED",
  });

  useEffect(() => {
    fetch(`/api/rooms/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.room) {
          setRoom(data.room);
          setForm({
            roomNumber: data.room.roomNumber,
            type: data.room.type,
            floor: String(data.room.floor),
            description: data.room.description ?? "",
            maxOccupancy: String(data.room.maxOccupancy),
            basePriceSingle: String(data.room.basePriceSingle),
            basePriceDouble: String(data.room.basePriceDouble),
            monthlyPriceSingle: data.room.monthlyPriceSingle ? String(data.room.monthlyPriceSingle) : "",
            monthlyPriceDouble: data.room.monthlyPriceDouble ? String(data.room.monthlyPriceDouble) : "",
            internalNotes: data.room.internalNotes ?? "",
            status: data.room.status,
          });
        }
        setLoading(false);
      });
  }, [id]);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/rooms/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          floor: parseInt(form.floor),
          maxOccupancy: parseInt(form.maxOccupancy),
          basePriceSingle: parseFloat(form.basePriceSingle),
          basePriceDouble: parseFloat(form.basePriceDouble),
          monthlyPriceSingle: form.monthlyPriceSingle ? parseFloat(form.monthlyPriceSingle) : null,
          monthlyPriceDouble: form.monthlyPriceDouble ? parseFloat(form.monthlyPriceDouble) : null,
        }),
      });
      // Refresh
      const res = await fetch(`/api/rooms/${id}`);
      const data = await res.json();
      setRoom(data.room);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Room not found.</p>
        <Button variant="outline" onClick={() => router.push("/rooms")} className="mt-4">
          Back to Rooms
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/rooms")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-heading text-2xl font-bold">Room {room.roomNumber}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={room.type === "PREMIUM" ? "default" : "secondary"}>
                {room.type}
              </Badge>
              <StatusBadge status={room.status} type="room" />
            </div>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1.5" />
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">Room Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Room Number *</label>
                  <Input
                    value={form.roomNumber}
                    onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Status</label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as typeof form.status })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <option value="VACANT">Vacant</option>
                      <option value="OCCUPIED">Occupied</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="BLOCKED">Blocked</option>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Type</label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as "STUDIO" | "PREMIUM" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <option value="STUDIO">Studio</option>
                      <option value="PREMIUM">Premium</option>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Floor</label>
                  <Input
                    type="number"
                    min="1"
                    value={form.floor}
                    onChange={(e) => setForm({ ...form, floor: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Max Occupancy</label>
                  <Input
                    type="number"
                    min="1"
                    max="6"
                    value={form.maxOccupancy}
                    onChange={(e) => setForm({ ...form, maxOccupancy: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Size (sqft)</label>
                  <Input
                    type="number"
                    value={room.sizeSqft ?? ""}
                    disabled
                    className="text-muted-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[100px]"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Room description…"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Internal Notes (admin only)</label>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px]"
                  value={form.internalNotes}
                  onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
                  placeholder="Notes visible only to admin…"
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Single Occupancy (₹)</label>
                  <Input
                    type="number"
                    min="0"
                    value={form.basePriceSingle}
                    onChange={(e) => setForm({ ...form, basePriceSingle: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Double Occupancy (₹)</label>
                  <Input
                    type="number"
                    min="0"
                    value={form.basePriceDouble}
                    onChange={(e) => setForm({ ...form, basePriceDouble: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Monthly (Single, ₹)</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Optional"
                    value={form.monthlyPriceSingle}
                    onChange={(e) => setForm({ ...form, monthlyPriceSingle: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Monthly (Double, ₹)</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Optional"
                    value={form.monthlyPriceDouble}
                    onChange={(e) => setForm({ ...form, monthlyPriceDouble: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar — Type Images Info */}
        <div className="space-y-6">
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-blue-600" />
                Room Photos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-blue-800">
                Photos are shared across all <strong>{room.type === "STUDIO" ? "Studio" : "Premium"}</strong> rooms. Upload or manage images from the Room Types page — they apply to every room of this type automatically.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
                onClick={() => router.push("/room-types")}
              >
                <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
                Manage {room.type === "STUDIO" ? "Studio" : "Premium"} Photos
              </Button>
            </CardContent>
          </Card>

          {/* Amenities summary */}
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-lg">
                Amenities ({room.amenities.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {room.amenities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No amenities assigned</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {room.amenities.map((ra) => (
                    <Badge key={ra.amenity.id} variant="secondary">
                      {ra.amenity.name}
                    </Badge>
                  ))}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3"
                onClick={() => router.push("/amenities")}
              >
                Manage Amenities
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
