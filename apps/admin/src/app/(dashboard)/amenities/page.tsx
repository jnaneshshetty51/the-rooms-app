"use client";

// apps/admin/src/app/(dashboard)/amenities/page.tsx
import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Sparkles, Search } from "lucide-react";
import { PageHeader, Button, Dialog, Input, Select, SelectTrigger, SelectContent, SelectValue, Badge } from "@the-rooms/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@the-rooms/ui";

interface RoomRef { id: string; roomNumber: string }

interface AmenityRoom { room: RoomRef }

interface Amenity {
  id: string;
  name: string;
  icon: string;
  description: string | null;
  category: string;
  rooms: AmenityRoom[];
}

const CATEGORY_LABELS: Record<string, string> = {
  ESSENTIAL: "Essential",
  COMFORT: "Comfort",
  ENTERTAINMENT: "Entertainment",
  BUSINESS: "Business",
};

export default function AmenitiesPage() {
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [rooms, setRooms] = useState<RoomRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState<Amenity | null>(null);
  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    icon: "Wifi",
    description: "",
    category: "ESSENTIAL",
  });

  const fetchData = useCallback(async () => {
    const [aRes, rRes] = await Promise.all([
      fetch("/api/amenities"),
      fetch("/api/rooms"),
    ]);
    const aData = await aRes.json();
    const rData = await rRes.json();
    setAmenities(aData.amenities ?? []);
    setRooms(rData.rooms ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = amenities.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.category.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingAmenity ? "/api/amenities" : "/api/amenities";
      const method = editingAmenity ? "PATCH" : "POST";
      const body: Record<string, unknown> = { ...form };
      if (editingAmenity) body.id = editingAmenity.id;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowAddModal(false);
        setEditingAmenity(null);
        setForm({ name: "", icon: "Wifi", description: "", category: "ESSENTIAL" });
        fetchData();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this amenity?")) return;
    await fetch(`/api/amenities?id=${id}`, { method: "DELETE" });
    fetchData();
  }

  async function handleAssignRoom(amenityId: string, roomId: string) {
    await fetch(`/api/amenities/${amenityId}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    });
    fetchData();
  }

  async function handleUnassignRoom(amenityId: string, roomId: string) {
    await fetch(`/api/amenities/${amenityId}/rooms?roomId=${roomId}`, { method: "DELETE" });
    fetchData();
  }

  function startEdit(a: Amenity) {
    setEditingAmenity(a);
    setForm({ name: a.name, icon: a.icon, description: a.description ?? "", category: a.category });
    setShowAddModal(true);
  }

  const assignedRoomIds = new Set(selectedAmenity?.rooms.map((r) => r.room.id) ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Amenity Management"
        description="Manage hotel amenities and assign them to rooms"
        actions={
          <Button onClick={() => { setShowAddModal(true); setEditingAmenity(null); setForm({ name: "", icon: "Wifi", description: "", category: "ESSENTIAL" }); }}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Amenity
          </Button>
        }
      />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search amenities…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Amenity Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No amenities found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((amenity) => (
            <Card key={amenity.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="font-heading text-base">{amenity.name}</CardTitle>
                      <Badge variant="outline" className="text-xs mt-0.5">
                        {CATEGORY_LABELS[amenity.category] ?? amenity.category}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(amenity)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(amenity.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {amenity.description && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{amenity.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {amenity.rooms.length} room{amenity.rooms.length !== 1 ? "s" : ""}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setSelectedAmenity(selectedAmenity?.id === amenity.id ? null : amenity)}
                  >
                    {selectedAmenity?.id === amenity.id ? "Close" : "Assign"}
                  </Button>
                </div>

                {/* Assign rooms inline */}
                {selectedAmenity?.id === amenity.id && (
                  <div className="mt-3 pt-3 border-t space-y-2 max-h-40 overflow-y-auto">
                    {rooms.map((room) => {
                      const assigned = assignedRoomIds.has(room.id);
                      return (
                        <div key={room.id} className="flex items-center justify-between text-xs">
                          <span>Room {room.roomNumber}</span>
                          <Button
                            variant={assigned ? "destructive" : "secondary"}
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => assigned ? handleUnassignRoom(amenity.id, room.id) : handleAssignRoom(amenity.id, room.id)}
                          >
                            {assigned ? "Remove" : "Assign"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showAddModal && (
        <Dialog open={showAddModal} onOpenChange={(v) => { setShowAddModal(v); if (!v) setEditingAmenity(null); }}>
          <div className="space-y-4">
            <h2 className="font-heading text-xl font-bold">{editingAmenity ? "Edit Amenity" : "Add Amenity"}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Name *</label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. High-Speed WiFi"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Icon (Lucide name)</label>
                  <Input
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    placeholder="e.g. Wifi"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Category *</label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <option value="ESSENTIAL">Essential</option>
                      <option value="COMFORT">Comfort</option>
                      <option value="ENTERTAINMENT">Entertainment</option>
                      <option value="BUSINESS">Business</option>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px]"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description…"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => { setShowAddModal(false); setEditingAmenity(null); }} className="flex-1">Cancel</Button>
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? "Saving…" : editingAmenity ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </Dialog>
      )}
    </div>
  );
}
