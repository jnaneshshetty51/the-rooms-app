"use client";

// apps/admin/src/app/(dashboard)/rooms/page.tsx
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Filter,
  BedDouble,
  Pencil,
  Trash2,
  ImageIcon,
  Wrench,
} from "lucide-react";
import { PageHeader, StatusBadge, Button, Dialog, Input, Select, SelectTrigger, SelectContent, SelectValue, Badge } from "@the-rooms/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@the-rooms/ui";
import { formatCurrency } from "@the-rooms/ui";

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
  basePriceSingle: string;
  basePriceDouble: string;
  thumbnail: string | null;
  amenities: Amenity[];
}

export default function RoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    roomNumber: "",
    type: "STUDIO" as "STUDIO" | "PREMIUM",
    floor: "1",
    description: "",
    maxOccupancy: "2",
    basePriceSingle: "999",
    basePriceDouble: "1799",
  });

  const fetchRooms = useCallback(async () => {
    const res = await fetch("/api/rooms");
    const data = await res.json();
    setRooms(data.rooms ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const filtered = rooms.filter((r) => {
    const matchSearch = r.roomNumber.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "ALL" || r.type === filterType;
    const matchStatus = filterStatus === "ALL" || r.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  async function handleAddRoom(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          floor: parseInt(form.floor),
          maxOccupancy: parseInt(form.maxOccupancy),
          basePriceSingle: parseFloat(form.basePriceSingle),
          basePriceDouble: parseFloat(form.basePriceDouble),
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setForm({ roomNumber: "", type: "STUDIO", floor: "1", description: "", maxOccupancy: "2", basePriceSingle: "999", basePriceDouble: "1799" });
        fetchRooms();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(room: Room) {
    const nextStatus = room.status === "MAINTENANCE" ? "VACANT" : "MAINTENANCE";
    await fetch("/api/rooms", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: room.id, status: nextStatus }),
    });
    fetchRooms();
  }

  async function handleDeleteRoom(id: string) {
    if (!confirm("Delete this room? This cannot be undone.")) return;
    await fetch(`/api/rooms/${id}`, { method: "DELETE" });
    fetchRooms();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Room Management"
        description={`${rooms.length} rooms across the property`}
        actions={
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Room
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search rooms…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px]">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>{filterType === "ALL" ? "All Types" : filterType}</span>
          </SelectTrigger>
          <SelectContent>
            <option value="ALL">All Types</option>
            <option value="STUDIO">Studio</option>
            <option value="PREMIUM">Premium</option>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]">
            <span>{filterStatus === "ALL" ? "All Status" : filterStatus}</span>
          </SelectTrigger>
          <SelectContent>
            <option value="ALL">All Status</option>
            <option value="VACANT">Vacant</option>
            <option value="OCCUPIED">Occupied</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="BLOCKED">Blocked</option>
          </SelectContent>
        </Select>
      </div>

      {/* Room Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BedDouble className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No rooms found matching your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((room) => (
            <Card key={room.id} className="overflow-hidden hover:shadow-md transition-shadow">
              {/* Room thumbnail — sourced from room type profile */}
              <div className="relative h-36 bg-muted">
                {room.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={room.thumbnail} alt={room.roomNumber} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <StatusBadge status={room.status} type="room" />
                </div>
                <Badge variant="secondary" className="absolute top-2 left-2 font-semibold">
                  {room.type}
                </Badge>
              </div>

              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-bold text-lg">Room {room.roomNumber}</h3>
                  <span className="text-xs text-muted-foreground">Floor {room.floor}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {room.description || "No description"}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatCurrency(Number(room.basePriceSingle))}/night</span>
                  <span>·</span>
                  <span>Max {room.amenities.length} amenities</span>
                </div>
                <div className="flex items-center gap-1 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/rooms/${room.id}`)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant={room.status === "MAINTENANCE" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleToggleStatus(room)}
                    title={room.status === "MAINTENANCE" ? "Clear maintenance" : "Mark maintenance"}
                  >
                    <Wrench className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteRoom(room.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Room Modal */}
      {showAddModal && (
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <div className="space-y-4">
            <h2 className="font-heading text-xl font-bold">Add New Room</h2>
            <form onSubmit={handleAddRoom} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Room Number *</label>
                  <Input
                    required
                    value={form.roomNumber}
                    onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
                    placeholder="e.g. 101"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Type *</label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as "STUDIO" | "PREMIUM" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <option value="STUDIO">Studio</option>
                      <option value="PREMIUM">Premium</option>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Floor *</label>
                  <Input
                    type="number"
                    required
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
                    max="4"
                    value={form.maxOccupancy}
                    onChange={(e) => setForm({ ...form, maxOccupancy: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Base Price (Single)</label>
                  <Input
                    type="number"
                    min="0"
                    value={form.basePriceSingle}
                    onChange={(e) => setForm({ ...form, basePriceSingle: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Base Price (Double)</label>
                  <Input
                    type="number"
                    min="0"
                    value={form.basePriceDouble}
                    onChange={(e) => setForm({ ...form, basePriceDouble: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px]"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Room description…"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? "Adding…" : "Add Room"}
                </Button>
              </div>
            </form>
          </div>
        </Dialog>
      )}
    </div>
  );
}
